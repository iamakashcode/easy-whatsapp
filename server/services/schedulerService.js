const cron = require('node-cron');
const prisma = require('../prisma/client');
const {
  resolveParams,
  buildBodyComponents,
  fillBody,
  sendTemplateWithAutoLanguage,
} = require('./templateSend');
const { syncUserTemplates } = require('./templateMeta');
const { quote, getBillingState, creditHeadroom } = require('./billingService');
const { runMonthlyBilling, sweepOverdue } = require('./invoiceService');

const processBroadcasts = async () => {
  const now = new Date();
  const dueBroadcasts = await prisma.broadcast.findMany({
    where: { status: 'scheduled', scheduledAt: { lte: now } },
    include: {
      recipients: { include: { contact: true } },
      template: true,
      user: { include: { setting: true } },
    },
  });

  for (const broadcast of dueBroadcasts) {
    if (!broadcast.user.setting) continue;
    // Suspended accounts don't get their scheduled broadcasts processed.
    if (broadcast.user.status === 'SUSPENDED') {
      console.log(`Skipping broadcast ${broadcast.id} — user ${broadcast.userId} is suspended`);
      continue;
    }
    // An overdue invoice also pauses scheduled broadcasts.
    const state = await getBillingState(broadcast.userId);
    if (state.hasOverdue) {
      console.log(`Skipping broadcast ${broadcast.id} — user ${broadcast.userId} has an overdue invoice`);
      continue;
    }
    const { phoneNumberId, accessToken, businessAccountId } = broadcast.user.setting;
    const { template } = broadcast;
    // Resolve language from Meta at most once across all recipients of this broadcast.
    const templateState = { language: template.language };

    // Per-message price for this broadcast's template category, and a running credit headroom so we
    // stop sending the moment the customer would exceed their credit limit.
    const price = await quote(template.category);
    const categoryKey = template.category ? String(template.category).toLowerCase() : null;
    let headroom = creditHeadroom(state);
    let ranOut = false;

    const pendingRecipients = broadcast.recipients.filter(r => r.status === 'pending');
    for (const recipient of pendingRecipients) {
      if (price.charge > 0 && price.charge > headroom) {
        ranOut = true;
        break; // leave the rest 'pending' so they go out after the invoice is settled
      }
      try {
        const params = resolveParams(broadcast.templateParams, recipient.contact);
        const waMessageId = await sendTemplateWithAutoLanguage({
          setting: { phoneNumberId, accessToken, businessAccountId },
          userId: broadcast.userId,
          to: recipient.contact.phone,
          templateName: template.name,
          components: buildBodyComponents(params),
          state: templateState,
        });
        await prisma.broadcastRecipient.update({
          where: { id: recipient.id },
          data: { status: 'sent', sentAt: new Date() },
        });
        await prisma.message.create({
          data: {
            userId: broadcast.userId,
            contactId: recipient.contactId,
            direction: 'OUTBOUND',
            type: 'template',
            body: fillBody(template.body, template.variables, params) || template.body,
            status: 'sent',
            waMessageId,
            broadcastId: broadcast.id,
            sentAt: new Date(),
            category: categoryKey,
            billable: price.charge > 0 ? true : undefined,
            costAmount: price.charge > 0 ? price.charge : null,
            metaCost: price.charge > 0 ? price.meta : null,
          },
        });
        if (price.charge > 0) headroom -= price.charge;
      } catch (err) {
        console.error(`Failed to send to ${recipient.contact.phone}:`, err.message);
        await prisma.broadcastRecipient.update({
          where: { id: recipient.id },
          data: { status: 'failed', error: err.message?.slice(0, 300) || 'Send failed' },
        });
      }
      // Rate-limit guard: stay well under Meta's 80 msg/s limit
      await new Promise(r => setTimeout(r, 50));
    }

    // If the credit limit was hit, keep the broadcast 'scheduled' so the remaining recipients go out
    // on a later tick once the customer settles up; otherwise mark it done.
    if (ranOut) {
      console.log(`Broadcast ${broadcast.id} paused — user ${broadcast.userId} hit credit limit`);
    } else {
      await prisma.broadcast.update({
        where: { id: broadcast.id },
        data: { status: 'sent' },
      });
    }
  }
};

const processScheduledMessages = async () => {
  // Direct scheduled messages (stored as OUTBOUND with status 'scheduled' and future sentAt)
  // This is a hook point if you extend the schema with a scheduledAt on Message
};

// Keep local template approval status in sync with Meta for every configured user.
const syncAllTemplates = async () => {
  const settings = await prisma.setting.findMany({ select: { userId: true } });
  for (const { userId } of settings) {
    try {
      const changed = await syncUserTemplates(userId);
      if (changed.length) {
        console.log(`Template status synced for user ${userId}:`,
          changed.map((c) => `${c.name} → ${c.to}`).join(', '));
      }
    } catch (err) {
      console.error(`Template sync failed for user ${userId}:`, err.message);
    }
  }
};

const start = () => {
  cron.schedule('* * * * *', async () => {
    try {
      await processBroadcasts();
      await processScheduledMessages();
    } catch (err) {
      console.error('Scheduler error:', err.message);
    }
  });

  // Auto-sync template approval status from Meta every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      await syncAllTemplates();
    } catch (err) {
      console.error('Template sync error:', err.message);
    }
  });

  // Monthly billing — at 00:05 UTC on the 1st. Mode-aware: arrears closes the previous month, advance
  // issues the new month's plan fee (with the previous month's usage).
  cron.schedule('5 0 1 * *', async () => {
    try {
      const n = await runMonthlyBilling();
      console.log(`Billing: issued ${n} invoice(s) for this cycle`);
    } catch (err) {
      console.error('Billing close error:', err.message);
    }
  }, { timezone: 'UTC' });

  // Daily overdue sweep — flip issued invoices past their due date to OVERDUE (blocks sending).
  cron.schedule('0 1 * * *', async () => {
    try {
      const n = await sweepOverdue();
      if (n) console.log(`Billing: ${n} invoice(s) marked overdue`);
    } catch (err) {
      console.error('Overdue sweep error:', err.message);
    }
  }, { timezone: 'UTC' });

  // Boot catch-up: only within the first few days of the month, to cover the case where the server was
  // down on the 1st when the monthly run should have fired. Outside that window we do NOT auto-issue —
  // otherwise a normal mid-month restart would recreate invoices (incl. ones an admin deleted on
  // purpose). For any out-of-cycle invoice, use the per-client "Issue invoice now" action.
  (async () => {
    try {
      if (new Date().getUTCDate() <= 3) {
        const n = await runMonthlyBilling();
        if (n) console.log(`Billing: boot catch-up issued ${n} invoice(s)`);
      }
      await sweepOverdue();
    } catch (err) {
      console.error('Billing boot catch-up error:', err.message);
    }
  })();

  console.log('Scheduler started');
};

module.exports = { start };

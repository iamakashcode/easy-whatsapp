const crypto = require('crypto');
const prisma = require('../prisma/client');
const { describeFailure } = require('../services/whatsappErrors');
const pricingService = require('../services/pricingService');
const { getPlatformPricing } = require('../services/platformPricing');
const { normalizePhone } = require('../services/phone');

exports.verify = (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
};

exports.receive = (req, res) => {
  // Verify signature if META_APP_SECRET is configured
  if (process.env.META_APP_SECRET && req.rawBody) {
    const sig = req.headers['x-hub-signature-256'];
    const expected =
      'sha256=' +
      crypto
        .createHmac('sha256', process.env.META_APP_SECRET)
        .update(req.rawBody)
        .digest('hex');
    if (sig !== expected) return res.sendStatus(403);
  }

  // Respond immediately — Meta retries on non-2xx
  res.sendStatus(200);

  const body = req.body;
  console.log('Webhook received:', JSON.stringify(body).slice(0, 200));
  setImmediate(async () => {
    try {
      await processWebhook(body);
    } catch (err) {
      console.error('Webhook processing error:', err.message, err.stack);
    }
  });
};

// Normalize phone: always store with + prefix
async function processWebhook(body) {
  const entry = body?.entry?.[0]?.changes?.[0]?.value;
  console.log('Processing entry:', JSON.stringify(entry)?.slice(0, 200));
  if (!entry) return;

  // Handle incoming messages
  if (entry.messages?.length) {
    for (const msg of entry.messages) {
      const from = normalizePhone(msg.from);
      const text = msg.text?.body || msg.caption || '[media message]';
      const type = msg.type || 'text';

      // Find a user who owns this phone number
      const setting = await prisma.setting.findFirst({
        where: { phoneNumberId: entry.metadata?.phone_number_id },
      });
      console.log('Looking for phoneNumberId:', entry.metadata?.phone_number_id, '→ setting found:', !!setting);
      if (!setting) continue;

      // Find or create contact — match with or without + prefix
      const digits = from.replace(/\D/g, '');
      let contact = await prisma.contact.findFirst({
        where: {
          userId: setting.userId,
          OR: [{ phone: from }, { phone: '+' + digits }, { phone: digits }],
        },
      });
      if (!contact) {
        const profileName = entry.contacts?.[0]?.profile?.name || from;
        contact = await prisma.contact.create({
          data: { userId: setting.userId, name: profileName, phone: from, tags: [] },
        });
      }

      const saved = await prisma.message.create({
        data: {
          userId: setting.userId,
          contactId: contact.id,
          direction: 'INBOUND',
          type,
          body: text,
          status: 'delivered',
          waMessageId: msg.id || null,
          sentAt: msg.timestamp ? new Date(parseInt(msg.timestamp) * 1000) : new Date(),
        },
      });
      console.log('Message saved:', saved.id, '| from:', from, '| body:', text);
    }
  }

  // Handle status updates
  if (entry.statuses?.length) {
    console.log('Status updates received:', entry.statuses.length);
    for (const statusUpdate of entry.statuses) {
      const status = statusUpdate.status;
      const recipientPhone = normalizePhone(statusUpdate.recipient_id);
      console.log('Status update:', status, '| recipient:', recipientPhone, '| wamid:', statusUpdate.id);

      const validStatuses = ['sent', 'delivered', 'read', 'failed'];
      if (!validStatuses.includes(status)) {
        console.log('Skipping unknown status:', status);
        continue;
      }

      const setting = await prisma.setting.findFirst({
        where: { phoneNumberId: entry.metadata?.phone_number_id },
      });
      console.log('Status: setting found:', !!setting);
      if (!setting) continue;

      // Capture Meta's failure reason as a friendly explanation so the UI can tell
      // apart platform limits (e.g. the marketing "ecosystem" cap) from real problems.
      const errReason = status === 'failed'
        ? describeFailure(statusUpdate.errors?.[0])
        : null;
      if (errReason) console.log('Failure reason:', '[code', statusUpdate.errors?.[0]?.code + ']', errReason);

      // Match the exact message by its WhatsApp id (wamid). This is the only reliable
      // way to update a single message — matching by contact would clobber unrelated ones.
      const existing = statusUpdate.id
        ? await prisma.message.findFirst({
            where: { userId: setting.userId, waMessageId: statusUpdate.id },
          })
        : null;

      if (!existing) {
        console.log('Status: no message found for wamid', statusUpdate.id, '— skipping');
        continue;
      }

      // Cost capture — Meta sends the category + billable flag (never a price) in `pricing`, usually
      // on the first ('sent') status. We snapshot the cost from the user's current rate card so later
      // rate edits don't rewrite history. Only fields that are present are written, and we never
      // overwrite a cost already captured — so a later pricing-less delivered/read can't erase it.
      const pricing = statusUpdate.pricing;
      const conversation = statusUpdate.conversation;
      const costFields = {};
      if (pricing) {
        costFields.category = pricing.category ?? undefined;
        costFields.billable = pricing.billable ?? undefined;
      }
      if (conversation) {
        costFields.conversationId = conversation.id ?? undefined;
        costFields.conversationOrigin = conversation.origin?.type ?? undefined;
      }
      if (pricing && existing.costAmount == null) {
        const rates = await getPlatformPricing();
        costFields.costAmount = pricingService.computeCost({
          rates,
          category: pricing.category,
          billable: pricing.billable,
        });
        costFields.metaCost = pricingService.computeMetaCost({
          rates,
          category: pricing.category,
          billable: pricing.billable,
        });
        console.log('Cost captured: message', existing.id, '| category:', pricing.category,
          '| billable:', pricing.billable, '| cost:', costFields.costAmount);
      }

      // Don't downgrade status (e.g. a late "delivered" must not overwrite "read"). Even when the
      // status would be a downgrade, still persist any newly-seen cost/pricing data before skipping.
      const rank = { sent: 1, delivered: 2, read: 3, failed: 3 };
      if ((rank[status] || 0) < (rank[existing.status] || 0)) {
        if (Object.keys(costFields).length) {
          await prisma.message.update({ where: { id: existing.id }, data: costFields });
        }
        console.log('Status: ignoring downgrade', existing.status, '→', status);
        continue;
      }

      await prisma.message.update({
        where: { id: existing.id },
        data: { status, error: errReason, ...costFields },
      });
      console.log('Status updated: message', existing.id, '→', status);
    }
  }
}

// Invoice lifecycle — monthly cycle close, overdue sweep, and marking paid. Cycles are UTC calendar
// months to match Meta's WhatsApp billing.
const prisma = require('../prisma/client');
const { getPlatformPricing } = require('./platformPricing');

const DUE_DAYS = 7; // days after issue an invoice is due

const getBillingMode = async () => {
  const p = await getPlatformPricing();
  return p.billingMode === 'ADVANCE' ? 'ADVANCE' : 'ARREARS';
};

// UTC calendar-month bounds containing `date`: [start, end) where end is the next month's start.
const monthBoundsUTC = (date = new Date()) => {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  return { start, end };
};

// Bounds of the month before the one containing `date`.
const prevMonthBoundsUTC = (date = new Date()) =>
  monthBoundsUTC(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1)));

const num = (v) => Number(v ?? 0);

// Issue one invoice per customer for a billing cycle. The FEE covers the [feeStart, feeEnd) month
// (this is the invoice's period); USAGE is summed over a possibly-different [usageStart, usageEnd)
// month. In arrears they're the same month; in advance the fee is the current month and the usage is
// the previous month. Idempotent via @@unique([userId, periodStart]). `onlyUserId` bills one client.
const issueInvoices = async ({ feeStart, feeEnd, usageStart, usageEnd, onlyUserId } = {}) => {
  const customers = await prisma.user.findMany({
    where: { role: 'CUSTOMER', ...(onlyUserId ? { id: onlyUserId } : {}) },
    select: { id: true, monthlyFee: true, createdAt: true, billingStartsAt: true },
  });

  // Per-user usage over the usage window.
  const usage = await prisma.message.groupBy({
    by: ['userId'],
    where: {
      direction: 'OUTBOUND', costAmount: { not: null },
      createdAt: { gte: usageStart, lt: usageEnd },
      ...(onlyUserId ? { userId: onlyUserId } : {}),
    },
    _sum: { costAmount: true, metaCost: true },
    _count: { id: true },
  });
  const usageMap = Object.fromEntries(usage.map((u) => [u.userId, u]));

  const issuedAt = new Date();
  const dueDate = new Date(issuedAt.getTime() + DUE_DAYS * 24 * 60 * 60 * 1000);
  let created = 0;

  for (const c of customers) {
    // Never bill a fee month that ends before the client existed.
    if (c.createdAt >= feeEnd) continue;

    // The fixed monthly fee starts at the admin-set month (default = joining month). `billingStartsAt`
    // only waives the FEE for earlier months — real per-message usage is always billed.
    const joinStart = monthBoundsUTC(c.createdAt).start;
    let feeFrom = c.billingStartsAt ? monthBoundsUTC(c.billingStartsAt).start : joinStart;
    if (feeFrom < joinStart) feeFrom = joinStart;

    const u = usageMap[c.id];
    const usageAmount = num(u?._sum.costAmount);                    // always billed (per-message cost)
    const planFee = feeStart >= feeFrom ? num(c.monthlyFee) : 0;    // fee only once billing has started
    if (usageAmount === 0 && planFee === 0) continue; // nothing to bill

    try {
      await prisma.invoice.create({
        data: {
          userId: c.id,
          periodStart: feeStart,
          periodEnd: feeEnd,
          status: 'ISSUED',
          planFee,
          usageAmount,
          metaCost: num(u?._sum.metaCost),
          total: planFee + usageAmount,
          messageCount: u?._count.id || 0,
          issuedAt,
          dueDate,
        },
      });
      created++;
    } catch (err) {
      // Unique violation = already invoiced for this cycle; ignore.
      if (err.code !== 'P2002') throw err;
    }
  }
  return created;
};

// Compute the fee/usage windows for "now" given the billing mode.
//  - ADVANCE: fee = current month (paid up front), usage = previous month (arrears).
//  - ARREARS: fee + usage = previous (completed) month.
const windowsFor = (mode, date = new Date()) => {
  const prev = prevMonthBoundsUTC(date);
  const curr = monthBoundsUTC(date);
  return mode === 'ADVANCE'
    ? { feeStart: curr.start, feeEnd: curr.end, usageStart: prev.start, usageEnd: prev.end }
    : { feeStart: prev.start, feeEnd: prev.end, usageStart: prev.start, usageEnd: prev.end };
};

// Run the regular monthly billing (cron / boot catch-up) according to the platform billing mode.
const runMonthlyBilling = async () => {
  const mode = await getBillingMode();
  return issueInvoices(windowsFor(mode));
};

// Issue the current cycle's invoice for ONE client on demand (e.g. collect the first advance fee at
// onboarding, before they start using the platform). Idempotent.
const issueClientNow = async (userId) => {
  const mode = await getBillingMode();
  return issueInvoices({ ...windowsFor(mode), onlyUserId: userId });
};

// Flip issued invoices whose due date has passed to OVERDUE (which blocks sending).
const sweepOverdue = async () => {
  const res = await prisma.invoice.updateMany({
    where: { status: 'ISSUED', dueDate: { lt: new Date() } },
    data: { status: 'OVERDUE' },
  });
  return res.count;
};

const markPaid = async (invoiceId) => {
  const inv = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!inv) throw Object.assign(new Error('Invoice not found'), { status: 404 });
  return prisma.invoice.update({ where: { id: invoiceId }, data: { status: 'PAID', paidAt: new Date() } });
};

module.exports = {
  monthBoundsUTC,
  prevMonthBoundsUTC,
  getBillingMode,
  issueInvoices,
  runMonthlyBilling,
  issueClientNow,
  sweepOverdue,
  markPaid,
};

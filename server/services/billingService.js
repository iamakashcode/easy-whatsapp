// Postpaid billing — customers send freely and accrue usage; sending is blocked only when a credit
// limit is exceeded or an issued invoice is unpaid past its due date. No prepaid balance.
const prisma = require('../prisma/client');
const { getPlatformPricing } = require('./platformPricing');
const { computeCost, computeMetaCost } = require('./pricingService');
const { monthBoundsUTC } = require('./invoiceService');

// Thrown when a send must be blocked. Carries an HTTP status so controllers can surface it cleanly.
class BillingError extends Error {
  constructor(message, status = 402) {
    super(message);
    this.status = status;
    this.name = 'BillingError';
  }
}

// What a single message of this category costs the customer (and Meta's portion), from the live card.
// When usage billing is switched off platform-wide, every message is free (clients pay only the
// monthly fee and are billed by Meta directly).
const quote = async (category) => {
  const rates = await getPlatformPricing();
  if (!rates.usageBillingEnabled) return { charge: 0, meta: 0 };
  return {
    charge: computeCost({ rates, category, billable: true }),
    meta: computeMetaCost({ rates, category, billable: true }),
  };
};

const num = (v) => Number(v ?? 0);

// Snapshot of a customer's billing exposure right now: this month's accrued usage, the plan fee,
// unpaid issued/overdue invoices, and whether any invoice is overdue.
const getBillingState = async (userId) => {
  const { start, end } = monthBoundsUTC(new Date());
  const [user, usageAgg, unpaidAgg, overdueCount, currentMonthInvoice] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { status: true, monthlyFee: true, creditLimit: true, createdAt: true, billingStartsAt: true },
    }),
    prisma.message.aggregate({
      _sum: { costAmount: true },
      where: { userId, direction: 'OUTBOUND', costAmount: { not: null }, createdAt: { gte: start, lt: end } },
    }),
    prisma.invoice.aggregate({
      _sum: { total: true },
      where: { userId, status: { in: ['ISSUED', 'OVERDUE'] } },
    }),
    prisma.invoice.count({ where: { userId, status: 'OVERDUE' } }),
    // Does an invoice already exist for the current month? (advance mode bills the fee up front)
    prisma.invoice.findFirst({ where: { userId, periodStart: start }, select: { id: true } }),
  ]);

  const monthlyFee = num(user?.monthlyFee);
  const currentUsage = num(usageAgg._sum.costAmount);
  const unpaidInvoices = num(unpaidAgg._sum.total);

  // Has this client's fixed fee started, and is the current month already invoiced?
  let billingStarted = false;
  if (user) {
    const joinStart = monthBoundsUTC(user.createdAt).start;
    let feeFrom = user.billingStartsAt ? monthBoundsUTC(user.billingStartsAt).start : joinStart;
    if (feeFrom < joinStart) feeFrom = joinStart;
    billingStarted = start >= feeFrom;
  }
  // Only count the monthly fee as "pending" when it hasn't been invoiced yet. Once an invoice exists
  // for this month (advance mode), the fee is already inside `unpaidInvoices` — adding it again would
  // double-count it. Also skip it before the client's billing has started.
  const pendingFee = currentMonthInvoice || !billingStarted ? 0 : monthlyFee;

  return {
    status: user?.status,
    creditLimit: user?.creditLimit != null ? num(user.creditLimit) : null,
    monthlyFee,
    currentUsage,
    unpaidInvoices,
    hasOverdue: overdueCount > 0,
    // Unpaid invoices + this cycle's not-yet-invoiced accrual (usage always; fee only if not billed yet).
    outstanding: unpaidInvoices + currentUsage + pendingFee,
  };
};

// Remaining credit before sending is blocked. Infinite when no limit is set.
const creditHeadroom = (state) =>
  state.creditLimit == null ? Infinity : state.creditLimit - state.outstanding;

// Guard a send against suspension, overdue invoices, and the credit limit. Throws BillingError.
const assertCanSend = (state, nextCharge = 0) => {
  if (!state || !state.status) throw new BillingError('Account not found', 404);
  if (state.status === 'SUSPENDED') {
    throw new BillingError('Your account is suspended. Contact the platform admin.', 403);
  }
  if (state.hasOverdue) {
    throw new BillingError('You have an unpaid invoice past its due date. Settle it to resume sending.', 403);
  }
  if (state.creditLimit != null && state.outstanding + nextCharge > state.creditLimit) {
    throw new BillingError('Credit limit reached. Please clear your outstanding balance to keep sending.', 402);
  }
};

module.exports = { BillingError, quote, getBillingState, creditHeadroom, assertCanSend };

const prisma = require('../prisma/client');
const { getBillingState } = require('../services/billingService');
const { getPlatformPricing } = require('../services/platformPricing');

const num = (v) => Number(v ?? 0);

// The logged-in customer's billing: current-cycle usage, plan fee, credit/outstanding, and invoices.
exports.get = async (req, res, next) => {
  try {
    const [state, invoices, pricing] = await Promise.all([
      getBillingState(req.userId),
      prisma.invoice.findMany({ where: { userId: req.userId }, orderBy: { periodStart: 'desc' }, take: 24 }),
      getPlatformPricing(),
    ]);

    res.json({
      currency: 'INR',
      usageBilling: pricing.usageBillingEnabled,
      monthlyFee: state.monthlyFee,
      creditLimit: state.creditLimit,
      currentUsage: state.currentUsage,
      projectedTotal: state.currentUsage + state.monthlyFee,
      outstanding: state.outstanding,
      hasOverdue: state.hasOverdue,
      // True when the customer is currently blocked from sending.
      blocked: state.status === 'SUSPENDED' || state.hasOverdue ||
        (state.creditLimit != null && state.outstanding >= state.creditLimit),
      invoices: invoices.map((i) => ({
        ...i, planFee: num(i.planFee), usageAmount: num(i.usageAmount), total: num(i.total), metaCost: num(i.metaCost),
      })),
    });
  } catch (err) {
    next(err);
  }
};

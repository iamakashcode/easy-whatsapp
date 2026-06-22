const { getPlatformPricing, updatePlatformPricing } = require('../services/platformPricing');
const { DEFAULT_RATES_INR } = require('../services/pricingService');

const n = (v) => Number(v ?? 0);

// Expose meta cost, platform fee, and the resulting customer price per category. `rate*` (the price
// charged) is stored as meta + fee. Falls back to seeded India defaults for any category not yet set.
const serialize = (row) => {
  const meta = {
    marketing: n(row.metaMarketing),
    utility: n(row.metaUtility),
    authentication: n(row.metaAuthentication),
  };
  const rate = {
    marketing: n(row.rateMarketing) || DEFAULT_RATES_INR.marketing,
    utility: n(row.rateUtility) || DEFAULT_RATES_INR.utility,
    authentication: n(row.rateAuthentication) || DEFAULT_RATES_INR.authentication,
  };
  return {
    currency: row.currency || 'INR',
    // Master switch — when false, per-message usage is neither charged nor shown to clients.
    usageBillingEnabled: row.usageBillingEnabled,
    // ADVANCE = charge the plan fee up front; ARREARS = postpaid (bill at month end).
    billingMode: row.billingMode === 'ADVANCE' ? 'ADVANCE' : 'ARREARS',
    // Customer price (what gets charged / used for estimates).
    rateMarketing: rate.marketing,
    rateUtility: rate.utility,
    rateAuthentication: rate.authentication,
    // Meta's portion.
    metaMarketing: meta.marketing,
    metaUtility: meta.utility,
    metaAuthentication: meta.authentication,
    // Platform fee (margin) = price − meta.
    feeMarketing: Math.max(0, rate.marketing - meta.marketing),
    feeUtility: Math.max(0, rate.utility - meta.utility),
    feeAuthentication: Math.max(0, rate.authentication - meta.authentication),
  };
};

// Any authenticated user may read the rate card (to see what they're charged / estimate broadcasts).
exports.getPricing = async (req, res, next) => {
  try {
    const row = await getPlatformPricing();
    res.json(serialize(row));
  } catch (err) {
    next(err);
  }
};

// Admin-only. Admin sets the Meta cost and the platform fee per category; we store meta* and the
// derived rate* (= meta + fee) so customer charging is a single fast lookup.
exports.updatePricing = async (req, res, next) => {
  try {
    const b = req.body;
    const num = (v, label) => {
      const x = Number(v);
      if (!Number.isFinite(x) || x < 0) throw Object.assign(new Error(`Invalid value for ${label}`), { status: 400 });
      return x;
    };

    const data = {};
    const cats = [
      { key: 'Marketing', meta: 'metaMarketing', fee: 'feeMarketing', rate: 'rateMarketing' },
      { key: 'Utility', meta: 'metaUtility', fee: 'feeUtility', rate: 'rateUtility' },
      { key: 'Authentication', meta: 'metaAuthentication', fee: 'feeAuthentication', rate: 'rateAuthentication' },
    ];
    for (const c of cats) {
      if (b[c.meta] === undefined && b[c.fee] === undefined) continue;
      const meta = num(b[c.meta] ?? 0, c.meta);
      const fee = num(b[c.fee] ?? 0, c.fee);
      data[c.meta] = meta;
      data[c.rate] = meta + fee; // customer price
    }
    if (b.currency !== undefined) data.currency = String(b.currency).trim().toUpperCase() || 'INR';
    if (b.usageBillingEnabled !== undefined) data.usageBillingEnabled = !!b.usageBillingEnabled;
    if (b.billingMode !== undefined) data.billingMode = b.billingMode === 'ADVANCE' ? 'ADVANCE' : 'ARREARS';

    const row = await updatePlatformPricing(data);
    res.json(serialize(row));
  } catch (err) {
    next(err);
  }
};

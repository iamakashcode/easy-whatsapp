// Pricing helpers — turn a WhatsApp message category into a cost using the user's rate card.
//
// Meta's webhooks tell us the message *category* (marketing/utility/authentication/service) and a
// `billable` flag, but never the actual price. So we keep a per-user rate card (Setting.rate*) and
// compute a snapshot cost at webhook time. Rates are stored/edited directly in the display currency
// (INR); there is no FX conversion here. Service messages — and anything Meta marks non-billable —
// are free.

// Default India per-message rates (INR), used to seed the UI before the user customises them.
// These are approximate conversions of Meta's published India price list — confirm/adjust in Settings.
const DEFAULT_RATES_INR = {
  marketing: 0.7846,
  utility: 0.115,
  authentication: 0.1233,
  service: 0,
};

const roundMoney = (n, dp = 4) => {
  if (n == null || Number.isNaN(Number(n))) return 0;
  const f = 10 ** dp;
  return Math.round(Number(n) * f) / f;
};

// Map a Meta category string (any case) to the matching rate on the platform rate card. Returns a
// Number. Unknown categories return 0 and log a warning so new Meta buckets get noticed.
const rateForCategory = (rates, category) => {
  if (!category) return 0;
  const key = String(category).toLowerCase();
  switch (key) {
    case 'marketing':
      return Number(rates?.rateMarketing ?? 0);
    case 'utility':
      return Number(rates?.rateUtility ?? 0);
    case 'authentication':
    case 'authentication-international': // Meta sub-bucket → same rate column
      return Number(rates?.rateAuthentication ?? 0);
    case 'service':
    case 'referral_conversion':
      return Number(rates?.rateService ?? 0);
    default:
      console.warn('[pricing] unknown WhatsApp category, treating as free:', category);
      return 0;
  }
};

// Meta's portion of the rate for a category (admin cost) — for margin reporting.
const metaForCategory = (rates, category) => {
  if (!category) return 0;
  const key = String(category).toLowerCase();
  switch (key) {
    case 'marketing':
      return Number(rates?.metaMarketing ?? 0);
    case 'utility':
      return Number(rates?.metaUtility ?? 0);
    case 'authentication':
    case 'authentication-international':
      return Number(rates?.metaAuthentication ?? 0);
    default:
      return 0;
  }
};

// Price charged to the customer for a single message (meta + fee = rate*). Non-billable → 0.
const computeCost = ({ rates, category, billable }) => {
  if (billable === false) return 0;
  return roundMoney(rateForCategory(rates, category));
};

// Meta's snapshot cost for a single message. Non-billable → 0.
const computeMetaCost = ({ rates, category, billable }) => {
  if (billable === false) return 0;
  return roundMoney(metaForCategory(rates, category));
};

// Rates to show in the UI: saved values, falling back to the India defaults when a row is still
// 0/unset so the admin starts from a sensible card.
const ratesForDisplay = (rates) => ({
  rateMarketing: Number(rates?.rateMarketing) || DEFAULT_RATES_INR.marketing,
  rateUtility: Number(rates?.rateUtility) || DEFAULT_RATES_INR.utility,
  rateAuthentication: Number(rates?.rateAuthentication) || DEFAULT_RATES_INR.authentication,
  rateService: 0,
});

module.exports = {
  DEFAULT_RATES_INR,
  roundMoney,
  rateForCategory,
  metaForCategory,
  computeCost,
  computeMetaCost,
  ratesForDisplay,
};

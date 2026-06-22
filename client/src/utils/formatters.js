// Money formatting. Costs are stored and displayed in the user's currency (INR by default); there is
// no FX conversion anywhere in the app.
export const formatCurrency = (value, currency = 'INR') => {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
};

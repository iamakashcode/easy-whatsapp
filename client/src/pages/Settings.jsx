import { useEffect, useState } from 'react';
import { EyeIcon, EyeSlashIcon, CheckCircleIcon, BanknotesIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../api/axios';
import BusinessProfileCard from '../components/BusinessProfileCard';
import { useAuth } from '../hooks/useAuth';

export default function Settings() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [form, setForm] = useState({
    phoneNumberId:     '',
    accessToken:       '',
    businessAccountId: '',
  });
  const [hasExistingToken, setHasExistingToken] = useState(false);
  const [loading, setSaving]   = useState(false);
  const [fetching, setFetching] = useState(true);
  const [showToken, setShowToken] = useState(false);
  const [saved, setSaved]       = useState(false);

  // Customer's own monthly spend budget (per-user) — saved via PUT /settings/budget.
  const [budget, setBudget] = useState('');
  const [budgetSaving, setBudgetSaving] = useState(false);

  // Platform-wide rate card (admin-only) + currency. Read by everyone, editable by admin.
  const [pricing, setPricing] = useState({ rateMarketing: '', rateUtility: '', rateAuthentication: '', currency: 'INR' });
  const [pricingSaving, setPricingSaving] = useState(false);

  useEffect(() => {
    api.get('/settings')
      .then(({ data }) => {
        if (data) {
          const tokenSaved = data.accessToken === '••••••••';
          setHasExistingToken(tokenSaved);
          setForm({
            phoneNumberId:     data.phoneNumberId || '',
            accessToken:       '',   // never pre-fill the token field
            businessAccountId: data.businessAccountId || '',
          });
          setBudget(data.monthlyBudget ?? '');
        }
      })
      .catch(() => {})
      .finally(() => setFetching(false));

    api.get('/platform/pricing')
      .then(({ data }) => setPricing({
        rateMarketing:      data.rateMarketing ?? '',
        rateUtility:        data.rateUtility ?? '',
        rateAuthentication: data.rateAuthentication ?? '',
        currency:           data.currency || 'INR',
      }))
      .catch(() => {});
  }, []);

  const handleBudgetSubmit = async (e) => {
    e.preventDefault();
    setBudgetSaving(true);
    try {
      const { data } = await api.put('/settings/budget', { monthlyBudget: budget === '' ? null : Number(budget) });
      setBudget(data.monthlyBudget ?? '');
      toast.success('Budget saved');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save budget');
    } finally {
      setBudgetSaving(false);
    }
  };

  const handlePricingSubmit = async (e) => {
    e.preventDefault();
    setPricingSaving(true);
    try {
      const { data } = await api.put('/platform/pricing', {
        rateMarketing:      Number(pricing.rateMarketing) || 0,
        rateUtility:        Number(pricing.rateUtility) || 0,
        rateAuthentication: Number(pricing.rateAuthentication) || 0,
        currency:           pricing.currency || 'INR',
      });
      setPricing({
        rateMarketing:      data.rateMarketing ?? '',
        rateUtility:        data.rateUtility ?? '',
        rateAuthentication: data.rateAuthentication ?? '',
        currency:           data.currency || 'INR',
      });
      toast.success('Platform pricing saved');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save pricing');
    } finally {
      setPricingSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.accessToken && !hasExistingToken) {
      toast.error('Access Token is required');
      return;
    }
    setSaving(true);
    setSaved(false);
    try {
      const payload = { phoneNumberId: form.phoneNumberId, businessAccountId: form.businessAccountId };
      if (form.accessToken) payload.accessToken = form.accessToken; // only send if user typed a new one
      const { data } = await api.put('/settings', payload);
      if (data.verified?.verifiedName) {
        toast.success(`Verified ✓ ${data.verified.verifiedName} (${data.verified.displayPhoneNumber})`);
      } else {
        toast.success('Settings saved successfully');
      }
      setSaved(true);
      setHasExistingToken(true);
      setForm(f => ({ ...f, accessToken: '' })); // clear field after save
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-3 border-whatsapp-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Configure your WhatsApp Business API credentials</p>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div className="w-8 h-8 rounded-lg bg-whatsapp-green/10 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="#25D366" className="w-4 h-4">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
          </div>
          <h2 className="font-semibold">WhatsApp Cloud API</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Phone Number ID *
              <span className="text-xs text-gray-400 font-normal ml-2">from Meta Business Dashboard</span>
            </label>
            <input
              className="input font-mono"
              value={form.phoneNumberId}
              onChange={(e) => setForm((f) => ({ ...f, phoneNumberId: e.target.value }))}
              required
              placeholder="1234567890123456"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Access Token *
              <span className="text-xs text-gray-400 font-normal ml-2">permanent system user token</span>
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                className="input pr-10 font-mono text-xs"
                value={form.accessToken}
                onChange={(e) => setForm((f) => ({ ...f, accessToken: e.target.value }))}
                placeholder={hasExistingToken ? 'Leave blank to keep existing token' : 'EAAxxxxxxxxxxxxx...'}
              />
              <button
                type="button"
                onClick={() => setShowToken((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showToken ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
            </div>
            {hasExistingToken && !form.accessToken && (
              <p className="text-xs text-whatsapp-green mt-1 flex items-center gap-1">
                <CheckCircleIcon className="w-3 h-3" />
                Token saved — enter a new token only if you want to replace it
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Business Account ID *
              <span className="text-xs text-gray-400 font-normal ml-2">WhatsApp Business Account ID</span>
            </label>
            <input
              className="input font-mono"
              value={form.businessAccountId}
              onChange={(e) => setForm((f) => ({ ...f, businessAccountId: e.target.value }))}
              required
              placeholder="1234567890123456"
            />
          </div>

          <div className="pt-2">
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                  Saving…
                </span>
              ) : saved ? (
                <span className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4" /> Saved!
                </span>
              ) : (
                'Save Settings'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* WhatsApp Business profile shown to customers — only useful once credentials are saved */}
      {hasExistingToken && <BusinessProfileCard />}

      {/* Customer's own monthly spend budget — available to every user. */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <BanknotesIcon className="w-4 h-4 text-orange-500" />
          </div>
          <h2 className="font-semibold">Spend Budget</h2>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Set an optional monthly budget. You&apos;ll see an alert on the Costs page once you reach 80% of it.
          Per-message rates are set by the platform.
        </p>

        <form onSubmit={handleBudgetSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Monthly Budget ({pricing.currency})
              <span className="text-xs text-gray-400 font-normal ml-2">optional — alerts at 80%</span>
            </label>
            <input
              type="number" min="0" step="1"
              className="input"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="No budget set"
            />
          </div>
          <div className="pt-1">
            <button type="submit" disabled={budgetSaving} className="btn-primary w-full justify-center">
              {budgetSaving ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                  Saving…
                </span>
              ) : 'Save Budget'}
            </button>
          </div>
        </form>
      </div>

      {/* Platform rate card — ADMIN ONLY. Customers are charged these per-message rates. */}
      {isAdmin && (
        <div className="card p-6 border border-whatsapp-green/30">
          <div className="flex items-center gap-2 mb-5 pb-4 border-b border-gray-100 dark:border-gray-700">
            <div className="w-8 h-8 rounded-lg bg-whatsapp-green/10 flex items-center justify-center">
              <ShieldCheckIcon className="w-4 h-4 text-whatsapp-green" />
            </div>
            <h2 className="font-semibold">Platform Pricing</h2>
            <span className="badge bg-whatsapp-green/10 text-whatsapp-teal dark:text-whatsapp-green ml-auto">Admin</span>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Per-message rates (in {pricing.currency}) charged to all customers, by category. WhatsApp reports the
            category but not the price — these rates drive every customer&apos;s cost estimate. Pre-filled with
            India&apos;s published rates.
          </p>

          <form onSubmit={handlePricingSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { key: 'rateMarketing',      label: 'Marketing' },
                { key: 'rateUtility',        label: 'Utility' },
                { key: 'rateAuthentication', label: 'Authentication' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-sm font-medium mb-1">{label}</label>
                  <input
                    type="number" min="0" step="0.0001"
                    className="input"
                    value={pricing[key]}
                    onChange={(e) => setPricing((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-400">Service messages are free and not charged.</p>

            <div>
              <label className="block text-sm font-medium mb-1">Currency</label>
              <input
                className="input sm:w-1/2"
                value={pricing.currency}
                onChange={(e) => setPricing((p) => ({ ...p, currency: e.target.value.toUpperCase() }))}
                placeholder="INR"
              />
            </div>

            <div className="pt-1">
              <button type="submit" disabled={pricingSaving} className="btn-primary w-full justify-center">
                {pricingSaving ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                    Saving…
                  </span>
                ) : 'Save Platform Pricing'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card p-5 border-l-4 border-blue-500">
        <h3 className="font-medium text-sm mb-2">Webhook Configuration</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          To receive incoming messages, configure your webhook in the Meta Developer Console:
        </p>
        <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1 list-disc list-inside">
          <li>Callback URL: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">https://your-domain.com/api/webhook</code></li>
          <li>Verify Token: set <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">WEBHOOK_VERIFY_TOKEN</code> in your .env</li>
          <li>Subscribe to: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">messages</code></li>
        </ul>
      </div>
    </div>
  );
}

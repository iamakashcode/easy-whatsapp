import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { formatCurrency } from '../../utils/formatters';

const CATS = [
  { key: 'Marketing', meta: 'metaMarketing', fee: 'feeMarketing' },
  { key: 'Utility', meta: 'metaUtility', fee: 'feeUtility' },
  { key: 'Authentication', meta: 'metaAuthentication', fee: 'feeAuthentication' },
];

export default function AdminPricing() {
  const [form, setForm] = useState({
    metaMarketing: '', feeMarketing: '',
    metaUtility: '', feeUtility: '',
    metaAuthentication: '', feeAuthentication: '',
    currency: 'INR',
    usageBillingEnabled: true,
    billingMode: 'ADVANCE',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/platform/pricing')
      .then(({ data }) => setForm({
        metaMarketing: data.metaMarketing ?? '', feeMarketing: data.feeMarketing ?? '',
        metaUtility: data.metaUtility ?? '', feeUtility: data.feeUtility ?? '',
        metaAuthentication: data.metaAuthentication ?? '', feeAuthentication: data.feeAuthentication ?? '',
        currency: data.currency || 'INR',
        usageBillingEnabled: data.usageBillingEnabled !== false,
        billingMode: data.billingMode === 'ADVANCE' ? 'ADVANCE' : 'ARREARS',
      }))
      .catch(() => {});
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const price = (c) => (Number(form[c.meta]) || 0) + (Number(form[c.fee]) || 0);
  const usageOn = form.usageBillingEnabled;

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { currency: form.currency, usageBillingEnabled: form.usageBillingEnabled, billingMode: form.billingMode };
      CATS.forEach((c) => { payload[c.meta] = Number(form[c.meta]) || 0; payload[c.fee] = Number(form[c.fee]) || 0; });
      const { data } = await api.put('/platform/pricing', payload);
      setForm((f) => ({
        ...f,
        feeMarketing: data.feeMarketing, feeUtility: data.feeUtility, feeAuthentication: data.feeAuthentication,
      }));
      toast.success('Platform pricing saved');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Platform Pricing</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Turn per-message billing on or off, and set the Meta cost + your fee per category when it&apos;s on.
        </p>
      </div>

      <form onSubmit={submit} className="card p-6 space-y-5">
        {/* Billing mode: postpaid (arrears) vs advance */}
        <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
          <p className="font-medium text-sm text-slate-800 dark:text-slate-100 mb-2">Billing mode</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { value: 'ADVANCE', title: 'Prepaid (advance)', desc: 'Charge the monthly fee up front. First payment = fee only; later invoices add the previous month’s usage.' },
              { value: 'ARREARS', title: 'Postpaid', desc: 'Bill at month-end for the month used. Invoice on the 1st of next month.' },
            ].map((m) => {
              const active = form.billingMode === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => set('billingMode', m.value)}
                  className={`text-left rounded-xl border p-3 transition-colors ${
                    active
                      ? 'border-whatsapp-green bg-whatsapp-green/5'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${active ? 'border-whatsapp-green bg-whatsapp-green' : 'border-slate-300 dark:border-slate-600'}`} />
                    <span className="font-medium text-sm text-slate-800 dark:text-slate-100">{m.title}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 ml-6">{m.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Master switch for per-message usage billing */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <p className="font-medium text-sm text-slate-800 dark:text-slate-100">Charge clients per message</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {usageOn
                ? 'On — clients pay the rates below for every message, on top of their monthly fee.'
                : 'Off — clients pay only their monthly fee; messages aren’t priced or shown (Meta bills them directly).'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={usageOn}
            onClick={() => set('usageBillingEnabled', !usageOn)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors ${usageOn ? 'bg-whatsapp-green' : 'bg-slate-300 dark:bg-slate-600'}`}
          >
            <span className={`inline-block h-5 w-5 mt-0.5 rounded-full bg-white shadow transform transition-transform ${usageOn ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>

        <div className={usageOn ? '' : 'opacity-50 pointer-events-none'}>
          <div className="hidden sm:grid grid-cols-4 gap-3 text-xs font-medium text-slate-400 px-1 mb-3">
            <span>Category</span><span>Meta cost ({form.currency})</span><span>Your fee ({form.currency})</span><span className="text-right">Customer pays</span>
          </div>
          <div className="space-y-5">
            {CATS.map((c) => (
              <div key={c.key} className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-center">
                <label className="font-medium text-sm text-slate-700 dark:text-slate-200 col-span-2 sm:col-span-1">{c.key}</label>
                <input type="number" min="0" step="0.0001" className="input" placeholder="Meta cost" disabled={!usageOn}
                  value={form[c.meta]} onChange={(e) => set(c.meta, e.target.value)} />
                <input type="number" min="0" step="0.0001" className="input" placeholder="Your fee" disabled={!usageOn}
                  value={form[c.fee]} onChange={(e) => set(c.fee, e.target.value)} />
                <div className="text-right font-semibold text-whatsapp-teal dark:text-whatsapp-green col-span-2 sm:col-span-1">
                  {formatCurrency(price(c), form.currency)}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3">Service messages are always free.</p>
        </div>

        <div className="flex items-end gap-3">
          <div className="w-40">
            <label className="block text-sm font-medium mb-1">Currency</label>
            <input className="input" value={form.currency} onChange={(e) => set('currency', e.target.value.toUpperCase())} />
          </div>
          <button type="submit" disabled={saving} className="btn-primary ml-auto">
            {saving ? 'Saving…' : 'Save Pricing'}
          </button>
        </div>
      </form>
    </div>
  );
}

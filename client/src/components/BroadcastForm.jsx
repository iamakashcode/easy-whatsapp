import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import api from '../api/axios';
import DynamicValueFields, { paramsFilled } from './DynamicValueFields';
import { formatCurrency } from '../utils/formatters';

export default function BroadcastForm({ onSave, onClose }) {
  const [templates, setTemplates] = useState([]);
  const [contacts,  setContacts]  = useState([]);
  const [settings,  setSettings]  = useState(null);
  const [form, setForm] = useState({
    templateId: '',
    contactIds: [],
    tagFilter: '',
    scheduledAt: '',
  });
  const [params, setParams]   = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Only approved templates can be broadcast
    api.get('/templates').then((r) => setTemplates(r.data.filter((t) => t.status === 'APPROVED'))).catch(() => {});
    api.get('/contacts', { params: { limit: 200 } }).then((r) => setContacts(r.data.data)).catch(() => {});
    api.get('/platform/pricing').then((r) => setSettings(r.data)).catch(() => {});
  }, []);

  const templateObj  = form.templateId ? templates.find((t) => t.id === parseInt(form.templateId)) : null;
  const templateVars = templateObj?.variables || [];

  // Pre-send cost estimate — mirrors the server's recipient union (selected ids + exact tag match),
  // priced by the template's category from the rate card. Service/unknown categories are free.
  const rateFor = (category) => {
    if (!settings || !category || settings.usageBillingEnabled === false) return 0;
    switch (String(category).toLowerCase()) {
      case 'marketing':      return Number(settings.rateMarketing) || 0;
      case 'utility':        return Number(settings.rateUtility) || 0;
      case 'authentication': return Number(settings.rateAuthentication) || 0;
      default:               return 0;
    }
  };
  const recipientCount = new Set([
    ...form.contactIds,
    ...(form.tagFilter ? contacts.filter((c) => c.tags?.includes(form.tagFilter)).map((c) => c.id) : []),
  ]).size;
  const estRate = rateFor(templateObj?.category);
  const estimatedCost = estRate * recipientCount;
  const currency = settings?.currency || 'INR';

  const toggleContact = (id) => {
    setForm((f) => ({
      ...f,
      contactIds: f.contactIds.includes(id)
        ? f.contactIds.filter((c) => c !== id)
        : [...f.contactIds, id],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (templateVars.length && !paramsFilled(params, templateVars.length)) return;
    setLoading(true);
    try {
      await onSave({
        templateId: parseInt(form.templateId),
        contactIds: form.contactIds,
        tagFilter: form.tagFilter || undefined,
        scheduledAt: form.scheduledAt || undefined,
        templateParams: templateVars.length ? params : undefined,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
      <div className="card w-full max-w-lg p-6 my-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">New Broadcast</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Template *</label>
            <select
              className="input"
              value={form.templateId}
              onChange={(e) => setForm((f) => ({ ...f, templateId: e.target.value }))}
              required
            >
              <option value="">Select a template</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {templates.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">
                No approved templates yet — create and get one approved in Templates first.
              </p>
            )}
            <DynamicValueFields
              key={form.templateId}
              variables={templateVars}
              value={params}
              onChange={setParams}
              bulk
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Filter by Tag</label>
            <input
              className="input"
              value={form.tagFilter}
              onChange={(e) => setForm((f) => ({ ...f, tagFilter: e.target.value }))}
              placeholder="e.g. vip — leave empty to select manually"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Select Contacts ({form.contactIds.length} selected)
            </label>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-48 overflow-y-auto">
              {contacts.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={form.contactIds.includes(c.id)}
                    onChange={() => toggleContact(c.id)}
                    className="accent-whatsapp-green"
                  />
                  <span className="text-sm">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-gray-400 ml-2 text-xs">{c.phone}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Pre-send cost estimate (hidden when per-message billing is off) */}
          {templateObj && recipientCount > 0 && settings?.usageBillingEnabled !== false && (
            <div className="flex items-center justify-between rounded-xl bg-orange-500/10 px-4 py-3 text-sm">
              <span className="text-slate-600 dark:text-slate-300">
                Estimated cost
                <span className="text-xs text-gray-400 ml-2">{recipientCount} × {templateObj.category || 'message'}</span>
              </span>
              <span className="font-semibold text-orange-600 dark:text-orange-400">
                {estRate > 0 ? formatCurrency(estimatedCost, currency) : 'Free / not billable'}
              </span>
            </div>
          )}
          {templateObj && recipientCount > 0 && estRate > 0 && (
            <p className="text-xs text-gray-400 -mt-2">
              Estimate based on your rate card; service messages are free. Set rates in Settings → Pricing.
            </p>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Schedule (optional)</label>
            <input
              type="datetime-local"
              className="input"
              value={form.scheduledAt}
              onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
            />
            <p className="text-xs text-gray-400 mt-1">Leave empty to save as draft</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Creating…' : form.scheduledAt ? 'Schedule Broadcast' : 'Save Draft'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

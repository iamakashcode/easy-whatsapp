import { useEffect, useRef, useState, useMemo } from 'react';
import { PlusIcon, XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { usePolling } from '../hooks/usePolling';
import TemplateCard    from '../components/TemplateCard';
import QuickSendModal  from '../components/QuickSendModal';
import MetaSyncModal   from '../components/MetaSyncModal';

const META_CATEGORIES = [
  ['UTILITY',   'Utility — order/account updates, confirmations, reminders'],
  ['MARKETING', 'Marketing — offers, promotions, re-engagement'],
];

const normalizeName = (s) =>
  String(s || '').toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');

// ── Template form modal ──────────────────────────────────────────────────────
function TemplateForm({ template, onSave, onClose }) {
  const [form, setForm] = useState({
    name:     template?.name     || '',
    header:   template?.header   || '',
    body:     template?.body     || '',
    footer:   template?.footer   || '',
    category: (template?.category || 'UTILITY').toUpperCase(),
    language: template?.language || 'en_US',
  });
  // Sample values per variable (also used as Meta's required examples)
  const [samples, setSamples] = useState(() => {
    const init = {};
    const vars = [...new Set((template?.body?.match(/\{\{(\w+)\}\}/g) || []).map((m) => m.replace(/\{\{|\}\}/g, '')))];
    vars.forEach((v, i) => { if (template?.examples?.[i]) init[v] = template.examples[i]; });
    return init;
  });
  const [saving, setSaving] = useState(false);

  const variables = useMemo(
    () => [...new Set((form.body.match(/\{\{(\w+)\}\}/g) || []).map((m) => m.replace(/\{\{|\}\}/g, '')))],
    [form.body]
  );

  const resolvedPreview = form.body.replace(/\{\{(\w+)\}\}/g, (_, k) => samples[k] || `{{${k}}}`);
  const metaName = normalizeName(form.name);

  const submit = async (draft) => {
    if (!metaName || !form.body.trim()) { toast.error('Name and body are required'); return; }
    if (!draft && variables.some((v) => !(samples[v] || '').trim())) {
      toast.error('Provide a sample value for each variable (required for approval)');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        name:     metaName,
        header:   form.header.trim() || undefined,
        body:     form.body,
        footer:   form.footer.trim() || undefined,
        category: form.category,
        language: form.language,
        examples: variables.map((v) => samples[v] || ''),
      }, !draft);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="card w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">{template ? 'Edit Template' : 'New Template'}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); submit(false); }} className="space-y-4">
          {/* Name + Category + Language row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Template Name *</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                placeholder="e.g. welcome_message"
              />
              {metaName && (
                <p className="text-xs text-gray-400 mt-1">Submitted as <span className="font-mono">{metaName}</span></p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                className="input"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                title={META_CATEGORIES.find(([v]) => v === form.category)?.[1]}
              >
                {META_CATEGORIES.map(([v]) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Language</label>
              <input
                className="input"
                list="wa-language-codes"
                value={form.language}
                onChange={(e) => setForm((f) => ({ ...f, language: e.target.value.trim() }))}
                placeholder="en_US"
              />
              <datalist id="wa-language-codes">
                {['en_US', 'en_GB', 'en', 'hi', 'es', 'es_ES', 'pt_BR', 'fr', 'de', 'ar', 'id', 'ru'].map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>
          <p className="-mt-2 text-xs text-gray-400">
            Meta decides the final category at approval. {META_CATEGORIES.find(([v]) => v === form.category)?.[1]}
          </p>

          {/* Header (optional) */}
          <div>
            <label className="block text-sm font-medium mb-1">Header <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              className="input"
              maxLength={60}
              value={form.header}
              onChange={(e) => setForm((f) => ({ ...f, header: e.target.value }))}
              placeholder="e.g. Special Offer 🎉"
            />
          </div>

          {/* Body */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium">Message Body *</label>
              <span className={`text-xs ${form.body.length > 900 ? 'text-red-500' : 'text-gray-400'}`}>
                {form.body.length} / 1024
              </span>
            </div>
            <textarea
              className="input resize-none"
              rows={5}
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              required
              maxLength={1024}
              placeholder={'Hello {{1}},\n\nThank you for contacting us!'}
            />
            <p className="mt-1 text-xs text-gray-400">Use {'{{1}}'}, {'{{2}}'} … for dynamic values (numbered placeholders).</p>
          </div>

          {/* Footer (optional) */}
          <div>
            <label className="block text-sm font-medium mb-1">Footer <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              className="input"
              maxLength={60}
              value={form.footer}
              onChange={(e) => setForm((f) => ({ ...f, footer: e.target.value }))}
              placeholder="e.g. Team Desire Div"
            />
          </div>

          {/* Live preview + required sample values */}
          {form.body && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 text-xs font-medium text-gray-500 border-b border-gray-200 dark:border-gray-700">
                Live Preview {variables.length > 0 && '· sample values are required for approval'}
              </div>
              <div className="px-4 py-3 space-y-3">
                {variables.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {variables.map((v) => (
                      <input
                        key={v}
                        className="input text-xs"
                        placeholder={`Sample for {{${v}}}`}
                        value={samples[v] || ''}
                        onChange={(e) => setSamples((s) => ({ ...s, [v]: e.target.value }))}
                      />
                    ))}
                  </div>
                )}
                <div className="bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-sm space-y-1">
                  {form.header && <p className="font-semibold">{form.header}</p>}
                  <p className="whitespace-pre-wrap">
                    {resolvedPreview.split(/(\{\{[^}]+\}\})/g).map((part, i) =>
                      /^\{\{[^}]+\}\}$/.test(part)
                        ? <span key={i} className="bg-yellow-200 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 rounded px-0.5 font-medium">{part}</span>
                        : <span key={i}>{part}</span>
                    )}
                  </p>
                  {form.footer && <p className="text-xs text-gray-400">{form.footer}</p>}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="button" disabled={saving} onClick={() => submit(true)} className="btn-secondary flex-1">
              Save as draft
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Working…' : 'Submit for approval'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function Templates() {
  const [templates, setTemplates]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showForm, setShowForm]         = useState(false);
  const [editTemplate, setEditTemplate] = useState(null);
  const [quickSend, setQuickSend]       = useState(null);
  const [metaSyncOpen, setMetaSyncOpen] = useState(false);
  const [search, setSearch]             = useState('');
  const [sort, setSort]                 = useState('newest');
  const [activeTab, setActiveTab]       = useState('');
  const [syncing, setSyncing]           = useState(false);
  const statusRef = useRef({}); // id → last seen status, to detect approval transitions

  // Toast when a template's approval status changes between refreshes
  const announceStatusChanges = (list) => {
    const prev = statusRef.current;
    if (Object.keys(prev).length) {
      for (const t of list) {
        const before = prev[t.id];
        if (before && before !== t.status) {
          if (t.status === 'APPROVED')      toast.success(`✅ "${t.name}" was approved — ready to send`);
          else if (t.status === 'REJECTED') toast.error(`❌ "${t.name}" was rejected${t.rejectionReason ? `: ${t.rejectionReason}` : ''}`);
        }
      }
    }
    statusRef.current = Object.fromEntries(list.map((t) => [t.id, t.status]));
  };

  const load = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const { data } = await api.get('/templates');
      announceStatusChanges(data);
      setTemplates(data);
    } catch {
      if (showSpinner) toast.error('Failed to load templates');
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  // Light polling so approvals appear without a manual refresh
  usePolling(() => load(false), 30000, true);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.post('/templates/sync');
      await load(false);
      toast.success('Synced with Meta');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleSave = async (formData, submit) => {
    try {
      if (editTemplate) {
        await api.put(`/templates/${editTemplate.id}`, formData);
        if (submit) await api.post(`/templates/${editTemplate.id}/submit`);
        toast.success(submit ? 'Submitted for approval' : 'Draft saved');
      } else {
        await api.post('/templates', { ...formData, draft: !submit });
        toast.success(submit ? 'Submitted to Meta for approval' : 'Draft saved');
      }
      load(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save template');
      throw err;
    }
  };

  const handleSubmit = async (id) => {
    try {
      await api.post(`/templates/${id}/submit`);
      toast.success('Submitted to Meta for approval');
      load(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Submit failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this template? This also removes it from Meta.')) return;
    try {
      const { data } = await api.delete(`/templates/${id}`);
      if (data.metaWarning) toast(data.metaWarning, { icon: '⚠️', duration: 6000 });
      else toast.success('Template deleted');
      load(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete template');
    }
  };

  const handleDuplicate = async (id) => {
    try {
      await api.post(`/templates/${id}/duplicate`);
      toast.success('Template duplicated');
      load();
    } catch {
      toast.error('Failed to duplicate template');
    }
  };

  // All category values present in the list
  const presentCategories = useMemo(
    () => [...new Set(templates.map((t) => t.category).filter(Boolean))],
    [templates]
  );

  // Filter + sort
  const filtered = useMemo(() => {
    let list = templates.filter((t) => {
      const q = search.toLowerCase();
      const matchSearch = !q || t.name.toLowerCase().includes(q) || t.body.toLowerCase().includes(q);
      const matchTab    = !activeTab || t.category === activeTab;
      return matchSearch && matchTab;
    });

    switch (sort) {
      case 'oldest': list = [...list].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); break;
      case 'name':   list = [...list].sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'usage':  list = [...list].sort((a, b) => b.usageCount - a.usageCount); break;
      default:       list = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return list;
  }, [templates, search, sort, activeTab]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Templates</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{templates.length} template{templates.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="btn-secondary text-sm"
          >
            <ArrowPathIcon className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} /> {syncing ? 'Syncing…' : 'Sync from Meta'}
          </button>
          <button
            onClick={() => setMetaSyncOpen(true)}
            className="btn-secondary text-sm"
          >
            Import
          </button>
          <button
            onClick={() => { setEditTemplate(null); setShowForm(true); }}
            className="btn-primary"
          >
            <PlusIcon className="w-4 h-4" /> New Template
          </button>
        </div>
      </div>

      {/* Search + Sort */}
      <div className="flex gap-3 flex-wrap">
        <input
          className="input flex-1 min-w-48"
          placeholder="Search templates by name or body…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input w-44"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name">Name A–Z</option>
          <option value="usage">Most used</option>
        </select>
      </div>

      {/* Category tabs */}
      {presentCategories.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeTab === ''
                ? 'bg-whatsapp-green text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            All ({templates.length})
          </button>
          {presentCategories.map((cat) => {
            const count = templates.filter((t) => t.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setActiveTab(cat === activeTab ? '' : cat)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeTab === cat
                    ? 'bg-whatsapp-green text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-4 h-48 animate-pulse bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          {search || activeTab ? (
            <>
              <p className="font-medium">No templates match your filter</p>
              <button
                onClick={() => { setSearch(''); setActiveTab(''); }}
                className="text-sm text-whatsapp-green mt-2 hover:underline"
              >
                Clear filters
              </button>
            </>
          ) : (
            <>
              <p className="font-medium">No templates yet</p>
              <p className="text-sm mt-1">Create templates for quick messaging</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              onEdit={(tmpl) => { setEditTemplate(tmpl); setShowForm(true); }}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              onSend={(tmpl) => setQuickSend(tmpl)}
              onSubmit={handleSubmit}
            />
          ))}
        </div>
      )}

      {showForm && (
        <TemplateForm
          template={editTemplate}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditTemplate(null); }}
        />
      )}

      {quickSend && (
        <QuickSendModal
          template={quickSend}
          onClose={() => setQuickSend(null)}
        />
      )}

      {metaSyncOpen && (
        <MetaSyncModal
          onImported={load}
          onClose={() => setMetaSyncOpen(false)}
        />
      )}
    </div>
  );
}

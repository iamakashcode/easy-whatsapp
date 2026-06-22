import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  UserIcon,
  UsersIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  MagnifyingGlassIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { useMessages } from '../hooks/useMessages';
import api from '../api/axios';
import MessageComposer from '../components/MessageComposer';
import DynamicValueFields, { paramsFilled } from '../components/DynamicValueFields';
import { resolveTokens, sampleContact as defaultSample } from '../utils/templateVars';

const initials = (name) =>
  (name || '?').trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('') || '?';

// Small segmented pill control reused for mode and message type.
function Segmented({ value, onChange, options }) {
  return (
    <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium rounded-lg transition-all ${
            value === o.value
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          {o.icon && <o.icon className="w-4 h-4" />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle, right }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-whatsapp-green/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-whatsapp-teal dark:text-whatsapp-green" />
        </div>
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-white leading-tight">{title}</h2>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

export default function Messages() {
  const { sendMessage, sendBulk } = useMessages();

  const [contacts, setContacts]       = useState([]);
  const [templates, setTemplates]     = useState([]);
  const [mode, setMode]               = useState('single'); // single | bulk
  const [selectedContact, setSelectedContact] = useState('');
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [msgType, setMsgType]         = useState('text'); // text | template
  const [params, setParams]           = useState([]);
  const [search, setSearch]           = useState('');
  const [composedText, setComposedText] = useState('');
  const [loading, setLoading]         = useState(false);

  useEffect(() => {
    api.get('/contacts', { params: { limit: 200 } }).then((r) => setContacts(r.data.data)).catch(() => {});
    api.get('/templates').then((r) => setTemplates(r.data.filter((t) => t.status === 'APPROVED'))).catch(() => {});
  }, []);

  const useTemplate = msgType === 'template';
  const templateObj = selectedTemplate ? templates.find((t) => t.id === parseInt(selectedTemplate)) : null;
  const templateVars = (useTemplate && templateObj?.variables) || [];
  const templateBody = templateObj?.body || '';

  const sampleContact = mode === 'single'
    ? contacts.find((c) => c.id === parseInt(selectedContact))
    : contacts.find((c) => c.id === selectedContacts[0]);

  // Bulk picker: filter + select-all
  const filtered = contacts.filter((c) =>
    `${c.name} ${c.phone}`.toLowerCase().includes(search.trim().toLowerCase()));
  const allFilteredSelected = filtered.length > 0 && filtered.every((c) => selectedContacts.includes(c.id));
  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelectedContacts((prev) => prev.filter((id) => !filtered.some((c) => c.id === id)));
    } else {
      setSelectedContacts((prev) => [...new Set([...prev, ...filtered.map((c) => c.id)])]);
    }
  };
  const toggleBulkContact = (id) =>
    setSelectedContacts((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));

  // Live preview — resolve {{n}} placeholders with the sample contact's values.
  const sample = sampleContact || defaultSample;
  const fillPreview = (txt) =>
    (txt || '').replace(/\{\{(\w+)\}\}/g, (m, key) => {
      const idx = templateVars.indexOf(key);
      if (idx === -1) return m;
      return resolveTokens(params[idx], sample) || m;
    });
  const previewText = fillPreview(composedText);

  const recipientCount = mode === 'single' ? (selectedContact ? 1 : 0) : selectedContacts.length;

  const handleSend = async (body) => {
    if (mode === 'single' && !selectedContact) return toast.error('Please select a contact');
    if (mode === 'bulk' && !selectedContacts.length) return toast.error('Please select at least one contact');
    if (useTemplate && !selectedTemplate) return toast.error('Please choose a template');
    if (templateVars.length && !paramsFilled(params, templateVars.length)) {
      return toast.error('Please fill in all template values');
    }

    const templateParams = useTemplate && templateObj ? params : undefined;
    const isTemplate = useTemplate && selectedTemplate;

    setLoading(true);
    try {
      if (mode === 'single') {
        await sendMessage({
          contactId: parseInt(selectedContact),
          body,
          type: isTemplate ? 'template' : 'text',
          templateName: isTemplate ? templateObj?.name : undefined,
          templateParams,
        });
        toast.success('Message sent!');
      } else {
        const res = await sendBulk({
          contactIds: selectedContacts,
          body,
          type: isTemplate ? 'template' : 'text',
          templateName: isTemplate ? templateObj?.name : undefined,
          templateParams,
        });
        toast.success(`Sent: ${res.sent}, Failed: ${res.failed}`);
        if (res.failed > 0) res.errors.forEach((e) => console.error(e));
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Send Message</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Message one contact or many in a single send</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Left: the form ── */}
        <div className="lg:col-span-3 space-y-5">
          {/* Recipients */}
          <section className="card p-5 sm:p-6">
            <SectionHeader
              icon={UsersIcon}
              title="Recipients"
              subtitle={mode === 'single' ? 'Pick one contact' : `${selectedContacts.length} selected`}
              right={
                <Segmented
                  value={mode}
                  onChange={setMode}
                  options={[
                    { value: 'single', label: 'Single', icon: UserIcon },
                    { value: 'bulk', label: 'Bulk', icon: UsersIcon },
                  ]}
                />
              }
            />

            {mode === 'single' ? (
              <select className="input" value={selectedContact} onChange={(e) => setSelectedContact(e.target.value)}>
                <option value="">Select a contact…</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
                ))}
              </select>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      className="input pl-9"
                      placeholder="Search contacts…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="btn-secondary text-sm whitespace-nowrap"
                  >
                    {allFilteredSelected ? 'Clear' : 'Select all'}
                  </button>
                </div>

                <div className="border border-slate-200 dark:border-slate-700 rounded-xl max-h-64 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800">
                  {filtered.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">No contacts found</p>
                  ) : filtered.map((c) => {
                    const checked = selectedContacts.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                          checked ? 'bg-whatsapp-green/5' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleBulkContact(c.id)}
                          className="accent-whatsapp-green w-4 h-4"
                        />
                        <div className="w-8 h-8 rounded-full bg-whatsapp-green/10 text-whatsapp-teal dark:text-whatsapp-green flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          {initials(c.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{c.name}</p>
                          <p className="text-xs text-slate-400 truncate">{c.phone}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
                {selectedContacts.length > 0 && (
                  <p className="text-xs text-slate-500">
                    <span className="font-semibold text-whatsapp-teal dark:text-whatsapp-green">{selectedContacts.length}</span> recipient{selectedContacts.length > 1 ? 's' : ''} selected
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Message */}
          <section className="card p-5 sm:p-6">
            <SectionHeader
              icon={ChatBubbleLeftRightIcon}
              title="Message"
              subtitle={useTemplate ? 'Approved WhatsApp template' : 'Free-text message'}
              right={
                templates.length > 0 ? (
                  <Segmented
                    value={msgType}
                    onChange={setMsgType}
                    options={[
                      { value: 'text', label: 'Text', icon: PencilSquareIcon },
                      { value: 'template', label: 'Template', icon: DocumentTextIcon },
                    ]}
                  />
                ) : null
              }
            />

            {templates.length === 0 && (
              <p className="text-xs text-slate-400 mb-3">
                No approved templates yet — create one in <span className="font-medium">Templates</span> and submit it for approval to send template messages.
              </p>
            )}

            {useTemplate && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1.5">Template</label>
                <select
                  className="input"
                  value={selectedTemplate}
                  onChange={(e) => { setSelectedTemplate(e.target.value); setParams([]); }}
                >
                  <option value="">Select a template…</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>

                <DynamicValueFields
                  key={`${selectedTemplate}-${mode}`}
                  variables={templateVars}
                  value={params}
                  onChange={setParams}
                  sampleContact={sampleContact}
                  bulk={mode === 'bulk'}
                />
              </div>
            )}

            <label className="block text-sm font-medium mb-1.5">{useTemplate ? 'Message (editable)' : 'Your message'}</label>
            <MessageComposer
              onSend={handleSend}
              loading={loading}
              onTextChange={setComposedText}
              seedText={useTemplate ? templateBody : ''}
              placeholder={useTemplate && templateBody ? templateBody : 'Type your message here…'}
              sendLabel={mode === 'bulk' ? `Send to ${recipientCount || ''}`.trim() : 'Send'}
            />
          </section>
        </div>

        {/* ── Right: live preview ── */}
        <div className="lg:col-span-2">
          <div className="card p-5 lg:sticky lg:top-6">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Preview</h3>

            {/* WhatsApp-style chat bubble */}
            <div className="rounded-2xl p-4 bg-[#e5ddd5] dark:bg-slate-800/60 min-h-[160px] flex flex-col justify-end">
              {previewText ? (
                <div className="self-end max-w-[85%] rounded-xl rounded-tr-sm bg-[#dcf8c6] dark:bg-whatsapp-teal/30 px-3 py-2 shadow-sm">
                  <p className="text-sm text-slate-800 dark:text-slate-100 whitespace-pre-wrap break-words leading-relaxed">{previewText}</p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      {new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </span>
                    <CheckIcon className="w-3 h-3 text-blue-500" />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center my-auto">
                  Your message preview will appear here
                </p>
              )}
            </div>

            {/* Summary */}
            <div className="mt-4 space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Sending to</span>
                <span className="font-medium text-slate-800 dark:text-slate-100">
                  {recipientCount === 0
                    ? '—'
                    : mode === 'single'
                      ? (sampleContact?.name || '1 contact')
                      : `${recipientCount} contact${recipientCount > 1 ? 's' : ''}`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Type</span>
                <span className={`badge ${useTemplate ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                  {useTemplate ? 'Template' : 'Text'}
                </span>
              </div>
              {useTemplate && templateObj && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Template</span>
                  <span className="font-mono text-xs text-slate-700 dark:text-slate-300 truncate max-w-[60%]">{templateObj.name}</span>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-400 mt-4 leading-relaxed">
              {useTemplate
                ? 'Template values are filled per recipient. Edit the text above before sending.'
                : 'Free-text messages only reach contacts who messaged you in the last 24 hours.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

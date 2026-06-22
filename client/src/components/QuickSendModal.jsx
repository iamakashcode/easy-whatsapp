import { useState, useEffect, useRef } from 'react';
import { XMarkIcon, PaperAirplaneIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../api/axios';
import DynamicValueFields, { paramsFilled } from './DynamicValueFields';
import { resolveTokens } from '../utils/templateVars';

export default function QuickSendModal({ template, onClose }) {
  const [search, setSearch]         = useState('');
  const [contacts, setContacts]     = useState([]);
  const [selected, setSelected]     = useState(null);
  const [dropdownOpen, setDropdown] = useState(false);
  const [params, setParams]         = useState([]);
  const [sending, setSending]       = useState(false);
  const searchRef = useRef(null);

  const variables = template.variables || [];

  useEffect(() => { searchRef.current?.focus(); }, []);

  useEffect(() => {
    if (!search.trim()) { setContacts([]); return; }
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get('/contacts', { params: { search, limit: 10 } });
        setContacts(data.data);
        setDropdown(true);
      } catch { /* silent */ }
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const handleSelectContact = (c) => {
    setSelected(c);
    setSearch(c.name);
    setDropdown(false);
  };

  const canSend = selected && (variables.length === 0 || paramsFilled(params, variables.length));

  // Live preview: substitute each placeholder with its resolved value for the chosen contact.
  const resolvedBody = template.body.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const idx = variables.indexOf(key);
    if (idx === -1) return `{{${key}}}`;
    return resolveTokens(params[idx] || '', selected || undefined) || `{{${key}}}`;
  });

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      await api.post('/messages/send', {
        contactId: selected.id,
        type: 'template',
        templateName: template.name,
        templateParams: variables.length ? params : undefined,
        body: resolvedBody,
      });
      toast.success(`Message sent to ${selected.name}`);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="card w-full max-w-lg p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Quick Send</h2>
            <p className="text-xs text-gray-400 mt-0.5 font-mono">{template.name}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Contact picker */}
        <div>
          <label className="block text-sm font-medium mb-1">Send to *</label>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={searchRef}
              className="input pl-9"
              placeholder="Search contact by name or phone…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelected(null); }}
              onFocus={() => contacts.length > 0 && setDropdown(true)}
            />
            {dropdownOpen && contacts.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-10 overflow-hidden">
                {contacts.map((c) => (
                  <button
                    key={c.id}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
                    onClick={() => handleSelectContact(c)}
                  >
                    <div className="w-7 h-7 rounded-full bg-whatsapp-green/20 flex items-center justify-center text-whatsapp-teal dark:text-whatsapp-green font-bold text-xs flex-shrink-0">
                      {c.name[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{c.phone}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Variable picker */}
        <DynamicValueFields
          variables={variables}
          value={params}
          onChange={setParams}
          sampleContact={selected || undefined}
        />

        {/* Live preview */}
        <div>
          <p className="text-sm font-medium mb-1">Preview</p>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-3 text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-200">
            {resolvedBody.split(/(\{\{[^}]+\}\})/g).map((part, i) =>
              /^\{\{[^}]+\}\}$/.test(part)
                ? <span key={i} className="bg-yellow-200 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 rounded px-0.5">{part}</span>
                : <span key={i}>{part}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={handleSend}
            disabled={!canSend || sending}
            className="btn-primary flex-1 justify-center"
          >
            {sending ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                Sending…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <PaperAirplaneIcon className="w-4 h-4" /> Send Message
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

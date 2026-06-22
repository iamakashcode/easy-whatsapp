import { useState, useEffect, useRef } from 'react';
import { XMarkIcon, PlusIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import api from '../api/axios';

const COUNTRY_CODES = [
  { code: '+91',  flag: '🇮🇳', name: 'India' },
  { code: '+1',   flag: '🇺🇸', name: 'USA / Canada' },
  { code: '+44',  flag: '🇬🇧', name: 'UK' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: '+65',  flag: '🇸🇬', name: 'Singapore' },
  { code: '+60',  flag: '🇲🇾', name: 'Malaysia' },
  { code: '+880', flag: '🇧🇩', name: 'Bangladesh' },
  { code: '+92',  flag: '🇵🇰', name: 'Pakistan' },
  { code: '+94',  flag: '🇱🇰', name: 'Sri Lanka' },
  { code: '+977', flag: '🇳🇵', name: 'Nepal' },
  { code: '+61',  flag: '🇦🇺', name: 'Australia' },
  { code: '+49',  flag: '🇩🇪', name: 'Germany' },
  { code: '+33',  flag: '🇫🇷', name: 'France' },
  { code: '+39',  flag: '🇮🇹', name: 'Italy' },
  { code: '+34',  flag: '🇪🇸', name: 'Spain' },
  { code: '+55',  flag: '🇧🇷', name: 'Brazil' },
  { code: '+52',  flag: '🇲🇽', name: 'Mexico' },
  { code: '+81',  flag: '🇯🇵', name: 'Japan' },
  { code: '+82',  flag: '🇰🇷', name: 'South Korea' },
  { code: '+86',  flag: '🇨🇳', name: 'China' },
  { code: '+7',   flag: '🇷🇺', name: 'Russia' },
  { code: '+20',  flag: '🇪🇬', name: 'Egypt' },
  { code: '+234', flag: '🇳🇬', name: 'Nigeria' },
  { code: '+27',  flag: '🇿🇦', name: 'South Africa' },
  { code: '+254', flag: '🇰🇪', name: 'Kenya' },
];

// Detect country code from a full phone like "+919876543210" → ['+91', '9876543210']
const parsePhone = (full) => {
  if (!full) return ['+91', ''];
  const normalized = full.startsWith('+') ? full : '+' + full;
  // try longest codes first
  const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
  for (const { code } of sorted) {
    if (normalized.startsWith(code)) {
      return [code, normalized.slice(code.length)];
    }
  }
  return ['+91', normalized.replace(/^\+/, '')];
};

export default function ContactForm({ contact, onSave, onClose }) {
  const [countryCode, setCountryCode] = useState('+91');
  const [localPhone, setLocalPhone]   = useState('');
  const [form, setForm] = useState({
    name: '',
    tags: [],
    notes: '',
  });
  const [tagInput, setTagInput]       = useState('');
  const [saving, setSaving]           = useState(false);
  const [duplicate, setDuplicate]     = useState(null); // { id, name, phone } if found
  const debounceRef = useRef(null);

  useEffect(() => {
    if (contact) {
      const [code, number] = parsePhone(contact.phone);
      setCountryCode(code);
      setLocalPhone(number);
      setForm({
        name:  contact.name  || '',
        tags:  contact.tags  || [],
        notes: contact.notes || '',
      });
    }
  }, [contact]);

  // Debounced duplicate check whenever the full phone changes
  useEffect(() => {
    const digits = localPhone.replace(/\D/g, '');
    if (digits.length < 5) { setDuplicate(null); return; }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const fullPhone = countryCode + digits;
      try {
        const { data } = await api.get('/contacts', { params: { search: fullPhone, limit: 10 } });
        const match = data.data?.find((c) => {
          const normalized = c.phone.replace(/\D/g, '');
          return normalized === fullPhone.replace(/\D/g, '');
        });
        // Don't flag when editing the same contact
        if (match && match.id !== contact?.id) {
          setDuplicate(match);
        } else {
          setDuplicate(null);
        }
      } catch { setDuplicate(null); }
    }, 400);

    return () => clearTimeout(debounceRef.current);
  }, [localPhone, countryCode, contact?.id]);

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) {
      setForm((f) => ({ ...f, tags: [...f.tags, t] }));
    }
    setTagInput('');
  };

  const removeTag = (tag) => setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ ...form, phone: countryCode + localPhone.replace(/\s/g, '') });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{contact ? 'Edit Contact' : 'New Contact'}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Phone *</label>
            <div className="flex gap-2">
              <select
                className="input w-44 flex-shrink-0"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
              >
                {COUNTRY_CODES.map(({ code, flag, name }) => (
                  <option key={code} value={code}>{flag} {code} {name}</option>
                ))}
              </select>
              <input
                className="input flex-1 font-mono"
                value={localPhone}
                onChange={(e) => setLocalPhone(e.target.value.replace(/[^\d\s\-]/g, ''))}
                required
                placeholder="98765 43210"
                inputMode="tel"
              />
            </div>
            {duplicate ? (
              <div className="mt-2 flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2">
                <ExclamationTriangleIcon className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-700 dark:text-amber-300">
                  <span className="font-semibold">Already exists:</span> {duplicate.name}
                  <span className="font-mono ml-1 text-amber-500">({duplicate.phone})</span>
                </div>
              </div>
            ) : (
              <p className="mt-1 text-xs text-gray-400 font-mono">
                Full number: {countryCode}{localPhone.replace(/\s/g, '') || '…'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tags</label>
            <div className="flex gap-2">
              <input
                className="input"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Add tag and press Enter"
              />
              <button type="button" onClick={addTag} className="btn-secondary px-3">
                <PlusIcon className="w-4 h-4" />
              </button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.tags.map((tag) => (
                  <span key={tag} className="badge bg-whatsapp-green/10 text-whatsapp-teal dark:text-whatsapp-green">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="ml-1 hover:text-red-500">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              className="input resize-none"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Optional notes..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button
              type="submit"
              disabled={saving || (!contact && !!duplicate)}
              className="btn-primary flex-1"
              title={!contact && duplicate ? 'This number is already in your contacts' : ''}
            >
              {saving ? 'Saving…' : contact ? 'Save Changes' : 'Add Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

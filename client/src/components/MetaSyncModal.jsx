import { useState, useEffect } from 'react';
import { XMarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../api/axios';

const STATUS_BADGE = {
  APPROVED: 'bg-green-100  dark:bg-green-900/30  text-green-700  dark:text-green-300',
  PENDING:  'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
  REJECTED: 'bg-red-100    dark:bg-red-900/30    text-red-700    dark:text-red-300',
};

export default function MetaSyncModal({ onImported, onClose }) {
  const [metaTemplates, setMetaTemplates] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [selected, setSelected]           = useState(new Set());
  const [importing, setImporting]         = useState(false);

  useEffect(() => {
    api.get('/templates/meta-sync')
      .then(({ data }) => { setMetaTemplates(data); })
      .catch((err) => setError(err.response?.data?.error || 'Failed to fetch Meta templates'))
      .finally(() => setLoading(false));
  }, []);

  const toggleSelect = (name) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === metaTemplates.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(metaTemplates.map((t) => t.name)));
    }
  };

  const handleImport = async () => {
    const toImport = metaTemplates.filter((t) => selected.has(t.name));
    if (!toImport.length) return;
    setImporting(true);
    let imported = 0;
    for (const t of toImport) {
      try {
        await api.post('/templates', {
          name:     t.name,
          body:     t.body || `[${t.name}]`,
          language: t.language || 'en_US',
          category: t.category?.toLowerCase().includes('marketing') ? 'Marketing'
                  : t.category?.toLowerCase().includes('util')      ? 'Transactional'
                  : 'Other',
        });
        imported++;
      } catch { /* skip duplicates/errors */ }
    }
    toast.success(`${imported} template${imported !== 1 ? 's' : ''} imported`);
    setImporting(false);
    onImported();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="card w-full max-w-2xl p-6 flex flex-col gap-4 max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Sync from Meta</h2>
            <p className="text-xs text-gray-400 mt-0.5">Import your approved WhatsApp templates from Meta Business</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-8 h-8 border-3 border-whatsapp-green border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Fetching templates from Meta…</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500 text-sm font-medium">{error}</p>
              <p className="text-xs text-gray-400 mt-1">Make sure your Access Token and Business Account ID are correct in Settings.</p>
            </div>
          ) : metaTemplates.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>No templates found in your Meta Business account.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-500">{metaTemplates.length} templates found</p>
                <button onClick={toggleAll} className="text-xs text-whatsapp-green hover:underline">
                  {selected.size === metaTemplates.length ? 'Deselect all' : 'Select all'}
                </button>
              </div>
              <div className="space-y-2">
                {metaTemplates.map((t) => (
                  <label
                    key={t.name}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      selected.has(t.name)
                        ? 'border-whatsapp-green bg-whatsapp-green/5'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(t.name)}
                      onChange={() => toggleSelect(t.name)}
                      className="mt-1 accent-whatsapp-green"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{t.name}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_BADGE[t.status] || STATUS_BADGE.PENDING}`}>
                          {t.status}
                        </span>
                        {t.category && (
                          <span className="text-[10px] text-gray-400 uppercase tracking-wide">{t.category}</span>
                        )}
                      </div>
                      {t.body ? (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 whitespace-pre-wrap">{t.body}</p>
                      ) : (
                        <p className="text-xs text-gray-400 italic mt-1">No body text (media or header-only template)</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && !error && metaTemplates.length > 0 && (
          <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button
              onClick={handleImport}
              disabled={selected.size === 0 || importing}
              className="btn-primary flex-1 justify-center"
            >
              {importing ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                  Importing…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  Import {selected.size > 0 ? `${selected.size} Selected` : ''}
                </span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

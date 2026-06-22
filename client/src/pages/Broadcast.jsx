import { useEffect, useState } from 'react';
import {
  PlusIcon, TrashIcon, ChartBarSquareIcon, MegaphoneIcon,
  ClockIcon, XMarkIcon, CalendarDaysIcon, UsersIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../api/axios';
import BroadcastForm from '../components/BroadcastForm';

const statusColors = {
  draft:     'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  sent:      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  failed:    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

// Per-recipient delivery status styling
const recipientStatus = {
  read:      { label: 'Read',      cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  delivered: { label: 'Delivered', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  sent:      { label: 'Sent',      cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  failed:    { label: 'Failed',    cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  pending:   { label: 'Pending',   cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
};

const initials = (name) =>
  (name || '?').trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('') || '?';

function Tile({ label, value, cls }) {
  return (
    <div className={`rounded-xl p-3 text-center ${cls}`}>
      <p className="text-2xl font-bold leading-none">{value}</p>
      <p className="text-xs font-medium mt-1">{label}</p>
    </div>
  );
}

function ReportModal({ broadcastId, onClose }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api.get(`/broadcasts/${broadcastId}/report`)
      .then((r) => setReport(r.data))
      .catch(() => toast.error('Failed to load report'))
      .finally(() => setLoading(false));
  }, [broadcastId]);

  const s = report?.summary;
  const rows = (report?.recipients || []).filter((r) => filter === 'all' || r.status === filter);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="card w-full max-w-2xl p-6 max-h-[85vh] flex flex-col">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Broadcast Report</h2>
            {report && (
              <p className="text-sm text-slate-400 font-mono">{report.broadcast.template?.name}</p>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><XMarkIcon className="w-5 h-5" /></button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-7 h-7 border-2 border-whatsapp-green border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Summary tiles */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 mb-4">
              <Tile label="Read" value={s.read} cls={recipientStatus.read.cls} />
              <Tile label="Delivered" value={s.delivered} cls={recipientStatus.delivered.cls} />
              <Tile label="Sent" value={s.sent} cls={recipientStatus.sent.cls} />
              <Tile label="Failed" value={s.failed} cls={recipientStatus.failed.cls} />
              <Tile label="Pending" value={s.pending} cls={recipientStatus.pending.cls} />
            </div>
            <p className="text-xs text-slate-500 mb-3">
              <span className="font-semibold text-whatsapp-teal dark:text-whatsapp-green">{s.reached}</span> of {s.total} reached WhatsApp
              {s.failed > 0 && <> · <span className="font-semibold text-red-500">{s.failed} failed</span></>}
            </p>

            {/* Filter chips */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {['all', 'read', 'delivered', 'sent', 'failed', 'pending'].map((f) => {
                const count = f === 'all' ? s.total : s[f];
                if (f !== 'all' && !count) return null;
                return (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
                      filter === f
                        ? 'bg-whatsapp-green text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {f} {f !== 'all' && `(${count})`}
                  </button>
                );
              })}
            </div>

            {/* Recipient rows */}
            <div className="flex-1 overflow-y-auto -mx-1 px-1 divide-y divide-slate-50 dark:divide-slate-800">
              {rows.map((r) => {
                const st = recipientStatus[r.status] || recipientStatus.pending;
                return (
                  <div key={r.id} className="flex items-start gap-3 py-3">
                    <div className="w-9 h-9 rounded-full bg-whatsapp-green/10 text-whatsapp-teal dark:text-whatsapp-green flex items-center justify-center text-xs font-semibold flex-shrink-0">
                      {initials(r.contact?.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{r.contact?.name}</p>
                      <p className="text-xs text-slate-400 font-mono">{r.contact?.phone}</p>
                      {r.error && (
                        <p className="text-xs text-red-500 mt-1 leading-snug">{r.error}</p>
                      )}
                    </div>
                    <span className={`badge ${st.cls} flex-shrink-0`}>{st.label}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function Broadcast() {
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [reportId, setReportId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/broadcasts');
      setBroadcasts(data);
    } catch {
      toast.error('Failed to load broadcasts');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async (payload) => {
    try {
      await api.post('/broadcasts', payload);
      toast.success('Broadcast created');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create broadcast');
      throw err;
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this broadcast?')) return;
    try {
      await api.delete(`/broadcasts/${id}`);
      toast.success('Broadcast deleted');
      load();
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Broadcasts</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Send a template to many contacts and track delivery</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <PlusIcon className="w-4 h-4" /> New Broadcast
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="card p-5 h-40 animate-pulse" />)}
        </div>
      ) : broadcasts.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-whatsapp-green/10 flex items-center justify-center mx-auto mb-4">
            <MegaphoneIcon className="w-7 h-7 text-whatsapp-teal dark:text-whatsapp-green" />
          </div>
          <p className="font-semibold text-slate-800 dark:text-slate-100">No broadcasts yet</p>
          <p className="text-sm text-slate-400 mt-1 mb-5">Send an approved template to a group of contacts in one go.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary mx-auto">
            <PlusIcon className="w-4 h-4" /> Create your first broadcast
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {broadcasts.map((b) => {
            const canReport = b.status === 'sent' || b.status === 'failed';
            return (
              <div key={b.id} className="card card-interactive p-5 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-whatsapp-green/10 flex items-center justify-center flex-shrink-0">
                      <MegaphoneIcon className="w-5 h-5 text-whatsapp-teal dark:text-whatsapp-green" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">{b.template?.name}</p>
                      <span className={`badge ${statusColors[b.status]} mt-0.5`}>{b.status}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(b.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 text-sm text-slate-500 dark:text-slate-400 mb-4">
                  <div className="flex items-center gap-2">
                    <UsersIcon className="w-4 h-4 flex-shrink-0" />
                    {b._count?.recipients} recipient{b._count?.recipients === 1 ? '' : 's'}
                  </div>
                  <div className="flex items-center gap-2">
                    {b.scheduledAt ? <CalendarDaysIcon className="w-4 h-4 flex-shrink-0" /> : <ClockIcon className="w-4 h-4 flex-shrink-0" />}
                    {b.scheduledAt
                      ? new Date(b.scheduledAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
                      : `Created ${new Date(b.createdAt).toLocaleDateString()}`}
                  </div>
                </div>

                <button
                  onClick={() => canReport && setReportId(b.id)}
                  disabled={!canReport}
                  className={`mt-auto w-full justify-center text-sm py-2 rounded-xl font-medium inline-flex items-center gap-2 transition-colors ${
                    canReport
                      ? 'bg-whatsapp-green/10 text-whatsapp-teal dark:text-whatsapp-green hover:bg-whatsapp-green/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <ChartBarSquareIcon className="w-4 h-4" />
                  {canReport ? 'View report' : b.status === 'scheduled' ? 'Scheduled' : 'Draft'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showForm && <BroadcastForm onSave={handleCreate} onClose={() => setShowForm(false)} />}
      {reportId && <ReportModal broadcastId={reportId} onClose={() => setReportId(null)} />}
    </div>
  );
}

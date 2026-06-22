import { useEffect, useState } from 'react';
import { XMarkIcon, PlusIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { formatCurrency } from '../../utils/formatters';
import { startImpersonation } from '../../utils/impersonation';

const statusBadge = (status) =>
  status === 'SUSPENDED'
    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';

export default function AdminClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // client detail (modal)
  const [showNew, setShowNew] = useState(false);  // add-client modal

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/clients');
      setClients(data);
    } catch {
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const openClient = async (id) => {
    try {
      const { data } = await api.get(`/admin/clients/${id}`);
      setSelected(data);
    } catch {
      toast.error('Failed to load client');
    }
  };

  const refresh = () => { load(); if (selected) openClient(selected.id); };

  const setStatus = async (id, action) => {
    try {
      await api.post(`/admin/clients/${id}/${action}`);
      toast.success(action === 'suspend' ? 'Client suspended' : 'Client activated');
      refresh();
    } catch {
      toast.error('Action failed');
    }
  };

  const remove = async (id, name) => {
    if (!window.confirm(`Delete client "${name}"? This removes all their data and cannot be undone.`)) return;
    try {
      await api.delete(`/admin/clients/${id}`);
      toast.success('Client deleted');
      setSelected(null);
      load();
    } catch {
      toast.error('Delete failed');
    }
  };

  const impersonate = async (id, name) => {
    try {
      const { data } = await api.post(`/admin/clients/${id}/impersonate`);
      startImpersonation(data.token, name);
      window.location.href = '/dashboard'; // reload into the customer app as this client
    } catch {
      toast.error('Impersonation failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Clients</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage customer accounts, usage and balances</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary">
          <PlusIcon className="w-4 h-4" /> Add client
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading…</div>
        ) : clients.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No clients yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-left text-slate-500">
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium text-right">Messages</th>
                  <th className="px-4 py-3 font-medium text-right">Spend</th>
                  <th className="px-4 py-3 font-medium text-right">Outstanding</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {clients.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3">
                      <button onClick={() => openClient(c.id)} className="text-left">
                        <p className="font-medium text-slate-900 dark:text-white hover:text-whatsapp-teal">{c.username}</p>
                        <p className="text-xs text-slate-400">{c.email}</p>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">{c.messageCount}</td>
                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">{formatCurrency(c.totalSpend)}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(c.outstanding)}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${statusBadge(c.status)}`}>{c.status.toLowerCase()}</span>
                      {c.blocked && c.status !== 'SUSPENDED' && <span className="badge ml-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">blocked</span>}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={() => openClient(c.id)} className="text-xs text-whatsapp-teal dark:text-whatsapp-green hover:underline">Manage</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <ClientModal
          client={selected}
          onClose={() => setSelected(null)}
          onStatus={setStatus}
          onDelete={remove}
          onImpersonate={impersonate}
          onChanged={refresh}
        />
      )}

      {showNew && (
        <NewClientModal
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); load(); }}
        />
      )}
    </div>
  );
}

const thisMonthInput = () => new Date().toISOString().slice(0, 7);

function NewClientModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    username: '', email: '', password: '', monthlyFee: '', billingStartsAt: thisMonthInput(),
  });
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/admin/clients', {
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        monthlyFee: form.monthlyFee === '' ? undefined : Number(form.monthlyFee),
        billingStartsAt: form.billingStartsAt || undefined,
      });
      toast.success('Client created');
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create client');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
      <form onSubmit={submit} className="card w-full max-w-md p-6 my-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Add client</h2>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><XMarkIcon className="w-5 h-5" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1 text-slate-500">Business / client name *</label>
            <input className="input" value={form.username} onChange={(e) => set('username', e.target.value)} placeholder="Client name" required />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-slate-500">Email *</label>
            <input type="email" className="input" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="client@example.com" required />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-slate-500">Password *</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} className="input pr-10" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="At least 6 characters" required />
              <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPw ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">Share these login details with the client.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1 text-slate-500">Monthly fee (₹)</label>
              <input type="number" min="0" step="1" className="input" value={form.monthlyFee} onChange={(e) => set('monthlyFee', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-slate-500">Billing starts</label>
              <input type="month" className="input" value={form.billingStartsAt} onChange={(e) => set('billingStartsAt', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={busy} className="btn-primary flex-1 justify-center">{busy ? 'Creating…' : 'Create client'}</button>
        </div>
      </form>
    </div>
  );
}

const invoiceBadge = (status) => ({
  ISSUED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  PAID:   'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  OVERDUE:'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  VOID:   'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
}[status] || 'bg-slate-100 text-slate-600');
const monthLabel = (d) => new Date(d).toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });

// "YYYY-MM-DDT..." or Date → "YYYY-MM" for the month input
const toMonthInput = (d) => (d ? new Date(d).toISOString().slice(0, 7) : '');
// The month a client joined, as a sensible default for the billing-start picker.
const joinMonth = (d) => (d ? new Date(d).toISOString().slice(0, 7) : '');

function ClientModal({ client, onClose, onStatus, onDelete, onImpersonate, onChanged }) {
  const [fee, setFee] = useState(client.monthlyFee ?? '');
  const [limit, setLimit] = useState(client.creditLimit ?? '');
  const [startMonth, setStartMonth] = useState(toMonthInput(client.billingStartsAt) || joinMonth(client.createdAt));
  const [busy, setBusy] = useState(false);

  const saveBilling = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.put(`/admin/clients/${client.id}/billing`, {
        monthlyFee: Number(fee) || 0,
        creditLimit: limit === '' ? null : Number(limit),
        billingStartsAt: startMonth || '',
      });
      toast.success('Billing updated');
      onChanged();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  const payInvoice = async (invId) => {
    try {
      await api.post(`/admin/invoices/${invId}/pay`);
      toast.success('Invoice marked paid');
      onChanged();
    } catch {
      toast.error('Failed to mark paid');
    }
  };

  const issueInvoice = async () => {
    try {
      const { data } = await api.post(`/admin/clients/${client.id}/issue-invoice`);
      toast[data.created ? 'success' : 'error'](data.message);
      onChanged();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to issue invoice');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
      <div className="card w-full max-w-2xl p-6 my-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{client.username}</h2>
            <p className="text-sm text-slate-400">{client.email}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><XMarkIcon className="w-5 h-5" /></button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5 text-center">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
            <p className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(client.currentUsage)}</p>
            <p className="text-xs text-slate-500">Usage this cycle</p>
          </div>
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
            <p className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(client.outstanding)}</p>
            <p className="text-xs text-slate-500">Outstanding</p>
          </div>
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
            <p className="text-lg font-bold text-slate-900 dark:text-white">{client._count?.messages ?? 0}</p>
            <p className="text-xs text-slate-500">Messages</p>
          </div>
        </div>

        <form onSubmit={saveBilling} className="mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium mb-1 text-slate-500">Monthly fee (₹)</label>
              <input type="number" min="0" step="1" className="input" value={fee} onChange={(e) => setFee(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-slate-500">Credit limit (₹)</label>
              <input type="number" min="0" step="1" className="input" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="No limit" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-slate-500">Billing starts</label>
              <input type="month" className="input" value={startMonth} onChange={(e) => setStartMonth(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-slate-400">
              First month this client is billed. Set it to next month to skip charging the joining month. Joined {joinMonth(client.createdAt)}.
            </p>
            <button type="submit" disabled={busy} className="btn-primary">Save billing</button>
          </div>
        </form>

        <div className="flex flex-wrap gap-2 mb-5">
          {client.status === 'SUSPENDED' ? (
            <button onClick={() => onStatus(client.id, 'activate')} className="btn-secondary text-sm">Activate</button>
          ) : (
            <button onClick={() => onStatus(client.id, 'suspend')} className="btn-secondary text-sm">Suspend</button>
          )}
          <button onClick={issueInvoice} className="btn-secondary text-sm" title="Generate this client's current invoice now (e.g. collect the first advance payment)">Issue invoice now</button>
          <button onClick={() => onImpersonate(client.id, client.username)} className="btn-secondary text-sm">Login as client</button>
          <button onClick={() => onDelete(client.id, client.username)} className="text-sm px-4 py-2 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">Delete</button>
        </div>

        <div>
          <h3 className="font-medium text-sm mb-2 text-slate-700 dark:text-slate-200">Invoices</h3>
          {client.invoices?.length === 0 ? (
            <p className="text-xs text-slate-400">No invoices yet</p>
          ) : (
            <div className="max-h-56 overflow-y-auto">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {client.invoices?.map((inv) => (
                    <tr key={inv.id}>
                      <td className="py-2 font-medium">{monthLabel(inv.periodStart)}</td>
                      <td className="py-2 text-right">{formatCurrency(inv.total)}</td>
                      <td className="py-2 px-2"><span className={`badge ${invoiceBadge(inv.status)}`}>{inv.status.toLowerCase()}</span></td>
                      <td className="py-2 text-right">
                        {inv.status !== 'PAID' && inv.status !== 'VOID' && (
                          <button onClick={() => payInvoice(inv.id)} className="text-xs text-whatsapp-teal dark:text-whatsapp-green hover:underline">Mark paid</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

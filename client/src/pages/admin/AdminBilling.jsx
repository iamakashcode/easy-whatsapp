import { useEffect, useState } from 'react';
import { BanknotesIcon, ArrowTrendingUpIcon, ClockIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import StatCard from '../../components/StatCard';
import { formatCurrency } from '../../utils/formatters';

const FILTERS = ['ALL', 'ISSUED', 'OVERDUE', 'PAID'];
const invoiceBadge = (status) => ({
  ISSUED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  PAID:   'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  OVERDUE:'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  VOID:   'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
}[status] || 'bg-slate-100 text-slate-600');
const monthLabel = (d) => new Date(d).toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });

export default function AdminBilling() {
  const [overview, setOverview] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const params = filter === 'ALL' ? {} : { status: filter };
      const [o, inv] = await Promise.all([api.get('/admin/overview'), api.get('/admin/invoices', { params })]);
      setOverview(o.data);
      setInvoices(inv.data);
    } catch {
      toast.error('Failed to load billing');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [filter]);

  const pay = async (id) => {
    try {
      await api.post(`/admin/invoices/${id}/pay`);
      toast.success('Invoice marked paid');
      load();
    } catch {
      toast.error('Failed to mark paid');
    }
  };

  const c = overview?.currency || 'INR';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Billing</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Revenue, margin and client invoices</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Revenue (this month)" value={formatCurrency(overview?.revenue.thisMonth, c)} icon={BanknotesIcon} tint="green" />
        <StatCard label="Margin (this month)" value={formatCurrency(overview?.margin.thisMonth, c)} icon={ArrowTrendingUpIcon} tint="purple" />
        <StatCard label={`Outstanding${overview?.overdueCount ? ` · ${overview.overdueCount} overdue` : ''}`} value={formatCurrency(overview?.outstanding, c)} icon={ClockIcon} tint="orange" />
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Invoices</h3>
          <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
            {FILTERS.map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${filter === f ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}>
                {f.toLowerCase()}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading…</div>
        ) : invoices.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No invoices</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-left text-slate-500">
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="px-5 py-3 font-medium">Period</th>
                  <th className="px-5 py-3 font-medium text-right">Total</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Due</th>
                  <th className="px-5 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-900 dark:text-white">{inv.user?.username}</p>
                      <p className="text-xs text-slate-400">{inv.user?.email}</p>
                    </td>
                    <td className="px-5 py-3">{monthLabel(inv.periodStart)}</td>
                    <td className="px-5 py-3 text-right font-medium">{formatCurrency(inv.total, c)}</td>
                    <td className="px-5 py-3"><span className={`badge ${invoiceBadge(inv.status)}`}>{inv.status.toLowerCase()}</span></td>
                    <td className="px-5 py-3 text-slate-400 text-xs">{new Date(inv.dueDate).toLocaleDateString('en-IN')}</td>
                    <td className="px-5 py-3 text-right">
                      {inv.status !== 'PAID' && inv.status !== 'VOID' && (
                        <button onClick={() => pay(inv.id)} className="text-xs btn-primary py-1.5 px-3">Mark paid</button>
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
  );
}

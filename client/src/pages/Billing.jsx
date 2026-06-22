import { useEffect, useState } from 'react';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { formatCurrency } from '../utils/formatters';

const invoiceBadge = (status) => ({
  ISSUED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  PAID:   'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  OVERDUE:'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  VOID:   'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
}[status] || 'bg-slate-100 text-slate-600');

const monthLabel = (d) => new Date(d).toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });

export default function Billing() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/billing')
      .then((r) => setData(r.data))
      .catch(() => toast.error('Failed to load billing'))
      .finally(() => setLoading(false));
  }, []);

  const c = data?.currency || 'INR';
  const usageOn = data?.usageBilling !== false;
  const limitRemaining = data?.creditLimit != null ? Math.max(0, data.creditLimit - data.outstanding) : null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Billing</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          {usageOn
            ? 'Usage-based monthly billing — invoiced each calendar month'
            : 'Fixed monthly plan — invoiced each calendar month'}
        </p>
      </div>

      {loading ? (
        <div className="card p-6 h-28 animate-pulse" />
      ) : (
        <>
          {data?.blocked && (
            <div className="card p-4 border-l-4 border-red-500 bg-red-50/60 dark:bg-red-900/10 text-sm text-slate-700 dark:text-slate-200">
              {data.hasOverdue
                ? 'Sending is paused — you have an unpaid invoice past its due date. Please settle it to resume.'
                : 'Sending is paused — you have reached your credit limit. Please clear your outstanding balance.'}
            </div>
          )}

          {/* Current cycle */}
          <div className="card p-6">
            <h2 className="font-semibold mb-4 text-slate-800 dark:text-slate-100">This billing cycle</h2>
            {usageOn ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(data?.currentUsage, c)}</p>
                    <p className="text-slate-500">Usage so far</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(data?.monthlyFee, c)}</p>
                    <p className="text-slate-500">Plan fee</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-whatsapp-teal dark:text-whatsapp-green">{formatCurrency(data?.projectedTotal, c)}</p>
                    <p className="text-slate-500">Projected total</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      {data?.creditLimit != null ? formatCurrency(limitRemaining, c) : '∞'}
                    </p>
                    <p className="text-slate-500">Credit remaining</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-4">
                  Usage is billed at the end of each calendar month. Outstanding (incl. unpaid invoices): <strong>{formatCurrency(data?.outstanding, c)}</strong>.
                </p>
              </>
            ) : (
              <>
                <p className="text-3xl font-bold text-whatsapp-teal dark:text-whatsapp-green">{formatCurrency(data?.monthlyFee, c)}</p>
                <p className="text-slate-500 text-sm">Monthly plan fee</p>
                <p className="text-xs text-slate-400 mt-4">
                  You&apos;re on a fixed monthly plan, invoiced each calendar month. There are no per-message
                  charges here — messaging is billed to you directly by WhatsApp (Meta).
                </p>
              </>
            )}
          </div>

          {/* Invoice history */}
          <div className="card p-5">
            <h3 className="font-semibold mb-4 text-slate-800 dark:text-slate-100">Invoices</h3>
            {data?.invoices?.length === 0 ? (
              <p className="text-sm text-slate-400 flex items-center gap-2"><DocumentTextIcon className="w-4 h-4" /> No invoices yet — your first one is issued at month end.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-left text-slate-500">
                      <th className="pb-2 font-medium">Period</th>
                      <th className="pb-2 font-medium text-right">Plan</th>
                      {usageOn && <th className="pb-2 font-medium text-right">Usage</th>}
                      <th className="pb-2 font-medium text-right">Total</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {data?.invoices?.map((inv) => (
                      <tr key={inv.id}>
                        <td className="py-2 font-medium">{monthLabel(inv.periodStart)}</td>
                        <td className="py-2 text-right text-slate-500">{formatCurrency(inv.planFee, c)}</td>
                        {usageOn && <td className="py-2 text-right text-slate-500">{formatCurrency(inv.usageAmount, c)}</td>}
                        <td className="py-2 text-right font-medium">{formatCurrency(inv.total, c)}</td>
                        <td className="py-2"><span className={`badge ${invoiceBadge(inv.status)}`}>{inv.status.toLowerCase()}</span></td>
                        <td className="py-2 text-slate-400 text-xs">{new Date(inv.dueDate).toLocaleDateString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import {
  BanknotesIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  ReceiptPercentIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../api/axios';
import StatCard from '../components/StatCard';
import LineChart from '../components/charts/LineChart';
import PieChart from '../components/charts/PieChart';
import { formatCurrency } from '../utils/formatters';

export default function Costs() {
  const [summary, setSummary] = useState(null);
  const [byCategory, setByCategory] = useState([]);
  const [trend, setTrend] = useState([]);
  const [budget, setBudget] = useState(null);
  const [usageBilling, setUsageBilling] = useState(true);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [s, bc, tr, bg, pr] = await Promise.all([
        api.get('/costs/summary'),
        api.get('/costs/by-category'),
        api.get('/costs/trend', { params: { days } }),
        api.get('/costs/budget'),
        api.get('/platform/pricing'),
      ]);
      setSummary(s.data);
      setByCategory(bc.data);
      setTrend(tr.data);
      setBudget(bg.data);
      setUsageBilling(pr.data.usageBillingEnabled !== false);
    } catch {
      toast.error('Failed to load cost data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [days]);

  const currency = summary?.currency || 'INR';
  const budgetPct = budget?.pct != null ? Math.round(budget.pct * 100) : null;
  const overBudget = budget?.pct != null && budget.pct >= 1;
  const nearBudget = budget?.pct != null && budget.pct >= 0.8 && budget.pct < 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Costs</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Estimated WhatsApp messaging spend based on your rate card
          </p>
        </div>
        <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                days === d
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-5 h-24 animate-pulse" />
          ))}
        </div>
      ) : !usageBilling ? (
        <div className="card p-6">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">You&apos;re on a fixed monthly plan</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            There are no per-message charges on your account — you pay a fixed monthly fee. Messaging costs
            are billed to you directly by WhatsApp (Meta). See your monthly fee and invoices under{' '}
            <a href="/billing" className="text-whatsapp-teal dark:text-whatsapp-green font-medium">Billing</a>.
          </p>
        </div>
      ) : (
        <>
          {/* Budget alert */}
          {(nearBudget || overBudget) && (
            <div className={`card p-4 border-l-4 flex items-start gap-3 ${
              overBudget
                ? 'border-l-red-500 bg-red-50/60 dark:bg-red-900/10'
                : 'border-l-orange-500 bg-orange-50/60 dark:bg-orange-900/10'
            }`}>
              <ExclamationTriangleIcon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${overBudget ? 'text-red-500' : 'text-orange-500'}`} />
              <div className="text-sm">
                <p className="font-semibold text-slate-900 dark:text-white">
                  {overBudget ? 'Monthly budget exceeded' : 'Approaching monthly budget'}
                </p>
                <p className="text-slate-600 dark:text-slate-300">
                  {formatCurrency(budget.spend, currency)} of {formatCurrency(budget.budget, currency)} used
                  {budgetPct != null && ` (${budgetPct}%)`}.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Spend Today" value={formatCurrency(summary?.today, currency)} icon={BanknotesIcon} tint="green" />
            <StatCard label="Spend This Month" value={formatCurrency(summary?.month, currency)} icon={CalendarDaysIcon} tint="orange" />
            <StatCard label="Billable Messages" value={summary?.billableCount ?? 0} icon={ChatBubbleLeftRightIcon} tint="blue" />
            <StatCard label="Avg / Message" value={formatCurrency(summary?.avgPerMsg, currency)} icon={ReceiptPercentIcon} tint="purple" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <LineChart
              title="Daily Spend"
              data={trend}
              lines={[{ key: 'spend', color: '#25D366', name: 'Spend' }]}
            />
            <PieChart title="Spend by Category (this month)" data={byCategory} />
          </div>

          {/* Category breakdown table */}
          <div className="card p-5">
            <h3 className="font-semibold mb-4 text-gray-800 dark:text-gray-100">Cost by Category (this month)</h3>
            {byCategory.length === 0 ? (
              <p className="text-gray-400 text-sm">No billable messages yet this month</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700">
                      <th className="pb-2 text-left font-medium text-gray-500">Category</th>
                      <th className="pb-2 text-right font-medium text-gray-500">Messages</th>
                      <th className="pb-2 text-right font-medium text-gray-500">Spend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {byCategory.map((row) => (
                      <tr key={row.name}>
                        <td className="py-2 font-medium capitalize">{row.name}</td>
                        <td className="py-2 text-right text-gray-500">{row.count}</td>
                        <td className="py-2 text-right font-medium">{formatCurrency(row.value, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-500">
            Costs are estimates from your editable rate card (Settings → Pricing &amp; Budget), captured per
            message as WhatsApp reports it. Messages sent before cost tracking was enabled aren&apos;t included.
          </p>
        </>
      )}
    </div>
  );
}

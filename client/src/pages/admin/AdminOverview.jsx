import { useEffect, useState } from 'react';
import {
  UsersIcon, NoSymbolIcon, ChatBubbleLeftRightIcon,
  BanknotesIcon, ArrowTrendingUpIcon, ClockIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import StatCard from '../../components/StatCard';
import { formatCurrency } from '../../utils/formatters';

export default function AdminOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/overview')
      .then((r) => setData(r.data))
      .catch(() => toast.error('Failed to load overview'))
      .finally(() => setLoading(false));
  }, []);

  const c = data?.currency || 'INR';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Overview</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Platform-wide performance and revenue</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="card p-5 h-24 animate-pulse" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard label="Total Clients" value={data?.customers.total} icon={UsersIcon} tint="green" />
            <StatCard label="Suspended" value={data?.customers.suspended} icon={NoSymbolIcon} tint="orange" />
            <StatCard label="Messages (this month)" value={data?.messages.thisMonth} icon={ChatBubbleLeftRightIcon} tint="blue" />
            <StatCard label="Revenue (this month)" value={formatCurrency(data?.revenue.thisMonth, c)} icon={BanknotesIcon} tint="green" />
            <StatCard label="Margin (this month)" value={formatCurrency(data?.margin.thisMonth, c)} icon={ArrowTrendingUpIcon} tint="purple" />
            <StatCard
              label={`Outstanding${data?.overdueCount ? ` · ${data.overdueCount} overdue` : ''}`}
              value={formatCurrency(data?.outstanding, c)}
              icon={ClockIcon}
              tint="orange"
            />
          </div>

          <div className="card p-5">
            <h3 className="font-semibold mb-4 text-slate-800 dark:text-slate-100">All-time</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{data?.messages.allTime}</p>
                <p className="text-slate-500">Messages</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(data?.revenue.allTime, c)}</p>
                <p className="text-slate-500">Revenue</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(data?.metaCost.allTime, c)}</p>
                <p className="text-slate-500">Meta cost</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-whatsapp-teal dark:text-whatsapp-green">{formatCurrency(data?.margin.allTime, c)}</p>
                <p className="text-slate-500">Margin</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

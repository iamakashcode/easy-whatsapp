import { useEffect, useState } from 'react';
import {
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  InboxIcon,
  BanknotesIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import api from '../api/axios';
import toast from 'react-hot-toast';
import StatCard from '../components/StatCard';
import { formatCurrency } from '../utils/formatters';
import { useAuth } from '../hooks/useAuth';

const statusColors = {
  sent:      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  delivered: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  read:      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  failed:    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

export default function Dashboard() {
  const { usageBilling } = useAuth();
  const [summary, setSummary] = useState(null);
  const [cost, setCost] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      // Only fetch spend when clients are billed per message.
      const reqs = [api.get('/analytics/summary')];
      if (usageBilling) reqs.push(api.get('/costs/summary'));
      const [s, c] = await Promise.all(reqs);
      setSummary(s.data);
      if (c) setCost(c.data);
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [usageBilling]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Overview of your WhatsApp activity</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-5 h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Contacts" value={summary?.totalContacts} icon={UserGroupIcon} tint="green" />
            <StatCard label="Sent Today" value={summary?.sentToday} icon={ChatBubbleLeftRightIcon} tint="blue" />
            <StatCard label="Received Today" value={summary?.receivedToday} icon={InboxIcon} tint="purple" />
            {usageBilling ? (
              <StatCard
                label="Spend This Month"
                value={cost ? formatCurrency(cost.month, cost.currency) : '—'}
                icon={BanknotesIcon}
                tint="orange"
              />
            ) : (
              <StatCard label="Total Messages" value={summary?.totalMessages} icon={CheckCircleIcon} tint="orange" />
            )}
          </div>

          {/* Delivery stats */}
          <div className="card p-5">
            <h2 className="font-semibold mb-4 text-gray-800 dark:text-gray-100">Delivery Statistics</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(summary?.deliveryStats || {}).map(([status, count]) => (
                <div key={status} className={`rounded-xl p-3 text-center ${statusColors[status]}`}>
                  <p className="text-xl font-bold">{count}</p>
                  <p className="text-xs font-medium capitalize">{status}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent activity */}
          <div className="card p-5">
            <h2 className="font-semibold mb-4 text-gray-800 dark:text-gray-100">Recent Activity</h2>
            {summary?.recentActivity?.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No recent messages</p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {summary?.recentActivity?.map((msg) => (
                  <div key={msg.id} className="flex items-center gap-3 py-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${msg.direction === 'INBOUND' ? 'bg-green-500' : 'bg-blue-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {msg.contact?.name || msg.contact?.phone}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{msg.body}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`badge ${statusColors[msg.status]}`}>{msg.status}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

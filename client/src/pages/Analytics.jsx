import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import LineChart from '../components/charts/LineChart';
import PieChart from '../components/charts/PieChart';

export default function Analytics() {
  const [perDay, setPerDay]           = useState([]);
  const [delivery, setDelivery]       = useState([]);
  const [active, setActive]           = useState([]);
  const [failed, setFailed]           = useState({ data: [], total: 0 });
  const [days, setDays]               = useState(7);
  const [loading, setLoading]         = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [pd, ds, ac, fm] = await Promise.all([
        api.get('/analytics/messages-per-day', { params: { days } }),
        api.get('/analytics/delivery-stats'),
        api.get('/analytics/active-contacts'),
        api.get('/analytics/failed-messages', { params: { limit: 10 } }),
      ]);
      setPerDay(pd.data);
      setDelivery(ds.data);
      setActive(ac.data);
      setFailed(fm.data);
    } catch {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [days]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Message performance and trends</p>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-4 h-72 animate-pulse bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <LineChart
              title="Messages per Day"
              data={perDay}
              lines={[
                { key: 'sent', color: '#25D366', name: 'Sent' },
                { key: 'received', color: '#128C7E', name: 'Received' },
              ]}
            />
            <PieChart
              title="Delivery Rate"
              data={delivery}
            />
          </div>

          {/* Most active contacts */}
          <div className="card p-5">
            <h3 className="font-semibold mb-4">Most Active Contacts</h3>
            {active.length === 0 ? (
              <p className="text-gray-400 text-sm">No data yet</p>
            ) : (
              <div className="space-y-2">
                {active.map(({ contact, messageCount }, i) => (
                  <div key={contact?.id || i} className="flex items-center gap-3">
                    <span className="w-6 text-xs font-bold text-gray-400">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate">{contact?.name || 'Unknown'}</span>
                        <span className="text-xs text-gray-500 ml-2 flex-shrink-0">{messageCount} msgs</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-whatsapp-green rounded-full"
                          style={{ width: `${(messageCount / active[0].messageCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Failed messages log */}
          <div className="card p-5">
            <h3 className="font-semibold mb-4">Failed Messages Log {failed.total > 0 && <span className="text-red-500 text-sm ml-1">({failed.total})</span>}</h3>
            {failed.data?.length === 0 ? (
              <p className="text-gray-400 text-sm">No failed messages 🎉</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700">
                      <th className="pb-2 text-left font-medium text-gray-500">Contact</th>
                      <th className="pb-2 text-left font-medium text-gray-500">Message</th>
                      <th className="pb-2 text-left font-medium text-gray-500">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {failed.data?.map((msg) => (
                      <tr key={msg.id}>
                        <td className="py-2 font-medium">{msg.contact?.name}</td>
                        <td className="py-2 text-gray-500 truncate max-w-[200px]">{msg.body}</td>
                        <td className="py-2 text-gray-400 text-xs">{new Date(msg.createdAt).toLocaleString()}</td>
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

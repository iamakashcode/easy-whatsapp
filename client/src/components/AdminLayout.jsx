import { NavLink, useNavigate } from 'react-router-dom';
import {
  ChartPieIcon,
  UsersIcon,
  BanknotesIcon,
  CurrencyRupeeIcon,
  ArrowRightOnRectangleIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';

const navItems = [
  { to: '/admin',          label: 'Overview',         icon: ChartPieIcon, end: true },
  { to: '/admin/clients',  label: 'Clients',          icon: UsersIcon },
  { to: '/admin/billing',  label: 'Billing',          icon: BanknotesIcon },
  { to: '/admin/pricing',  label: 'Platform Pricing', icon: CurrencyRupeeIcon },
];

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950">
      <aside className="w-60 flex flex-col bg-slate-900 text-slate-200 border-r border-slate-800">
        <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-whatsapp-green to-whatsapp-teal flex items-center justify-center font-bold text-white">A</div>
          <div>
            <p className="font-bold text-white leading-tight">Admin Console</p>
            <p className="text-[11px] text-slate-400">Platform Manager</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? 'bg-whatsapp-green/15 text-whatsapp-green' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-slate-800 space-y-1">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <ArrowTopRightOnSquareIcon className="w-5 h-5" /> Customer view
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" /> Log out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <h2 className="font-semibold text-slate-900 dark:text-white">Platform Administration</h2>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {user?.email} <span className="badge bg-whatsapp-green/10 text-whatsapp-teal dark:text-whatsapp-green ml-2">Admin</span>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

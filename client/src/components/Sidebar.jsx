import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  HomeIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  InboxIcon,
  DocumentTextIcon,
  MegaphoneIcon,
  ChartBarIcon,
  BanknotesIcon,
  CreditCardIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

const navItems = [
  { to: '/dashboard',  label: 'Dashboard',    icon: HomeIcon },
  { to: '/contacts',   label: 'Contacts',     icon: UserGroupIcon },
  { to: '/messages',   label: 'Send Message', icon: ChatBubbleLeftRightIcon },
  { to: '/inbox',      label: 'Inbox',        icon: InboxIcon },
  { to: '/templates',  label: 'Templates',    icon: DocumentTextIcon },
  { to: '/broadcast',  label: 'Broadcast',    icon: MegaphoneIcon },
  { to: '/analytics',  label: 'Analytics',    icon: ChartBarIcon },
  { to: '/costs',      label: 'Costs',        icon: BanknotesIcon },
  { to: '/billing',    label: 'Billing',      icon: CreditCardIcon },
  { to: '/settings',   label: 'Settings',     icon: Cog6ToothIcon },
];

export default function Sidebar({ open, onClose }) {
  const { usageBilling } = useAuth();
  // Hide the per-message Costs page when usage billing is off (clients pay only the monthly fee).
  const items = navItems.filter((it) => it.to !== '/costs' || usageBilling);
  return (
    <>
      {/* Overlay on mobile */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-30 w-64 flex flex-col
          bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-slate-200/80 dark:border-slate-800
          transform transition-transform duration-200
          ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-200/80 dark:border-slate-800">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-whatsapp-green to-whatsapp-teal flex items-center justify-center shadow-glow">
            <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-white leading-tight tracking-tight">WA Dashboard</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">Business Manager</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-600">Menu</p>
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard'}
              onClick={onClose}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-whatsapp-green/10 text-whatsapp-teal dark:text-whatsapp-green'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full bg-whatsapp-green transition-all duration-200 ${isActive ? 'h-5 opacity-100' : 'h-0 opacity-0'}`} />
                  <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-whatsapp-green' : 'group-hover:text-slate-700 dark:group-hover:text-slate-200'}`} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer hint */}
        <div className="px-5 py-3 border-t border-slate-200/80 dark:border-slate-800">
          <p className="text-[11px] text-slate-400 dark:text-slate-600">v1.0 · Connected to Meta</p>
        </div>
      </aside>
    </>
  );
}

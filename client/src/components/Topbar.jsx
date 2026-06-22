import { Bars3Icon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import ThemeToggle from './ThemeToggle';

export default function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 flex items-center justify-between px-4 lg:px-6 border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl flex-shrink-0 sticky top-0 z-10">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <Bars3Icon className="w-5 h-5" />
      </button>

      <div className="hidden lg:block" />

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
        <div className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-whatsapp-green to-whatsapp-teal flex items-center justify-center text-white text-xs font-bold shadow-sm">
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 hidden sm:block">
            {user?.username}
          </span>
        </div>
        <button
          onClick={logout}
          className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          title="Logout"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}

import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import AccountBanner from './AccountBanner';

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <AccountBanner />
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        {/* Subtle brand-tinted backdrop for a modern, layered feel */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-whatsapp-green/[0.04] to-transparent dark:from-whatsapp-green/[0.06]">
          <div key={pathname} className="p-4 lg:p-6 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

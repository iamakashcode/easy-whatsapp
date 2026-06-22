import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { BRAND } from '../config/brand';

const nav = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-whatsapp-green to-whatsapp-teal flex items-center justify-center">
        <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347Z"/>
        </svg>
      </div>
      <span className="font-bold text-slate-900 dark:text-white text-lg tracking-tight">{BRAND.name}</span>
    </Link>
  );
}

export default function PublicLayout({ children }) {
  const [open, setOpen] = useState(false);
  const linkCls = ({ isActive }) =>
    `text-sm font-medium transition-colors ${isActive ? 'text-whatsapp-teal dark:text-whatsapp-green' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}`;

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-950/80 backdrop-blur border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Logo />
          <nav className="hidden sm:flex items-center gap-7">
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={linkCls}>{n.label}</NavLink>
            ))}
            <Link to="/login" className="btn-primary text-sm py-2">Log in</Link>
          </nav>
          <button className="sm:hidden p-2 text-slate-600 dark:text-slate-300" onClick={() => setOpen((o) => !o)}>
            {open ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
          </button>
        </div>
        {open && (
          <div className="sm:hidden border-t border-slate-100 dark:border-slate-800 px-4 py-3 space-y-2">
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setOpen(false)} className="block py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">{n.label}</NavLink>
            ))}
            <Link to="/login" onClick={() => setOpen(false)} className="btn-primary text-sm w-full justify-center mt-2">Log in</Link>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid gap-8 sm:grid-cols-3">
          <div>
            <Logo />
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 max-w-xs">{BRAND.tagline}</p>
            <p className="text-xs text-slate-400 mt-3">A sub-brand of <span className="font-semibold text-slate-600 dark:text-slate-300">{BRAND.parent}</span>.</p>
          </div>
          <div>
            <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 mb-3">Pages</p>
            <ul className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
              {nav.map((n) => <li key={n.to}><Link to={n.to} className="hover:text-whatsapp-teal dark:hover:text-whatsapp-green">{n.label}</Link></li>)}
              <li><Link to="/login" className="hover:text-whatsapp-teal dark:hover:text-whatsapp-green">Log in</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 mb-3">Contact</p>
            <ul className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
              <li><a href={`mailto:${BRAND.email}`} className="hover:text-whatsapp-teal dark:hover:text-whatsapp-green">{BRAND.email}</a></li>
              <li><a href={`tel:${BRAND.phone.replace(/[^\d+]/g, '')}`} className="hover:text-whatsapp-teal dark:hover:text-whatsapp-green">{BRAND.phone}</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-100 dark:border-slate-800 py-4 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} {BRAND.name} — a sub-brand of {BRAND.parent}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

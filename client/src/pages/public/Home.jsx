import { Link } from 'react-router-dom';
import {
  MegaphoneIcon, DocumentTextIcon, ChartBarSquareIcon,
  BanknotesIcon, ShieldCheckIcon, BoltIcon,
} from '@heroicons/react/24/outline';
import { BRAND } from '../../config/brand';

const features = [
  { icon: MegaphoneIcon, title: 'Bulk & broadcast', desc: 'Send approved WhatsApp templates to hundreds of customers in one click.' },
  { icon: DocumentTextIcon, title: 'Message templates', desc: 'Reusable, personalised templates with dynamic fields — fully managed and approved.' },
  { icon: ChartBarSquareIcon, title: 'Delivery reports', desc: 'See exactly who received, read, or missed each broadcast, with reasons for failures.' },
  { icon: BanknotesIcon, title: 'Simple billing', desc: 'A clear monthly plan — no surprises. We handle the setup; you just message.' },
  { icon: ShieldCheckIcon, title: 'Official WhatsApp API', desc: 'Built on the official WhatsApp Business Platform — reliable and compliant.' },
  { icon: BoltIcon, title: 'Done for you', desc: 'We set up your number, templates and dashboard so you can start fast.' },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-whatsapp-green/[0.06] to-transparent" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
          <span className="inline-block text-xs font-semibold tracking-wide uppercase text-whatsapp-teal dark:text-whatsapp-green bg-whatsapp-green/10 rounded-full px-3 py-1 mb-5">
            WhatsApp Business Platform
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 dark:text-white max-w-3xl mx-auto leading-tight">
            Reach your customers on WhatsApp — <span className="text-whatsapp-teal dark:text-whatsapp-green">fully managed</span>.
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-300 mt-5 max-w-2xl mx-auto">
            {BRAND.description}
          </p>
          <div className="flex items-center justify-center gap-3 mt-8 flex-wrap">
            <Link to="/contact" className="btn-primary px-6 py-3 text-base">Get started</Link>
            <Link to="/about" className="px-6 py-3 text-base font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Learn more
            </Link>
          </div>
          <p className="text-xs text-slate-400 mt-4">A sub-brand of {BRAND.parent}.</p>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Everything you need to message at scale</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-xl mx-auto">From broadcasts to billing — we handle the hard parts so you can focus on your customers.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-slate-100 dark:border-slate-800 p-6 hover:shadow-sm transition-shadow bg-white dark:bg-slate-900">
              <div className="w-11 h-11 rounded-xl bg-whatsapp-green/10 flex items-center justify-center mb-4">
                <f.icon className="w-6 h-6 text-whatsapp-teal dark:text-whatsapp-green" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white">{f.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <div className="rounded-3xl bg-gradient-to-br from-whatsapp-teal to-whatsapp-green p-10 sm:p-14 text-center text-white">
          <h2 className="text-2xl sm:text-3xl font-bold">Ready to grow with WhatsApp?</h2>
          <p className="text-white/90 mt-3 max-w-xl mx-auto">Tell us about your business and we'll get you set up — number, templates and dashboard included.</p>
          <Link to="/contact" className="inline-block mt-7 bg-white text-whatsapp-teal font-semibold px-6 py-3 rounded-xl hover:bg-white/90 transition-colors">
            Contact us
          </Link>
        </div>
      </section>
    </>
  );
}

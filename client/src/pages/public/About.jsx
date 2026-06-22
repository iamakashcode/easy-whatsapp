import { Link } from 'react-router-dom';
import { BRAND } from '../../config/brand';

export default function About() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
      <span className="text-xs font-semibold tracking-wide uppercase text-whatsapp-teal dark:text-whatsapp-green">About us</span>
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white mt-2">
        About {BRAND.name}
      </h1>

      <div className="prose prose-slate dark:prose-invert max-w-none mt-6 space-y-5 text-slate-600 dark:text-slate-300 leading-relaxed">
        <p>
          <strong>{BRAND.name}</strong> is a <strong>sub-brand of {BRAND.parent}</strong>, created to help
          businesses reach their customers on WhatsApp without the technical hassle.
        </p>
        <p>
          {BRAND.parent} is a website-design and digital agency. {BRAND.name} extends that work into
          messaging — we set up the official WhatsApp Business Platform for you, build and get your message
          templates approved, and give you a simple dashboard to send broadcasts, track delivery, and manage
          your contacts.
        </p>
        <p>
          Our goal is simple: make WhatsApp marketing <strong>easy, reliable, and fully managed</strong>, so
          you can focus on running your business while we handle the setup and the technical details.
        </p>
      </div>

      {/* What we do */}
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {[
          { t: 'Fully managed setup', d: 'We connect your WhatsApp number, configure everything, and hand you a ready-to-use dashboard.' },
          { t: 'Broadcasts & templates', d: 'Send approved templates to many customers at once, with personalisation.' },
          { t: 'Delivery insight', d: 'Know who received and read each message — and why any failed.' },
          { t: 'Straightforward billing', d: 'A clear monthly plan with no hidden costs.' },
        ].map((x) => (
          <div key={x.t} className="rounded-2xl border border-slate-100 dark:border-slate-800 p-5 bg-white dark:bg-slate-900">
            <h3 className="font-semibold text-slate-900 dark:text-white">{x.t}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">{x.d}</p>
          </div>
        ))}
      </div>

      <div className="mt-10">
        <Link to="/contact" className="btn-primary px-6 py-3">Get in touch</Link>
      </div>
    </div>
  );
}

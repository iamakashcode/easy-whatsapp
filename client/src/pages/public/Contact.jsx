import { EnvelopeIcon, PhoneIcon, ClockIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { BRAND, telHref, waHref, mailHref } from '../../config/brand';

export default function Contact() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
      <span className="text-xs font-semibold tracking-wide uppercase text-whatsapp-teal dark:text-whatsapp-green">Contact</span>
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white mt-2">Get in touch</h1>
      <p className="text-slate-500 dark:text-slate-400 mt-3 max-w-xl">
        Have a question or want to get set up on WhatsApp? Reach us directly — no forms, just call, message or email.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 mt-8">
        {/* Email */}
        <a href={mailHref(BRAND.email)} className="rounded-2xl border border-slate-100 dark:border-slate-800 p-6 bg-white dark:bg-slate-900 hover:border-whatsapp-green/40 hover:shadow-sm transition-all block">
          <div className="w-11 h-11 rounded-xl bg-whatsapp-green/10 flex items-center justify-center mb-4">
            <EnvelopeIcon className="w-6 h-6 text-whatsapp-teal dark:text-whatsapp-green" />
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-white">Email</h3>
          <p className="text-sm text-whatsapp-teal dark:text-whatsapp-green mt-1 break-all">{BRAND.email}</p>
        </a>

        {/* Phone */}
        <a href={telHref(BRAND.phone)} className="rounded-2xl border border-slate-100 dark:border-slate-800 p-6 bg-white dark:bg-slate-900 hover:border-whatsapp-green/40 hover:shadow-sm transition-all block">
          <div className="w-11 h-11 rounded-xl bg-whatsapp-green/10 flex items-center justify-center mb-4">
            <PhoneIcon className="w-6 h-6 text-whatsapp-teal dark:text-whatsapp-green" />
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-white">Phone</h3>
          <p className="text-sm text-whatsapp-teal dark:text-whatsapp-green mt-1">{BRAND.phone}</p>
        </a>

        {/* WhatsApp */}
        <a href={waHref(BRAND.whatsapp)} target="_blank" rel="noreferrer" className="rounded-2xl border border-slate-100 dark:border-slate-800 p-6 bg-white dark:bg-slate-900 hover:border-whatsapp-green/40 hover:shadow-sm transition-all block">
          <div className="w-11 h-11 rounded-xl bg-whatsapp-green/10 flex items-center justify-center mb-4">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-whatsapp-teal dark:text-whatsapp-green">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347Z"/>
            </svg>
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-white">WhatsApp</h3>
          <p className="text-sm text-whatsapp-teal dark:text-whatsapp-green mt-1">{BRAND.whatsapp}</p>
        </a>

        {/* Hours / address */}
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 p-6 bg-white dark:bg-slate-900">
          <div className="w-11 h-11 rounded-xl bg-whatsapp-green/10 flex items-center justify-center mb-4">
            <ClockIcon className="w-6 h-6 text-whatsapp-teal dark:text-whatsapp-green" />
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-white">Hours</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{BRAND.hours}</p>
          {BRAND.address && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5">
              <MapPinIcon className="w-4 h-4" /> {BRAND.address}
            </p>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-400 mt-8">{BRAND.name} is a sub-brand of {BRAND.parent}.</p>
    </div>
  );
}

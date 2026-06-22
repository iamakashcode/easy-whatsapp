const TINTS = {
  green:  'bg-whatsapp-green/10 text-whatsapp-teal dark:text-whatsapp-green',
  blue:   'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
};

export default function StatCard({ label, value, icon: Icon, tint }) {
  return (
    <div className="card card-interactive p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${TINTS[tint] || TINTS.green}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{value ?? '—'}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </div>
  );
}

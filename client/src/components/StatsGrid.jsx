import { money } from '../utils/format.js';

function Stat({ label, value }) {
  return (
    <article className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-5">
      <span className="text-xs text-ink-muted">{label}</span>
      <strong className="font-display text-xl font-bold sm:text-2xl">{value}</strong>
    </article>
  );
}

export default function StatsGrid({ office, employee, refills }) {
  return (
    <section className="mb-4 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
      <Stat label="Office monthly budget" value={office ? money(office.monthlyBudget, office.currency) : '—'} />
      <Stat label="Open / offered tasks" value={refills.filter(r => ['OPEN', 'OFFERED'].includes(r.status)).length} />
      <Stat label="Awaiting HR" value={refills.filter(r => r.status === 'SUBMITTED').length} />
      <Stat label="Current volunteer" value={employee?.name || '—'} />
    </section>
  );
}

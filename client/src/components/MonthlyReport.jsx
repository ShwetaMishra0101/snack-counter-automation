import { money } from '../utils/format.js';

export default function MonthlyReport({ report }) {
  return (
    <section className="mb-4 rounded-2xl border border-line bg-white p-5">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[1.5px] text-forest-600">
        Management report
      </p>
      <h2 className="font-display text-xl font-bold">Monthly spending overview</h2>
      {report && (
        <>
          <div className="my-4 flex items-center justify-between rounded-xl bg-forest-50 p-4">
            <span className="text-xs text-ink-muted">Combined spend (INR equivalent)</span>
            <strong className="font-display text-2xl font-extrabold">{money(report.totalINR, 'INR')}</strong>
          </div>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {report.officeTotals.map(x => (
              <article key={x._id} className="flex flex-col gap-1.5 rounded-2xl border border-line bg-white p-5">
                <span className="text-xs text-ink-muted">{x._id} spending</span>
                <strong className="font-display text-xl font-bold">{money(x.total, x._id)}</strong>
                <small className="text-ink-muted">{x.count} submitted / completed claims</small>
              </article>
            ))}
            {!report.officeTotals.length && (
              <p className="text-sm text-ink-muted">No spending recorded this month yet.</p>
            )}
          </div>
          <p className="mt-3 text-[11px] text-ink-muted">
            Conversion used: 1 NOK = {report.conversion.NOK_TO_INR} INR. Replace the demo rate with a
            finance-approved monthly rate.
          </p>
        </>
      )}
    </section>
  );
}

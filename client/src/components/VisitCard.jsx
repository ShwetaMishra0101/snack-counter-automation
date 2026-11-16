import { useState } from 'react';

const inputClass =
  'rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-forest-600';

// "Employees sometimes visit the other office for a week or two" — this lets a
// volunteer temporarily join the other office's rotation until a chosen date.
// They buy in that office's currency but are reimbursed in their payroll currency.
export default function VisitCard({ me, offices, busy, onStartVisit, onEndVisit }) {
  const [officeId, setOfficeId] = useState('');
  const [until, setUntil] = useState('');
  if (!me) return null;

  const homeOfficeId = me.officeId?._id || me.officeId;
  const otherOffices = offices.filter(o => o._id !== homeOfficeId);
  const visiting = me.temporaryOfficeId && new Date(me.temporaryOfficeUntil) > new Date();
  const visitingOffice = visiting
    ? (me.temporaryOfficeId?.name || offices.find(o => o._id === me.temporaryOfficeId)?.name)
    : null;
  const minDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  return (
    <section className="mb-4 rounded-2xl border border-line bg-white p-5">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[1.5px] text-forest-600">
        Visiting the other office?
      </p>
      {visiting ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-soft">
            You're in <strong className="text-ink">{visitingOffice}</strong>'s volunteer rotation until{' '}
            <strong className="text-ink">{new Date(me.temporaryOfficeUntil).toLocaleDateString()}</strong>.
            You'll buy in their currency and still be reimbursed in {me.payrollCurrency}.
          </p>
          <button
            disabled={busy}
            onClick={onEndVisit}
            className="rounded-lg bg-mist px-4 py-2.5 text-xs font-semibold text-ink-soft ring-1 ring-line transition hover:bg-forest-50 disabled:opacity-50"
          >
            End visit early
          </button>
        </div>
      ) : (
        <form
          onSubmit={e => { e.preventDefault(); onStartVisit(officeId || otherOffices[0]?._id, until); }}
          className="flex flex-wrap items-end gap-3"
        >
          <label className="flex min-w-44 flex-1 flex-col gap-1.5 text-xs font-semibold text-ink-soft">
            Office you're visiting
            <select className={inputClass} value={officeId || otherOffices[0]?._id || ''} onChange={e => setOfficeId(e.target.value)}>
              {otherOffices.map(o => (
                <option key={o._id} value={o._id}>{o.name} ({o.currency})</option>
              ))}
            </select>
          </label>
          <label className="flex min-w-44 flex-1 flex-col gap-1.5 text-xs font-semibold text-ink-soft">
            Until
            <input type="date" required min={minDate} className={inputClass} value={until} onChange={e => setUntil(e.target.value)} />
          </label>
          <button
            disabled={busy || !until}
            className="rounded-lg bg-forest-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-forest-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Join their rotation
          </button>
          <p className="w-full text-[11px] text-ink-muted">
            While visiting you can refill their box too — paid in their currency, reimbursed in your
            payroll currency ({me.payrollCurrency}).
          </p>
        </form>
      )}
    </section>
  );
}

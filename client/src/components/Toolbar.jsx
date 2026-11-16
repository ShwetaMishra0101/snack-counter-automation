const selectClass =
  'rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-forest-600';

export default function Toolbar({ offices, officeId, busy, onOfficeChange, onReportEmpty }) {
  return (
    <section className="mb-4 flex flex-wrap items-end gap-4 rounded-2xl border border-line bg-white p-5">
      <label className="flex min-w-52 flex-1 flex-col gap-1.5 text-xs font-semibold text-ink-soft">
        Office
        <select className={selectClass} value={officeId} onChange={e => onOfficeChange(e.target.value)}>
          {offices.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
        </select>
      </label>
      <button
        disabled={busy || !officeId}
        onClick={onReportEmpty}
        className="rounded-lg bg-forest-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-forest-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        ＋ Report empty box
      </button>
    </section>
  );
}

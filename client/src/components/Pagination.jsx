const btnClass =
  'flex size-7 text-[24px] items-center justify-center rounded-md text-ink-muted transition hover:bg-mist hover:text-ink disabled:cursor-not-allowed disabled:opacity-30';

export default function Pagination({ total, page, perPage, onPage }) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  const current = Math.min(page, pages);
  const start = total === 0 ? 0 : (current - 1) * perPage + 1;
  const end = Math.min(total, current * perPage);

  return (
    <div className="flex items-center justify-end gap-5 border-t border-line px-2.5 pt-3 text-xs text-ink-muted">
      <span>{start} to {end} of {total}</span>
      <div className="flex items-center gap-1">
        <button className={btnClass} disabled={current <= 1} onClick={() => onPage(1)} aria-label="First page">«</button>
        <button className={btnClass} disabled={current <= 1} onClick={() => onPage(current - 1)} aria-label="Previous page">‹</button>
        <span className="px-2">Page {current} of {pages}</span>
        <button className={btnClass} disabled={current >= pages} onClick={() => onPage(current + 1)} aria-label="Next page">›</button>
        <button className={btnClass} disabled={current >= pages} onClick={() => onPage(pages)} aria-label="Last page">»</button>
      </div>
    </div>
  );
}

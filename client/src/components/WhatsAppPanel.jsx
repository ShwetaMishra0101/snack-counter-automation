import { useState } from 'react';
import { time } from '../utils/format.js';
import Pagination from './Pagination.jsx';

const PER_PAGE = 6;

const KIND_LABELS = {
  OPEN_CALL: 'Refill needed',
  RELEASED: 'Claim released',
  OFFER: 'Refill offer',
  SUBMITTED: 'Claim submitted',
  APPROVED: 'Reimbursed',
  REJECTED: 'Rejected',
  INFO: 'Update'
};

export default function WhatsAppPanel({ notifications = [] }) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(notifications.length / PER_PAGE));
  const current = Math.min(page, pages);
  const visible = notifications.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  return (
    <section className="mb-4 overflow-hidden rounded-2xl ">
      <div className=" space-y-2.5 overflow-y-auto">
        {visible.map(n => (
          <div key={n._id} className="ml-auto rounded-xl rounded-tr-sm bg-[#fff] px-3.5 py-2.5 shadow-sm">
            <div className="mb-1 flex items-center justify-between gap-3">
              <span className="text-[11px] font-bold text-wa-dark">
                To: {n.recipientName || n.to || 'volunteer'}
              </span>
              <span className="rounded-full bg-white/70 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-ink-soft">
                {KIND_LABELS[n.kind] || n.kind}
              </span>
            </div>
            <p className="text-[13px] leading-snug text-ink">{n.body}</p>
            <p className="mt-1 text-right text-[10px] text-ink-muted">
              {time(n.createdAt)} {n.delivered ? '✓✓' : '✗ failed'}
            </p>
          </div>
        ))}
        {!notifications.length && (
          <p className="py-8 text-center text-sm text-ink-muted">
            No messages yet — report an empty box to trigger the first notification.
          </p>
        )}
      </div>
      {notifications.length > 0 && (
        <div className="mt-2 rounded-xl bg-white px-3 pb-3 shadow-sm">
          <Pagination total={notifications.length} page={current} perPage={PER_PAGE} onPage={setPage} />
        </div>
      )}
    </section>
  );
}

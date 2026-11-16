import { useState } from 'react';
import StatusPill from '../components/StatusPill.jsx';
import Pagination from '../components/Pagination.jsx';
import { money, dateTime } from '../utils/format.js';
import { fileUrl } from '../api/client.js';
import ReceiptModal from '../components/ReceiptModal.jsx';

const ACTIVE_STATUSES = ['OPEN', 'OFFERED', 'CLAIMED'];
const CLAIM_STATUSES = ['SUBMITTED', 'REIMBURSED', 'REJECTED'];
const PER_PAGE = 5;

const refNo = r => `#${String(r._id).slice(-5).toUpperCase()}`;

const thClass =
  'border-b border-line bg-mist px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-ink-muted';
const tdClass = 'whitespace-nowrap border-b border-line px-3 py-3.5 align-top';

function InfoBar({ children }) {
  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3.5 text-sm text-sky-900">
      {children}
    </div>
  );
}

function SectionHead({ title, subtitle, children }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="font-display text-xl font-bold">{title}</h2>
        <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

// function ActiveRefillsSection({ refills, busy, onReportEmpty }) {
//   const active = refills.filter(r => ACTIVE_STATUSES.includes(r.status));
//   return (
//     <section className="mb-6 rounded-2xl border border-line bg-white p-5">
//       <SectionHead
//         title="Refills to be actioned"
//         subtitle="Boxes reported empty that are still being offered, or waiting on a purchase"
//       >
//         <button
//           disabled={busy}
//           onClick={onReportEmpty}
//           className="rounded-lg bg-forest-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-forest-800 disabled:opacity-50"
//         >
//           ＋ Report empty box
//         </button>
//       </SectionHead>
//       {active.length === 0 ? (
//         <InfoBar>No active refills to show — the snack box is in good hands.</InfoBar>
//       ) : (
//         <div className="overflow-x-auto">
//           <table className="w-full border-collapse text-left text-xs">
//             <thead>
//               <tr>
//                 {['Refill', 'Reported', 'Status', 'Assigned to', 'Offer expires'].map(h => (
//                   <th key={h} className={thClass}>{h}</th>
//                 ))}
//               </tr>
//             </thead>
//             <tbody>
//               {active.map(r => (
//                 <tr key={r._id}>
//                   <td className={`${tdClass} font-semibold text-forest-700`}>{refNo(r)}</td>
//                   <td className={tdClass}>
//                     {dateTime(r.createdAt)}
//                     <div className="mt-0.5 text-[11px] text-ink-muted">by {r.reportedBy?.name || '—'}</div>
//                   </td>
//                   <td className={tdClass}><StatusPill status={r.status} /></td>
//                   <td className={tdClass}>{r.assignedTo?.name || 'Unassigned'}</td>
//                   <td className={tdClass}>
//                     {r.status === 'OFFERED' && r.claimExpiresAt ? dateTime(r.claimExpiresAt) : '—'}
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       )}
//     </section>
//   );
// }

function ClaimsSection({ refills, busy, isHr, onSimulateApproval, onRefresh }) {
  const [page, setPage] = useState(1);
  const [previewUrl, setPreviewUrl] = useState(null);
  const claims = refills.filter(r => CLAIM_STATUSES.includes(r.status));
  const pages = Math.max(1, Math.ceil(claims.length / PER_PAGE));
  const current = Math.min(page, pages);
  const visible = claims.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <SectionHead
        title="Reimbursement claims in process"
        subtitle="Claims submitted to HR that are approved, rejected or still awaiting a decision"
      >
        <button
          onClick={onRefresh}
          className="rounded-lg bg-mist px-3 py-2 text-xs font-semibold text-ink-soft ring-1 ring-line transition hover:bg-forest-50"
        >
          Refresh
        </button>
      </SectionHead>
      {claims.length === 0 ? (
        <InfoBar>No reimbursement claims to show yet.</InfoBar>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr>
                  {['Claim number', 'Claim', 'Purchase', 'Reimbursement', 'Claim status', 'Submitted by', 'Waiting on', 'Actions'].map(h => (
                    <th key={h} className={thClass}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map(r => (
                  <tr key={r._id}>
                    <td className={`${tdClass} font-semibold text-forest-700`}>{refNo(r)}</td>
                    <td className={tdClass}>
                      <span className="font-medium text-ink">{r.description || 'Snack refill'}</span>
                      <div className="mt-0.5 text-[11px] text-ink-muted">On {new Date(r.updatedAt || r.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                    </td>
                    <td className={tdClass}>
                      <span className="font-semibold text-ink">{money(r.amountOfficeCurrency, r.officeCurrency)}</span>
                      {r.receiptUrl && (
                        <div className="mt-0.5">
                          <button
                            onClick={() => setPreviewUrl(fileUrl(r.receiptUrl))}
                            className="text-[11px] font-semibold text-forest-700 underline hover:text-forest-800"
                          >
                            📎 View receipt
                          </button>
                        </div>
                      )}
                    </td>
                    <td className={tdClass}>
                      {r.reimbursementCurrency} {Number(r.reimbursementAmount || 0).toLocaleString('en-IN')}
                      <div className="mt-0.5 font-mono text-[10px] text-ink-muted">{r.hrClaimId?.slice(0, 13) || '—'}</div>
                    </td>
                    <td className={tdClass}><StatusPill status={r.status} /></td>
                    <td className={tdClass}>
                      {r.assignedTo?.name || '—'}
                      {r.completedAt && (
                        <div className="mt-0.5 text-[11px] text-ink-muted">Decided {new Date(r.completedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                      )}
                    </td>
                    <td className={tdClass}>{r.status === 'SUBMITTED' ? 'HR' : '—'}</td>
                    <td className={tdClass}>
                      {r.status !== 'SUBMITTED' ? '—' : isHr ? (
                        <div className="flex gap-1.5">
                          <button
                            disabled={busy}
                            onClick={() => onSimulateApproval(r._id, 'APPROVED')}
                            className="rounded-md bg-forest-700 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-forest-800 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => onSimulateApproval(r._id, 'REJECTED')}
                            className="rounded-md bg-red-600 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-ink-muted">Awaiting HR</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination total={claims.length} page={current} perPage={PER_PAGE} onPage={setPage} />
        </>
      )}
      <ReceiptModal url={previewUrl} onClose={() => setPreviewUrl(null)} />
    </section>
  );
}

export default function RefillsPage({ officeName, refills, busy, isHr, onRefresh, onSimulateApproval, onReportEmpty }) {
  return (
    <>
      <div className="mb-6">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[1.5px] text-forest-600">
          Work queue
        </p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          Refills — {officeName || '…'}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Every refill task for this office, from report to reimbursement.
        </p>
      </div>
      {/* <ActiveRefillsSection refills={refills} busy={busy} onReportEmpty={onReportEmpty} /> */}
      <ClaimsSection
        refills={refills}
        busy={busy}
        isHr={isHr}
        onSimulateApproval={onSimulateApproval}
        onRefresh={onRefresh}
      />
      {/* {!isHr && (
        <p className="mt-3 text-center text-[11px] text-ink-muted">
          Only HR or admin accounts can approve or reject submitted claims
          (log in as hr@example.com or admin@example.com to try it).
        </p>
      )} */}
    </>
  );
}

import Toolbar from '../components/Toolbar.jsx';
import OfferBanner from '../components/OfferBanner.jsx';
import PurchaseForm from '../components/PurchaseForm.jsx';
import StatsGrid from '../components/StatsGrid.jsx';
import VisitCard from '../components/VisitCard.jsx';
import ProfileCard from '../components/ProfileCard.jsx';

// When the logged-in employee has nothing to do, say who currently holds the
// office's refill so the demo flow is easy to follow.
function ActivityHint({ refills, user }) {
  const inProgress = refills.find(r => ['OFFERED', 'CLAIMED'].includes(r.status) && r.assignedTo);
  // return (
  //   <div className="rounded-2xl border border-dashed border-line bg-white p-5 text-center text-sm text-ink-muted">
  //     {inProgress ? (
  //       <p>
  //         This office's refill is currently {inProgress.status === 'OFFERED' ? 'offered to' : 'claimed by'}{' '}
  //         <strong className="text-ink">{inProgress.assignedTo.name}</strong> — log in as them to
  //         continue the flow.
  //       </p>
  //     ) : (
  //       <p>
  //         No action needed from {user?.name || 'you'} right now. Offers appear here — and on
  //         WhatsApp — when it's your turn to refill.
  //       </p>
  //     )}
  //   </div>
  // );
}

export default function DashboardPage({
  offices, officeId, busy, user, me,
  office, refills, myOffer, offerDirected, myClaim,
  onOfficeChange, onReportEmpty,
  onAccept, onDecline, onRelease, onSubmitPurchase,
  onStartVisit, onEndVisit, onSaveProfile
}) {
  const profileComplete = me?.officeId && me?.payrollCurrency;
  return (
    <>
      <div className="mb-6">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[1.5px] text-forest-600">
          Workplace Operations
        </p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          Hi {user?.name?.split(' ')[0] || 'there'} 👋
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Report an empty box, respond to your refill offers and submit receipts.
        </p>
      </div>
      <ProfileCard me={me} offices={offices} busy={busy} onSave={onSaveProfile} />
      {profileComplete && (
        <>
          <Toolbar
            offices={offices}
            officeId={officeId}
            busy={busy}
            onOfficeChange={onOfficeChange}
            onReportEmpty={onReportEmpty}
          />
          <OfferBanner offer={myOffer} directed={offerDirected} busy={busy} onAccept={onAccept} onDecline={onDecline} />
          <PurchaseForm refill={myClaim} me={me} busy={busy} onSubmit={onSubmitPurchase} />
          {myClaim && (
            <p className="-mt-2 mb-4 text-right text-[11px] text-ink-muted">
              Can't complete this refill?{' '}
              <button onClick={onRelease} disabled={busy} className="font-semibold text-forest-700 underline hover:text-forest-800 disabled:opacity-50">
                Release it
              </button>{' '}
              so another volunteer can take it.
            </p>
          )}
          <StatsGrid office={office} employee={me || user} refills={refills} />
          <VisitCard me={me} offices={offices} busy={busy} onStartVisit={onStartVisit} onEndVisit={onEndVisit} />
          {!myOffer && !myClaim && <ActivityHint refills={refills} user={user} />}
        </>
      )}
    </>
  );
}

export default function OfferBanner({ offer, directed, busy, onAccept, onDecline }) {
  if (!offer) return null;
  return (
    <section className="mb-4 flex flex-col gap-4 rounded-2xl border border-forest-200 bg-forest-50 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[1.5px] text-forest-600">
          {directed ? 'Action required' : 'Snack box empty'}
        </p>
        <h2 className="font-display text-xl font-bold">
          {directed ? 'You have a refill offer' : 'A refill is up for grabs'}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          {directed
            ? 'Nobody volunteered in time, so this one came to you via the rotation. Accept it or decline so it moves on.'
            : 'No one is pre-assigned — the first volunteer to accept buys the refill.'}
          {offer.claimExpiresAt && (
            <> {directed ? 'Expires' : 'Open until'} {new Date(offer.claimExpiresAt).toLocaleString()}.</>
          )}
        </p>
      </div>
      <div className="flex gap-2">
        <button
          disabled={busy}
          onClick={onAccept}
          className="rounded-lg bg-forest-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-forest-800 disabled:opacity-50"
        >
          Accept refill
        </button>
        {directed && (
          <button
            disabled={busy}
            onClick={onDecline}
            className="rounded-lg bg-white px-4 py-3 text-sm font-semibold text-ink-soft ring-1 ring-line transition hover:bg-mist disabled:opacity-50"
          >
            Decline
          </button>
        )}
      </div>
    </section>
  );
}

import WhatsAppPanel from '../components/WhatsAppPanel.jsx';

export default function NotificationsPage({ notifications }) {
  return (
    <>
      <div className="mb-6">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[1.5px] text-forest-600">
          Stay in the loop
        </p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Notifications</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Updates sent to volunteers about refills, receipts and reimbursements.
        </p>
      </div>
      <WhatsAppPanel notifications={notifications} />
    </>
  );
}

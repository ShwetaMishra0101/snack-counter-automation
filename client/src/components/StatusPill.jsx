const STYLES = {
  OPEN: 'bg-gray-100 text-gray-700',
  OFFERED: 'bg-amber-100 text-amber-800',
  CLAIMED: 'bg-amber-100 text-amber-800',
  PURCHASED: 'bg-blue-100 text-blue-800',
  SUBMITTED: 'bg-blue-100 text-blue-800',
  REIMBURSED: 'bg-forest-100 text-forest-700',
  REJECTED: 'bg-red-100 text-red-700'
};

export default function StatusPill({ status }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${STYLES[status] || STYLES.OPEN}`}>
      {status}
    </span>
  );
}

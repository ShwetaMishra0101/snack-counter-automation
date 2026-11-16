import MonthlyReport from '../components/MonthlyReport.jsx';

export default function ReportsPage({ report }) {
  return (
    <>
      <div className="mb-6">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[1.5px] text-forest-600">
          Management
        </p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Monthly report</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Total snack spending across both offices, in native currencies and one INR-equivalent figure.
        </p>
      </div>
      <MonthlyReport report={report} />
    </>
  );
}

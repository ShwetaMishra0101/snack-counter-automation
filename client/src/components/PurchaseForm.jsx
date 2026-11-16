import { useState } from 'react';

const inputClass =
  'rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-forest-600';

export default function PurchaseForm({ refill, me, busy, onSubmit }) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('Snacks for office');
  const [receipt, setReceipt] = useState(null);
  const [payrollCurrency, setPayrollCurrency] = useState('');

  if (!refill) return null;
  // Payroll currency can change anytime, so it's confirmed on every claim.
  const currency = payrollCurrency || me?.payrollCurrency || '';

  const handleSubmit = e => {
    e.preventDefault();
    const data = new FormData();
    data.append('amount', amount);
    data.append('description', description);
    data.append('payrollCurrency', currency);
    data.append('receipt', receipt);
    onSubmit(data);
  };

  return (
    <section className="mb-4 flex flex-col gap-5 rounded-2xl border border-forest-200 bg-forest-50 p-5 lg:flex-row lg:items-start">
      <div className="min-w-60">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[1.5px] text-forest-600">
          Purchase completion
        </p>
        <h2 className="font-display text-xl font-bold">Submit your receipt</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Upload the receipt to submit your HR reimbursement claim.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-1 flex-wrap items-end gap-3">
        <label className="flex min-w-36 flex-1 flex-col gap-1.5 text-xs font-semibold text-ink-soft">
          Amount ({refill.officeCurrency})
          <input
            type="number" min="0.01" step="0.01" required
            className={inputClass}
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
        </label>
        <label className="flex min-w-36 flex-1 flex-col gap-1.5 text-xs font-semibold text-ink-soft">
          Description
          <input required className={inputClass} value={description} onChange={e => setDescription(e.target.value)} />
        </label>
        <label className="flex min-w-36 flex-1 flex-col gap-1.5 text-xs font-semibold text-ink-soft">
          Reimburse me in
          <select required className={inputClass} value={currency} onChange={e => setPayrollCurrency(e.target.value)}>
            <option value="" disabled>Currency…</option>
            <option value="NOK">NOK</option>
            <option value="INR">INR</option>
          </select>
        </label>
        <label className="flex min-w-44 flex-1 flex-col gap-1.5 text-xs font-semibold text-ink-soft">
          Receipt image / PDF
          <input
            type="file" accept="image/*,application/pdf" required
            className="text-xs text-ink-muted file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2.5 file:text-xs file:font-semibold file:text-ink-soft file:ring-1 file:ring-line"
            onChange={e => setReceipt(e.target.files[0])}
          />
        </label>
        <button
          disabled={!receipt || !currency || busy}
          className="rounded-lg bg-forest-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-forest-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Submit purchase
        </button>
      </form>
    </section>
  );
}

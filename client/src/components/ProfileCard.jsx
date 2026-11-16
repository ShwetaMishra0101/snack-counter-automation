import { useEffect, useState } from 'react';
import { passwordIssue, phoneIssue } from '../utils/validate.js';
import PhoneInput from './PhoneInput.jsx';

const inputClass =
  'rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-forest-600';
const labelClass = 'flex min-w-44 flex-1 flex-col gap-1.5 text-xs font-semibold text-ink-soft';

function FieldError({ text }) {
  if (!text) return null;
  return <span className="text-[11px] font-normal text-red-600">⚠ {text}</span>;
}

// Office, payroll currency, WhatsApp number and password all change over time
// (transfers, relocations, new phones), so they live here — editable anytime —
// instead of being fixed at signup.
export default function ProfileCard({ me, offices, busy, onSave }) {
  const [officeId, setOfficeId] = useState('');
  const [payrollCurrency, setPayrollCurrency] = useState('');
  const [phone, setPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (me) {
      setOfficeId(me.officeId?._id || me.officeId || '');
      setPayrollCurrency(me.payrollCurrency || '');
      setPhone(me.phone || '');
    }
  }, [me]);

  if (!me) return null;
  const incomplete = !me.officeId || !me.payrollCurrency;
  const changed =
    officeId !== (me.officeId?._id || me.officeId || '') ||
    payrollCurrency !== (me.payrollCurrency || '') ||
    phone !== (me.phone || '') ||
    !!newPassword;

  const phIssue = phoneIssue(phone);
  const pwIssue = newPassword ? passwordIssue(newPassword) : '';
  const invalid = !!phIssue || !!pwIssue;

  const submit = e => {
    e.preventDefault();
    if (invalid) return;
    onSave({ officeId, payrollCurrency, phone, newPassword: newPassword || undefined });
    setNewPassword('');
  };

  return (
    <section className={`mb-4 rounded-2xl border p-5 ${incomplete ? 'border-amber-300 bg-amber-50' : 'border-line bg-white'}`}>
      <p className={`mb-2 text-[10px] font-bold uppercase tracking-[1.5px] ${incomplete ? 'text-amber-700' : 'text-forest-600'}`}>
        {incomplete ? 'Finish setting up — required before you can volunteer' : 'Your profile — office, currency, WhatsApp & password'}
      </p>
      <form onSubmit={submit} className="flex flex-wrap items-start gap-3">
        <label className={labelClass}>
          Current office
          <select required className={inputClass} value={officeId} onChange={e => setOfficeId(e.target.value)}>
            <option value="" disabled>Select office…</option>
            {offices.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
          </select>
        </label>
        <label className={labelClass}>
          Payroll currency
          <select required className={inputClass} value={payrollCurrency} onChange={e => setPayrollCurrency(e.target.value)}>
            <option value="" disabled>Select currency…</option>
            <option value="NOK">NOK — Norwegian krone</option>
            <option value="INR">INR — Indian rupee</option>
          </select>
        </label>
        <label className={labelClass}>
          WhatsApp number
          <PhoneInput value={phone} onChange={setPhone} invalid={!!phIssue} />
          <FieldError text={phIssue} />
        </label>
        <label className={labelClass}>
          New password <span className="font-normal text-ink-muted">(optional)</span>
          <input
            type="password"
            className={`${inputClass} ${pwIssue ? 'border-red-400' : ''}`}
            placeholder="Leave blank to keep current"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
          />
          {newPassword && !pwIssue && <span className="text-[11px] font-normal text-forest-600">✓ Valid password</span>}
          <FieldError text={pwIssue} />
        </label>
        <button
          disabled={busy || !officeId || !payrollCurrency || invalid || (!incomplete && !changed)}
          className="mt-5 rounded-lg bg-forest-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-forest-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save
        </button>
        <p className="w-full text-[11px] text-ink-muted">
          All of these can change anytime. Reimbursements are paid in your payroll currency
          (confirmed again on each claim)
        </p>
      </form>
    </section>
  );
}

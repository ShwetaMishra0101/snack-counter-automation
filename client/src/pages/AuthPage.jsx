import { useState } from 'react';
import { api } from '../api/client.js';
import { passwordIssue, phoneIssue } from '../utils/validate.js';
import PhoneInput from '../components/PhoneInput.jsx';

function FieldError({ text }) {
  if (!text) return null;
  return <span className="text-[11px] font-normal text-red-600">⚠ {text}</span>;
}

const inputClass =
  'w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-forest-600';
const labelClass = 'flex flex-col gap-1.5 text-xs font-semibold text-ink-soft';

export default function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  // Live validation (signup only; login just needs non-empty fields).
  const pwIssue = mode === 'signup' && form.password ? passwordIssue(form.password) : '';
  const phIssue = mode === 'signup' ? phoneIssue(form.phone) : '';

  async function submit(e) {
    e.preventDefault();
    if (mode === 'signup' && (passwordIssue(form.password) || phIssue)) {
      setError(passwordIssue(form.password) || phIssue);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = mode === 'login'
        ? await api.login(form.email, form.password)
        : await api.signup(form);
      onAuthenticated(result.token, result.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-forest-700 text-3xl">🍪</span>
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight">Snack Refill Manager</h1>
            <p className="mt-1 text-sm text-ink-muted">Coordinating snack refills for Oslo &amp; Bengaluru</p>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-white p-6">
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-mist p-1">
            {['login', 'signup'].map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                className={`rounded-lg py-2 text-sm font-semibold transition ${
                  mode === m ? 'bg-white text-forest-700 shadow-sm' : 'text-ink-muted hover:text-ink'
                }`}
              >
                {m === 'login' ? 'Log in' : 'Sign up'}
              </button>
            ))}
          </div>

          {error && (
            <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">⚠ {error}</p>
          )}

          <form onSubmit={submit} className="flex flex-col gap-4">
            {mode === 'signup' && (
              <label className={labelClass}>
                Full name
                <input required className={inputClass} value={form.name} onChange={e => set('name', e.target.value)} />
              </label>
            )}
            <label className={labelClass}>
              Email
              <input type="email" required className={inputClass} value={form.email} onChange={e => set('email', e.target.value)} />
            </label>
            <label className={labelClass}>
              Password
              <input
                type="password" required minLength={mode === 'signup' ? 8 : undefined}
                className={`${inputClass} ${pwIssue ? 'border-red-400' : ''}`}
                value={form.password}
                onChange={e => set('password', e.target.value)}
              />
              {mode === 'signup' && (pwIssue
                ? <FieldError text={pwIssue} />
                : <span className="text-[11px] font-normal text-ink-muted">At least 8 characters, with a letter and a number.</span>
              )}
            </label>
            {mode === 'signup' && (
              <>
                <label className={labelClass}>
                  WhatsApp number <span className="font-normal text-ink-muted">(optional)</span>
                  <PhoneInput value={form.phone} onChange={v => set('phone', v)} invalid={!!phIssue} />
                  <FieldError text={phIssue} />
                </label>
                <p className="-mt-2 text-[11px] text-ink-muted">
                  You'll pick your office and payroll currency on the dashboard — both can be
                  changed anytime, and the currency is confirmed on every claim.
                </p>
              </>
            )}
            <button
              disabled={busy || (mode === 'signup' && (!!pwIssue || !!phIssue))}
              className="mt-1 rounded-lg bg-forest-700 py-3 text-sm font-semibold text-white transition hover:bg-forest-800 disabled:opacity-50"
            >
              {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
            </button>
          </form>

          {mode === 'login' && (
            <p className="mt-4 rounded-lg bg-mist px-3 py-2.5 text-[11px] leading-relaxed text-ink-muted">
              <strong className="text-ink-soft">Demo accounts</strong> (password <code>password123</code>):
              volunteers like <code>asha@example.com</code> or <code>olav@example.com</code>, the HR
              approver <code>hr@example.com</code>, and the role admin <code>admin@example.com</code>.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

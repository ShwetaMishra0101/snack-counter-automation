import { useEffect, useState } from 'react';

const COUNTRIES = [
  { code: '+91', flag: '🇮🇳', name: 'India' },
  { code: '+47', flag: '🇳🇴', name: 'Norway' },
  { code: '+1', flag: '🇺🇸', name: 'USA' },
  { code: '+44', flag: '🇬🇧', name: 'UK' },
  { code: '+49', flag: '🇩🇪', name: 'Germany' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' }
];

// Splits a stored value like "+919876543210" into country code + local number.
export function splitPhone(value) {
  const v = String(value || '');
  const country = [...COUNTRIES]
    .sort((a, b) => b.code.length - a.code.length)
    .find(c => v.startsWith(c.code));
  if (country) return { code: country.code, number: v.slice(country.code.length) };
  return { code: '+91', number: v.replace(/^\+/, '') };
}

const boxClass =
  'rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-forest-600';

// Country-code picker + digits-only local number, combined into one E.164
// value ("+919876543210") for the form.
export default function PhoneInput({ value, onChange, invalid }) {
  const [code, setCode] = useState(() => splitPhone(value).code);
  const number = value ? splitPhone(value).number : '';

  // Re-sync the picker when a stored profile value loads with another prefix.
  useEffect(() => {
    if (value) {
      const parsed = splitPhone(value);
      if (parsed.code !== code) setCode(parsed.code);
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (nextCode, nextNumber) => {
    setCode(nextCode);
    const digits = nextNumber.replace(/\D/g, '').slice(0, 14);
    onChange(digits ? `${nextCode}${digits}` : '');
  };

  return (
    <div className="flex gap-2">
      <select
        aria-label="Country code"
        className={`${boxClass} shrink-0`}
        value={code}
        onChange={e => update(e.target.value, number)}
      >
        {COUNTRIES.map(c => (
          <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
        ))}
      </select>
      <input
        type="tel"
        inputMode="numeric"
        className={`${boxClass} w-full min-w-0 flex-1 ${invalid ? 'border-red-400' : ''}`}
        placeholder="9876543210"
        value={number}
        onChange={e => update(code, e.target.value)}
      />
    </div>
  );
}

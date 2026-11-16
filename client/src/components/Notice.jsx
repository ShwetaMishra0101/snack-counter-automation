const TONES = {
  success: 'border-forest-200 bg-forest-50 text-forest-700',
  error: 'border-red-200 bg-red-50 text-red-800',
  info: 'border-amber-200 bg-amber-50 text-amber-900'
};

export default function Notice({ message, tone = 'info' }) {
  if (!message) return null;
  return (
    <div className={`mb-4 rounded-lg border px-4 py-3 text-sm font-medium ${TONES[tone] || TONES.info}`}>
      {tone === 'success' ? '✓ ' : tone === 'error' ? '⚠ ' : ''}{message}
    </div>
  );
}

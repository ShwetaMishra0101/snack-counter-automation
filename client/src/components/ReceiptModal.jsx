import { useEffect, useState } from 'react';

// In-app receipt preview: images and PDFs render inline in an overlay
// instead of downloading.
export default function ReceiptModal({ url, onClose }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // A new receipt means a fresh attempt at loading it.
  useEffect(() => { setFailed(false); }, [url]);

  if (!url) return null;
  const isPdf = url.toLowerCase().endsWith('.pdf');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h3 className="font-display text-sm font-bold">Receipt preview</h3>
          <div className="flex items-center gap-3">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-forest-700 underline hover:text-forest-800"
            >
              Open full size
            </a>
            <button
              onClick={onClose}
              aria-label="Close preview"
              className="flex size-8 items-center justify-center rounded-lg text-ink-muted ring-1 ring-line transition hover:bg-mist hover:text-ink"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-mist p-3">
          {failed ? (
            <p className="py-10 text-center text-sm text-ink-muted">
              This receipt file isn't available on this server — it was uploaded in an older
              session. New receipts are stored durably and will preview here.
            </p>
          ) : isPdf ? (
            <iframe src={url} title="Receipt" className="h-[70vh] w-full rounded-lg bg-white" />
          ) : (
            <img
              src={url}
              alt="Receipt"
              onError={() => setFailed(true)}
              className="mx-auto max-h-[70vh] rounded-lg object-contain"
            />
          )}
        </div>
      </div>
    </div>
  );
}

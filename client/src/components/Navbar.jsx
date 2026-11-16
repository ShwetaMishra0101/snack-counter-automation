import { useState } from 'react';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'refills', label: 'Refills' },
  { id: 'whatsapp', label: 'Notifications' },
  { id: 'reports', label: 'Reports' }
];

function Badge({ count }) {
  if (!count) return null;
  return (
    <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white">
      {count > 9 ? '9+' : count}
    </span>
  );
}

export default function Navbar({ view, onNavigate, pendingActions = 0, notificationCount = 0, user, isAdmin = false, onLogout }) {
  const badgeFor = tabId =>
    tabId === 'dashboard' ? pendingActions : tabId === 'whatsapp' ? notificationCount : 0;
  const [open, setOpen] = useState(false);
  const navigate = id => { onNavigate(id); setOpen(false); };
  const tabs = isAdmin ? [...TABS, { id: 'admin', label: 'Admin' }] : TABS;

  return (
    <nav className="sticky top-0 z-10 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-7">
        <button onClick={() => navigate('dashboard')} className="flex shrink-0 items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-forest-700 text-lg">🍪</span>
          <span className="font-display text-base font-extrabold tracking-tight">
            Snack Refill Manager
          </span>
        </button>

        {/* Desktop tabs */}
        <div className="hidden flex-1 items-center gap-1 md:flex">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => navigate(tab.id)}
              className={`inline-flex items-center whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                view === tab.id
                  ? 'bg-forest-50 text-forest-700'
                  : 'text-ink-muted hover:bg-mist hover:text-ink'
              }`}
            >
              {tab.label}
              <Badge count={badgeFor(tab.id)} />
            </button>
          ))}
        </div>

        {user && (
          <div className="hidden shrink-0 items-center gap-2 md:flex">
            <span className="rounded-full bg-forest-100 px-3 py-1.5 text-xs font-medium text-forest-700">
              {user.name}{user.role !== 'EMPLOYEE' && <strong className="ml-1 rounded bg-forest-700 px-1.5 py-0.5 text-[9px] font-bold text-white">{user.role}</strong>}
            </span>
            <button
              onClick={onLogout}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-ink-muted ring-1 ring-line transition hover:bg-mist hover:text-ink"
            >
              Log out
            </button>
          </div>
        )}

        {/* Hamburger (mobile only) */}
        <button
          onClick={() => setOpen(o => !o)}
          aria-label="Toggle menu"
          aria-expanded={open}
          className="relative ml-auto flex size-10 items-center justify-center rounded-lg text-ink ring-1 ring-line transition hover:bg-mist md:hidden"
        >
          {open ? (
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          ) : (
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          )}
          {!open && pendingActions + notificationCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white">
              {pendingActions + notificationCount > 9 ? '9+' : pendingActions + notificationCount}
            </span>
          )}
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {open && (
        <div className="border-t border-line bg-white px-4 pb-3 pt-2 md:hidden">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => navigate(tab.id)}
              className={`flex w-full items-center rounded-lg px-3.5 py-2.5 text-left text-sm font-semibold transition ${
                view === tab.id
                  ? 'bg-forest-50 text-forest-700'
                  : 'text-ink-muted hover:bg-mist hover:text-ink'
              }`}
            >
              {tab.label}
              <Badge count={badgeFor(tab.id)} />
            </button>
          ))}
          {user && (
            <div className="mt-2 flex items-center justify-between gap-2 border-t border-line pt-3">
              <span className="rounded-full bg-forest-100 px-3 py-1.5 text-xs font-medium text-forest-700">
                {user.name}{user.role !== 'EMPLOYEE' && <strong className="ml-1 rounded bg-forest-700 px-1.5 py-0.5 text-[9px] font-bold text-white">{user.role}</strong>}
              </span>
              <button
                onClick={onLogout}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-ink-muted ring-1 ring-line transition hover:bg-mist hover:text-ink"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

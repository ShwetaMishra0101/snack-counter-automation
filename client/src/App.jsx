import { useCallback, useEffect, useState } from 'react';
import { api, auth } from './api/client.js';
import Navbar from './components/Navbar.jsx';
import Notice from './components/Notice.jsx';
import AuthPage from './pages/AuthPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import RefillsPage from './pages/RefillsPage.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import AdminPage from './pages/AdminPage.jsx';

// Each view has a real URL, so /admin can be opened or shared directly.
const VIEW_PATHS = {
  dashboard: '/',
  refills: '/refills',
  whatsapp: '/notifications',
  reports: '/reports',
  admin: '/admin'
};
const pathToView = path =>
  Object.keys(VIEW_PATHS).find(v => VIEW_PATHS[v] === path) || 'dashboard';

function AccessDenied({ user, role }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
      <p className="text-3xl">🔒</p>
      <h1 className="mt-2 font-display text-xl font-bold text-red-800">Admins only</h1>
      <p className="mt-2 text-sm text-red-700">
        You are logged in as <strong>{user?.name}</strong> with the role <strong>{role}</strong>.
        Only an ADMIN can open this page and assign roles — ask an admin
        (e.g. admin@example.com) to promote you.
      </p>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(auth.user);
  const [me, setMe] = useState(null);
  const [view, setView] = useState(() => pathToView(window.location.pathname));
  const [offices, setOffices] = useState([]);
  const [officeId, setOfficeId] = useState('');
  const [refills, setRefills] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [report, setReport] = useState(null);
  const [message, setMessage] = useState('');
  const [tone, setTone] = useState('info');
  const [busy, setBusy] = useState(false);
  const [notifSeenAt, setNotifSeenAt] = useState(() => {
    try { return Number(localStorage.getItem('snack.notifSeen') || 0); } catch { return 0; }
  });

  const navigate = useCallback(nextView => {
    setView(nextView);
    const path = VIEW_PATHS[nextView] || '/';
    if (window.location.pathname !== path) window.history.pushState({}, '', path);
  }, []);

  // Browser back/forward buttons switch views too.
  useEffect(() => {
    const onPop = () => setView(pathToView(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const logout = useCallback(() => {
    auth.clear();
    setUser(null);
    setMe(null);
    setMessage('');
    navigate('dashboard');
  }, [navigate]);

  // The API layer fires this when any request comes back 401.
  useEffect(() => {
    window.addEventListener('snack:logout', logout);
    return () => window.removeEventListener('snack:logout', logout);
  }, [logout]);

  const refresh = useCallback(async (selectedOffice = officeId) => {
    const [o, profile, n] = await Promise.all([api.getOffices(), api.getMe(), api.getNotifications()]);
    setOffices(o);
    setMe(profile);
    setNotifications(n);
    const office = selectedOffice || profile.officeId?._id || o[0]?._id;
    if (office && !selectedOffice) setOfficeId(office);
    if (office) setRefills(await api.getRefills(office));
    const d = new Date();
    setReport(await api.getMonthlyReport(d.getFullYear(), d.getMonth() + 1));
  }, [officeId]);

  useEffect(() => {
    if (user) refresh().catch(e => { setMessage(e.message); setTone('error'); });
  }, [user]);
  useEffect(() => {
    if (user && officeId) {
      api.getRefills(officeId).then(setRefills).catch(e => { setMessage(e.message); setTone('error'); });
    }
  }, [officeId]);

  // Keep offers and the WhatsApp feed fresh (expired offers are reassigned server-side).
  useEffect(() => {
    if (!user) return;
    const id = setInterval(() => refresh().catch(() => {}), 10000);
    return () => clearInterval(id);
  }, [user, refresh]);

  // Opening the Notifications page marks everything as read.
  useEffect(() => {
    if (view === 'whatsapp' && notifications.length) {
      const latest = Math.max(...notifications.map(n => new Date(n.createdAt).getTime()));
      if (latest > notifSeenAt) {
        setNotifSeenAt(latest);
        try { localStorage.setItem('snack.notifSeen', String(latest)); } catch { /* private mode */ }
      }
    }
  }, [view, notifications, notifSeenAt]);

  async function action(fn, successMessage = 'Action completed successfully.') {
    setBusy(true);
    setMessage('');
    try {
      await fn();
      await refresh();
      setTone('success');
      setMessage(successMessage);
    } catch (e) {
      setTone('error');
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!user) {
    return (
      <AuthPage
        onAuthenticated={(token, newUser) => {
          auth.save(token, newUser);
          setUser(newUser);
        }}
      />
    );
  }

  // Roles can be changed by the admin at any time, so trust the fresh profile
  // over the role baked into the login session.
  const role = me?.role || user.role;
  const isAdmin = role === 'ADMIN';
  // Admins can approve claims too, not just HR.
  const isHr = role === 'HR' || isAdmin;
  const currentOffice = offices.find(o => o._id === officeId);
  const assignedToMe = r => (r.assignedTo?._id || r.assignedTo) === user._id;
  // Am I in this refill's volunteer pool (home office, or visiting)?
  const eligibleFor = r => {
    const refillOffice = r.officeId?._id || r.officeId;
    const home = me?.officeId?._id || me?.officeId;
    const temp = me?.temporaryOfficeId?._id || me?.temporaryOfficeId;
    const visiting = temp && me?.temporaryOfficeUntil && new Date(me.temporaryOfficeUntil) > new Date();
    return refillOffice === home || (visiting && refillOffice === temp);
  };
  // A directed offer to me beats an open call; open calls are first-come-first-served.
  const myOffer = refills.find(r => r.status === 'OFFERED' && assignedToMe(r));
  const openOffer = refills.find(r => r.status === 'OPEN' && eligibleFor(r));
  const activeOffer = myOffer || openOffer;
  const myClaim = refills.find(r => r.status === 'CLAIMED' && assignedToMe(r));
  const pendingActions = (activeOffer ? 1 : 0) + (myClaim ? 1 : 0);
  const unreadNotifications = view === 'whatsapp'
    ? 0
    : notifications.filter(n => new Date(n.createdAt).getTime() > notifSeenAt).length;

  return (
    <>
      <Navbar
        view={view}
        onNavigate={navigate}
        pendingActions={pendingActions}
        notificationCount={unreadNotifications}
        user={{ ...user, role }}
        isAdmin={isAdmin}
        onLogout={logout}
      />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-7">
        <Notice message={message} tone={tone} />

        {view === 'dashboard' && (
          <DashboardPage
            offices={offices}
            officeId={officeId}
            busy={busy}
            user={user}
            me={me}
            office={currentOffice}
            refills={refills}
            myOffer={activeOffer}
            offerDirected={!!myOffer}
            myClaim={myClaim}
            onOfficeChange={setOfficeId}
            onReportEmpty={() => action(
              () => api.reportEmpty(officeId),
              'Empty box reported — all volunteers were notified on WhatsApp. First to accept gets it.'
            )}
            onAccept={() => action(
              () => api.acceptRefill(activeOffer._id),
              'Refill accepted — buy the snacks and submit your receipt.'
            )}
            onDecline={() => action(
              () => api.declineRefill(myOffer._id),
              'Offer declined — it was handed to the next volunteer.'
            )}
            onRelease={() => action(
              () => api.releaseRefill(myClaim._id),
              'Refill released — another volunteer can now take it.'
            )}
            onSubmitPurchase={form => action(
              () => api.submitPurchase(myClaim._id, form),
              'Receipt submitted — your HR reimbursement claim was created.'
            )}
            onStartVisit={(visitOfficeId, until) => action(
              () => api.startVisit(visitOfficeId, until),
              "You've joined the other office's volunteer rotation for your visit."
            )}
            onEndVisit={() => action(
              () => api.endVisit(),
              'Visit ended — you are back in your home office rotation only.'
            )}
            onSaveProfile={profile => action(
              () => api.updateProfile(profile),
              'Profile saved successfully.'
            )}
          />
        )}

        {view === 'refills' && (
          <RefillsPage
            officeName={currentOffice?.name}
            refills={refills}
            busy={busy}
            isHr={isHr}
            onRefresh={() => refresh()}
            onReportEmpty={() => action(
              () => api.reportEmpty(officeId),
              'Empty box reported — all volunteers were notified on WhatsApp. First to accept gets it.'
            )}
            onSimulateApproval={(id, status) => action(
              () => api.simulateHrStatus(id, status),
              status === 'APPROVED'
                ? 'Claim approved — the volunteer was notified on WhatsApp.'
                : 'Claim rejected — the volunteer was notified on WhatsApp.'
            )}
          />
        )}

        {view === 'whatsapp' && <NotificationsPage notifications={notifications} />}

        {view === 'reports' && <ReportsPage report={report} />}

        {view === 'admin' && (isAdmin ? <AdminPage me={me} /> : me && <AccessDenied user={user} role={role} />)}

        {/* <footer className="py-6 text-center text-[11px] text-ink-muted">
          Snack Refill Manager · Demo — JWT login stands in for company SSO.
        </footer> */}
      </main>
    </>
  );
}

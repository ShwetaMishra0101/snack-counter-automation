import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import Pagination from '../components/Pagination.jsx';

const PER_PAGE = 8;

const thClass =
  'border-b border-line bg-mist px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-ink-muted';
const tdClass = 'whitespace-nowrap border-b border-line px-3 py-3.5';

const ROLE_STYLES = {
  ADMIN: 'bg-purple-100 text-purple-800',
  HR: 'bg-forest-100 text-forest-700',
  EMPLOYEE: 'bg-gray-100 text-gray-600'
};

function RoleBadge({ role }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${ROLE_STYLES[role] || ROLE_STYLES.EMPLOYEE}`}>
      {role}
    </span>
  );
}

// Admin-only (/admin): assign roles. Anyone given the HR role can approve
// claims; anyone given ADMIN can manage roles here too.
export default function AdminPage({ me }) {
  const [employees, setEmployees] = useState([]);
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState('');
  const [tone, setTone] = useState('info');

  const load = () => api.getEmployees().then(setEmployees).catch(e => { setTone('error'); setMessage(e.message); });
  useEffect(() => { load(); }, []);

  async function changeRole(employee, role) {
    setBusyId(employee._id);
    setMessage('');
    try {
      await api.setRole(employee._id, role);
      await load();
      setTone('success');
      setMessage(
        role === 'HR'
          ? `${employee.name} is now HR and can approve or reject claims.`
          : `${employee.name}'s role was changed to ${role}.`
      );
    } catch (e) {
      setTone('error');
      setMessage(e.message);
    } finally {
      setBusyId(null);
    }
  }

  const pages = Math.max(1, Math.ceil(employees.length / PER_PAGE));
  const current = Math.min(page, pages);
  const visible = employees.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  return (
    <>
      <div className="mb-6">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[1.5px] text-forest-600">
          Administration
        </p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Admin — team &amp; roles</h1>
        <p className="mt-1 text-sm text-ink-muted">
          You are logged in as <strong>{me?.name}</strong> (ADMIN). Assign roles below: give someone{' '}
          <strong>HR</strong> and they can approve or reject claims; give them <strong>ADMIN</strong>{' '}
          and they can manage roles here too.
        </p>
      </div>

      {message && (
        <div className={`mb-4 rounded-lg border px-4 py-3 text-sm font-medium ${
          tone === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-forest-200 bg-forest-50 text-forest-700'
        }`}>
          {tone === 'error' ? '⚠ ' : '✓ '}{message}
        </div>
      )}

      <section className="rounded-2xl border border-line bg-white p-5">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr>
                {['Employee', 'Office', 'Payroll', 'WhatsApp', 'Current role', 'Change role'].map(h => (
                  <th key={h} className={thClass}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map(e => {
                const isSelf = e._id === me?._id;
                return (
                  <tr key={e._id}>
                    <td className={tdClass}>
                      <span className="font-medium text-ink">{e.name}</span>
                      <div className="mt-0.5 text-[11px] text-ink-muted">{e.email}</div>
                    </td>
                    <td className={tdClass}>{e.officeId?.name || '—'}</td>
                    <td className={tdClass}>{e.payrollCurrency || '—'}</td>
                    <td className={tdClass}>{e.phone || '—'}</td>
                    <td className={tdClass}><RoleBadge role={e.role} /></td>
                    <td className={tdClass}>
                      {isSelf ? (
                        <span className="text-[10px] text-ink-muted">You can't change your own role</span>
                      ) : (
                        <select
                          disabled={busyId === e._id}
                          className="rounded-lg border border-line bg-white px-2.5 py-2 text-xs text-ink outline-none focus:border-forest-600 disabled:opacity-50"
                          value={e.role}
                          onChange={ev => changeRole(e, ev.target.value)}
                        >
                          <option value="EMPLOYEE">EMPLOYEE</option>
                          <option value="HR">HR</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination total={employees.length} page={current} perPage={PER_PAGE} onPage={setPage} />
      </section>
    </>
  );
}

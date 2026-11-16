const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Uploaded receipts are served from the API server's /uploads folder.
export const fileUrl = path => `${API.replace(/\/api\/?$/, '')}${path}`;

export const auth = {
  get token() { try { return localStorage.getItem('snack.token') || ''; } catch { return ''; } },
  get user() { try { return JSON.parse(localStorage.getItem('snack.user') || 'null'); } catch { return null; } },
  save(token, user) {
    try {
      localStorage.setItem('snack.token', token);
      localStorage.setItem('snack.user', JSON.stringify(user));
    } catch { /* private mode */ }
  },
  clear() {
    try {
      localStorage.removeItem('snack.token');
      localStorage.removeItem('snack.user');
    } catch { /* private mode */ }
  }
};

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (auth.token) headers.Authorization = `Bearer ${auth.token}`;
  const response = await fetch(`${API}${path}`, { ...options, headers });
  const data = await response.json();
  if (response.status === 401) {
    auth.clear();
    window.dispatchEvent(new Event('snack:logout'));
  }
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

const json = body => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});

export const api = {
  // Auth (public)
  signup: payload => request('/auth/signup', json(payload)),
  login: (email, password) => request('/auth/login', json({ email, password })),
  getPublicOffices: () => request('/auth/offices'),
  // Authenticated
  getMe: () => request('/me'),
  updateProfile: profile => request('/me/profile', json(profile)),
  startVisit: (officeId, until) => request('/me/visit', json({ officeId, until })),
  endVisit: () => request('/me/end-visit', json({})),
  getOffices: () => request('/offices'),
  getEmployees: () => request('/employees'),
  setRole: (employeeId, role) => request(`/employees/${employeeId}/role`, json({ role })),
  getRefills: officeId => request(`/refills?officeId=${officeId}`),
  getNotifications: () => request('/notifications'),
  getMonthlyReport: (year, month) => request(`/reports/monthly?year=${year}&month=${month}`),
  reportEmpty: officeId => request('/refills', json({ officeId })),
  acceptRefill: refillId => request(`/refills/${refillId}/accept`, json({})),
  declineRefill: refillId => request(`/refills/${refillId}/decline`, json({})),
  releaseRefill: refillId => request(`/refills/${refillId}/release`, json({})),
  submitPurchase: (refillId, formData) => request(`/refills/${refillId}/purchase`, { method: 'POST', body: formData }),
  simulateHrStatus: (refillId, status) => request(`/refills/${refillId}/simulate-hr-status`, json({ status }))
};

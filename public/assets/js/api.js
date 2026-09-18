/* ============================================================
   FOLIO HOUSE — API client
   Talks to the Express backend at /api. Assumes this frontend is
   served from the same origin (see app.js commented-out static
   mount) so relative URLs + cookies (for admin refresh) just work.
   ============================================================ */

const API_BASE = '/api';

// ---- token storage ----
// Admin session lives in sessionStorage (short-lived, per-tab).
// Customer session lives in localStorage (persist across visits).
const AUTH = {
  getAdminToken: () => sessionStorage.getItem('fh_admin_token'),
  setAdminToken: (t) => t ? sessionStorage.setItem('fh_admin_token', t) : sessionStorage.removeItem('fh_admin_token'),
  getAdmin: () => JSON.parse(sessionStorage.getItem('fh_admin') || 'null'),
  setAdmin: (a) => a ? sessionStorage.setItem('fh_admin', JSON.stringify(a)) : sessionStorage.removeItem('fh_admin'),

  getCustomerToken: () => localStorage.getItem('fh_customer_token'),
  setCustomerToken: (t) => t ? localStorage.setItem('fh_customer_token', t) : localStorage.removeItem('fh_customer_token'),
  getCustomer: () => JSON.parse(localStorage.getItem('fh_customer') || 'null'),
  setCustomer: (c) => c ? localStorage.setItem('fh_customer', JSON.stringify(c)) : localStorage.removeItem('fh_customer'),

  logoutCustomer() { this.setCustomerToken(null); this.setCustomer(null); },
  logoutAdmin() { this.setAdminToken(null); this.setAdmin(null); },
};

/**
 * api(path, opts)
 * opts.admin  = true  -> send admin bearer token
 * opts.auth   = false -> send no Authorization header at all (public route)
 * opts.isForm = true  -> body is a FormData (file upload), don't JSON-encode
 */
async function api(path, opts = {}) {
  const { method = 'GET', body, admin = false, auth = true, isForm = false, retry = true } = opts;
  const headers = {};
  if (!isForm) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = admin ? AUTH.getAdminToken() : AUTH.getCustomerToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;
  }

  const res = await fetch(API_BASE + path, {
    method,
    headers,
    credentials: 'include',
    body: body === undefined ? undefined : (isForm ? body : JSON.stringify(body)),
  });

  let data = null;
  try { data = await res.json(); } catch (_) { /* no body, e.g. file download */ }

  // Admin access tokens are short-lived (15m). Try one silent refresh
  // via the httpOnly refresh cookie before giving up.
  if (res.status === 401 && admin && retry) {
    const refreshed = await tryRefreshAdmin();
    if (refreshed) return api(path, { ...opts, retry: false });
  }

  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function tryRefreshAdmin() {
  try {
    const res = await fetch(API_BASE + '/admin/auth/refresh', { method: 'POST', credentials: 'include' });
    if (!res.ok) return false;
    const data = await res.json();
    AUTH.setAdminToken(data.accessToken);
    return true;
  } catch (_) {
    return false;
  }
}

// ---- formatting helpers ----
function money(cents, currency = 'USD') {
  if (cents === null || cents === undefined) return '';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}
function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}
function qs(params) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') usp.set(k, v); });
  const s = usp.toString();
  return s ? `?${s}` : '';
}
function mediaUrl(url) { return url || ''; }
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
function toast(msg, ok = true) {
  let el = document.querySelector('.toast-folio');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast-folio';
    document.body.appendChild(el);
  }
  el.style.background = ok ? 'var(--ink)' : 'var(--crimson)';
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2600);
}

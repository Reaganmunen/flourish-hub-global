/* ============================================================
   FOLIO HOUSE ADMIN — shared shell
   Every admin page (except login.html) has:
     <div class="admin-shell">
       <aside id="admin-sidebar"></aside>
       <main class="admin-main">...page content...</main>
     </div>
   Set window.ACTIVE_ADMIN_NAV before this script runs.
   guardAdmin() redirects to login if there's no usable session.
   ============================================================ */

async function guardAdmin() {
  let token = AUTH.getAdminToken();
  if (!token) {
    const ok = await tryRefreshAdmin();
    if (!ok) { window.location.href = '/admin/login.html'; return null; }
  }
  try {
    const { admin } = await api('/admin/auth/me', { admin: true });
    AUTH.setAdmin(admin);
    return admin;
  } catch (e) {
    window.location.href = '/admin/login.html';
    return null;
  }
}

function renderAdminSidebar(admin) {
  const host = document.getElementById('admin-sidebar');
  if (!host) return;
  const active = window.ACTIVE_ADMIN_NAV || '';
  const isOwner = admin && admin.role === 'owner';
  const item = (href, icon, label, key) =>
    `<a href="${href}" class="${active === key ? 'active' : ''}"><i class="bi ${icon}"></i> ${label}</a>`;

  host.innerHTML = `
    <a href="/admin/dashboard.html" class="brand-mark">
      <img src="/assets/images/logo-flourishhub.jpeg" alt="FlourishHub" class="brand-logo-img" style="filter:none;">
      <span>Flourish Hub Global</span>
    </a>
    <div class="side-label">Overview</div>
    ${item('/admin/dashboard.html', 'bi-grid', 'Dashboard', 'dashboard')}
    <div class="side-label">Catalog</div>
    ${item('/admin/books.html', 'bi-journal-bookmark', 'Books', 'books')}
    ${item('/admin/posts.html', 'bi-file-earmark-text', 'Articles', 'posts')}
    ${item('/admin/podcasts.html', 'bi-mic', 'Podcasts', 'podcasts')}
    ${item('/admin/media.html', 'bi-images', 'Media library', 'media')}
    ${item('/admin/taxonomy.html', 'bi-tags', 'Categories & tags', 'taxonomy')}
    <div class="side-label">Sales</div>
    ${item('/admin/orders.html', 'bi-receipt', 'Orders', 'orders')}
    ${isOwner ? `<div class="side-label">Team</div>${item('/admin/users.html', 'bi-people', 'Publisher accounts', 'users')}` : ''}
    <div class="side-label">&nbsp;</div>
    <a href="#" id="admin-logout"><i class="bi bi-box-arrow-left"></i> Log out</a>
    <div style="margin-top:1.2rem; padding:0.7rem; font-size:0.78rem; color:#8b8d97;">
      Signed in as<br><strong style="color:#d6d7dd;">${escapeHtml(admin ? admin.fullName || admin.email : '')}</strong>
    </div>`;

  document.getElementById('admin-logout').addEventListener('click', async (e) => {
    e.preventDefault();
    try { await api('/admin/auth/logout', { method: 'POST', admin: true }); } catch (_) {}
    AUTH.logoutAdmin();
    window.location.href = '/admin/login.html';
  });
}

async function initAdminPage() {
  const admin = await guardAdmin();
  if (!admin) return null;
  renderAdminSidebar(admin);
  return admin;
}

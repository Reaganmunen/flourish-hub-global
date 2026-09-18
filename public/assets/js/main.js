/* ============================================================
   FOLIO HOUSE — shared chrome for public pages
   Every page has <header id="site-header"></header> and
   <footer id="site-footer"></footer> placeholders; this fills
   them in so the nav/footer only need to be maintained in one place.
   Set window.ACTIVE_NAV = 'shop' | 'articles' | 'podcasts' | 'about'
   before this script runs to highlight the current section.
   ============================================================ */

function renderHeader() {
  const host = document.getElementById('site-header');
  if (!host) return;
  const active = window.ACTIVE_NAV || '';
  const customer = AUTH.getCustomer();
  const link = (href, label, key) =>
    `<a href="${href}" class="${active === key ? 'active' : ''}">${label}</a>`;

  host.innerHTML = `
    <div class="nav-inner">
      <a href="/index.html" class="brand-mark">
        <img src="/assets/images/logo-flourishhub.jpeg" alt="FlourishHub" class="brand-logo-img">
        <span>Flourish Hub Global</span>
      </a>
      <nav class="nav-links" id="nav-links">
        ${link('/shop.html', 'Shop', 'shop')}
        ${link('/articles.html', 'Articles', 'articles')}
        ${link('/podcasts.html', 'Podcasts', 'podcasts')}
        ${link('/about.html', 'About', 'about')}
      </nav>
      <div class="nav-actions">
        <a href="${customer ? '/account.html' : '/login.html'}" class="nav-icon-link" title="${customer ? 'My account' : 'Log in'}">
          <i class="bi bi-person"></i>
        </a>
        <a href="/cart.html" class="nav-icon-link" title="Bag">
          <i class="bi bi-bag"></i>
          <span class="cart-badge">0</span>
        </a>
        <button class="nav-toggle" id="nav-toggle" aria-label="Menu"><i class="bi bi-list"></i></button>
      </div>
    </div>`;

  document.getElementById('nav-toggle').addEventListener('click', () => {
    document.getElementById('nav-links').classList.toggle('open');
  });
  updateCartBadge();
}

function renderFooter() {
  const host = document.getElementById('site-footer');
  if (!host) return;
  host.innerHTML = `
    <div class="container-folio">
      <div class="row gy-4">
        <div class="col-6 col-md-3">
          <div class="brand-mark" style="color:#fff; font-size:1.2rem; margin-bottom:1rem;">
            <img src="/assets/images/logo-flourishhub.jpeg" alt="FlourishHub" class="brand-logo-img" style="filter:none;">
            <span>Flourish Hub Global</span>
          </div>
          <p style="color:#9a9ba3; font-size:0.88rem; max-width:26ch;">Nourishing to flourish — books, essays and audio for the journey from survival to abundance.</p>
        </div>
        <div class="col-6 col-md-3">
          <h5>Read</h5>
          <div class="d-flex flex-column gap-2">
            <a href="/shop.html">Shop books</a>
            <a href="/articles.html">Articles</a>
            <a href="/podcasts.html">Podcasts</a>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <h5>Account</h5>
          <div class="d-flex flex-column gap-2">
            <a href="/account.html">My account</a>
            <a href="/order-lookup.html">Track an order</a>
            <a href="/cart.html">My bag</a>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <h5>Studio</h5>
          <div class="d-flex flex-column gap-2">
            <a href="/about.html">About</a>
            <a href="/admin/login.html">Publisher login</a>
          </div>
        </div>
      </div>
      <div class="foot-note">© ${new Date().getFullYear()} Flourish Hub Global. All rights reserved.</div>
    </div>`;
}

document.addEventListener('DOMContentLoaded', () => {
  renderHeader();
  renderFooter();
});

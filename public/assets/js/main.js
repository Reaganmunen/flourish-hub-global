/* ============================================================
   FlourishHub: shared chrome for public pages
   Every page has <header id="site-header"></header> and
   <footer id="site-footer"></footer> placeholders; this fills
   them in so the nav and footer only need to be maintained in one place.
   Set window.ACTIVE_NAV before this script runs to highlight the
   current section. Keys: about, programmes, academy, impact, gallery,
   resources, articles, podcasts, shop, partner, contact.
   ============================================================ */

/* Contact details shown on the Contact page and in the footer.
   Anything left empty is simply not shown. Fill these in with the
   official details once they are confirmed. */
const SITE = {
  name: 'FlourishHub',
  fullName: 'FlourishHub | The Centre for Human Flourishing',
  tagline: 'Catalysing Human Flourishing. Unlocking Potential. Transforming Lives.',
  contact: {
    email: '',
    phone: '',
    location: '',
    website: '',
  },
  social: {
    // e.g. facebook: 'https://facebook.com/yourpage'
    facebook: '',
    instagram: '',
    linkedin: '',
    x: '',
    youtube: '',
    tiktok: '',
  },
};

function renderHeader() {
  const host = document.getElementById('site-header');
  if (!host) return;
  const active = window.ACTIVE_NAV || '';
  const customer = AUTH.getCustomer();

  const link = (href, label, key) =>
    `<a href="${href}" class="${active === key ? 'active' : ''}">${label}</a>`;
  const group = (label, keys, children) => `
    <div class="nav-group ${keys.includes(active) ? 'has-active' : ''}">
      <button type="button" class="nav-group-btn" aria-haspopup="true" aria-expanded="false">${label} <i class="bi bi-chevron-down"></i></button>
      <div class="nav-drop">${children}</div>
    </div>`;

  host.innerHTML = `
    <div class="nav-inner">
      <a href="/index.html" class="brand-mark">
        <img src="/assets/images/logo-flourishhub.jpeg" alt="FlourishHub logo" class="brand-logo-img">
        <span class="brand-text">FlourishHub<small>The Centre for Human Flourishing</small></span>
      </a>
      <nav class="nav-links" id="nav-links" aria-label="Main">
        ${link('/about.html', 'About Us', 'about')}
        ${group('Programmes', ['programmes', 'academy'],
          link('/programmes.html', 'Our Programmes', 'programmes') +
          link('/academy.html', 'Peace and Leadership Academy', 'academy'))}
        ${group('Impact', ['impact', 'gallery'],
          link('/impact.html', 'Impact &amp; Stories', 'impact') +
          link('/gallery.html', 'Gallery', 'gallery'))}
        ${group('Resources', ['resources', 'articles', 'podcasts'],
          link('/articles.html', 'Articles and Guides', 'articles') +
          link('/podcasts.html', 'Podcasts', 'podcasts'))}
        ${link('/shop.html', 'Shop', 'shop')}
        ${link('/contact.html', 'Contact', 'contact')}
        <a href="/partner.html" class="nav-cta ${active === 'partner' ? 'active' : ''}">Partner With Us</a>
      </nav>
      <div class="nav-actions">
        <a href="${customer ? '/account.html' : '/login.html'}" class="nav-icon-link" title="${customer ? 'My account' : 'Log in'}" aria-label="${customer ? 'My account' : 'Log in'}">
          <i class="bi bi-person"></i>
        </a>
        <a href="/cart.html" class="nav-icon-link" title="Bag" aria-label="Shopping bag">
          <i class="bi bi-bag"></i>
          <span class="cart-badge">0</span>
        </a>
        <button class="nav-toggle" id="nav-toggle" aria-label="Menu" aria-expanded="false"><i class="bi bi-list"></i></button>
      </div>
    </div>`;

  const links = document.getElementById('nav-links');
  const toggle = document.getElementById('nav-toggle');
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  // Dropdown groups: click to open (works on touch), close on outside click or Escape.
  const groups = Array.from(host.querySelectorAll('.nav-group'));
  const closeAll = (except) => groups.forEach((g) => {
    if (g !== except) { g.classList.remove('open'); g.querySelector('.nav-group-btn').setAttribute('aria-expanded', 'false'); }
  });
  groups.forEach((g) => {
    const btn = g.querySelector('.nav-group-btn');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = g.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
      closeAll(g);
    });
  });
  document.addEventListener('click', () => closeAll());
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });

  updateCartBadge();
}

function socialLinks() {
  const icons = { facebook: 'facebook', instagram: 'instagram', linkedin: 'linkedin', x: 'twitter-x', youtube: 'youtube', tiktok: 'tiktok' };
  return Object.entries(SITE.social)
    .filter(([, url]) => url)
    .map(([k, url]) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener" aria-label="${k}"><i class="bi bi-${icons[k] || 'link-45deg'}"></i></a>`)
    .join('');
}

function renderFooter() {
  const host = document.getElementById('site-footer');
  if (!host) return;
  const social = socialLinks();
  const c = SITE.contact;
  host.innerHTML = `
    <div class="container-folio">
      <div class="row gy-4">
        <div class="col-12 col-md-4">
          <div class="brand-mark" style="color:#fff; font-size:1.2rem; margin-bottom:1rem;">
            <img src="/assets/images/logo-flourishhub.jpeg" alt="FlourishHub logo" class="brand-logo-img" style="filter:none;">
            <span class="brand-text">FlourishHub<small>The Centre for Human Flourishing</small></span>
          </div>
          <p style="color:#b4b5bd; font-size:0.9rem; max-width:34ch;">Catalysing human flourishing. Unlocking potential. Transforming lives. We equip people to grow with purpose, lead with integrity, build peace and create meaningful impact.</p>
          ${social ? `<div class="foot-social">${social}</div>` : ''}
        </div>
        <div class="col-6 col-md-2">
          <h5>About</h5>
          <div class="d-flex flex-column gap-2">
            <a href="/about.html">About Us</a>
            <a href="/programmes.html">Our Programmes</a>
            <a href="/academy.html">Peace and Leadership Academy</a>
            <a href="/impact.html">Impact &amp; Stories</a>
          </div>
        </div>
        <div class="col-6 col-md-2">
          <h5>Get involved</h5>
          <div class="d-flex flex-column gap-2">
            <a href="/partner.html">Partner With Us</a>
            <a href="/articles.html">Resources</a>
            <a href="/podcasts.html">Podcasts</a>
            <a href="/gallery.html">Gallery</a>
            <a href="/contact.html">Contact</a>
          </div>
        </div>
        <div class="col-6 col-md-2">
          <h5>Shop</h5>
          <div class="d-flex flex-column gap-2">
            <a href="/shop.html">Books</a>
            <a href="/account.html">My account</a>
            <a href="/order-lookup.html">Track an order</a>
            <a href="/cart.html">My bag</a>
          </div>
        </div>
        <div class="col-6 col-md-2">
          <h5>Contact</h5>
          <div class="d-flex flex-column gap-2 foot-contact">
            ${c.email ? `<a href="mailto:${escapeHtml(c.email)}">${escapeHtml(c.email)}</a>` : ''}
            ${c.phone ? `<a href="tel:${escapeHtml(c.phone.replace(/\s+/g, ''))}">${escapeHtml(c.phone)}</a>` : ''}
            ${c.location ? `<span>${escapeHtml(c.location)}</span>` : ''}
            <a href="/contact.html">Send an enquiry</a>
          </div>
        </div>
      </div>
      <div class="foot-note d-flex justify-content-between flex-wrap gap-2">
        <span>&copy; ${new Date().getFullYear()} FlourishHub. All rights reserved.</span>
        <span class="foot-legal"><a href="/privacy.html">Privacy Notice</a><a href="/safeguarding.html">Safeguarding</a><a href="/admin/login.html">Staff login</a></span>
      </div>
    </div>`;
}

/* Shared enquiry form handler used by Contact, Partner and the newsletter box.
   formEl needs inputs named name, organization, email, phone, topic, message, consent
   (any can be missing) plus a hidden "website" honeypot field. */
async function submitEnquiry(formEl, source, { successMessage, resetOnSuccess = true } = {}) {
  const btn = formEl.querySelector('button[type="submit"], button:not([type])');
  const data = { source };
  new FormData(formEl).forEach((value, key) => { data[key] = value; });
  data.consent = !!(formEl.elements.consent && formEl.elements.consent.checked);
  const original = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }
  try {
    await api('/contact', { method: 'POST', body: data, auth: false });
    toast(successMessage || 'Thank you. We have received your message.');
    if (resetOnSuccess) formEl.reset();
    return true;
  } catch (err) {
    toast(err.message || 'Could not send your message. Please try again.', false);
    return false;
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = original; }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderHeader();
  renderFooter();
});

/* FlourishHub motion layer. Safe to load on every page. */
(function () {
  if ('onpagereveal' in window) document.documentElement.classList.add('vt');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  // scroll progress + header state + back-to-top
  var bar = document.createElement('div'); bar.id = 'scroll-progress'; document.body.appendChild(bar);
  var top = document.createElement('button'); top.id = 'to-top'; top.setAttribute('aria-label', 'Back to top');
  top.innerHTML = '<i class="bi bi-arrow-up"></i>';
  top.onclick = function () { scrollTo({ top: 0, behavior: 'smooth' }); };
  document.body.appendChild(top);
  var tick = false;
  function onScroll() {
    var h = document.documentElement, max = h.scrollHeight - h.clientHeight;
    bar.style.transform = 'scaleX(' + (max > 0 ? scrollY / max : 0) + ')';
    var hd = document.getElementById('site-header'); if (hd) hd.classList.toggle('scrolled', scrollY > 12);
    top.classList.toggle('show', scrollY > 700);
    tick = false;
  }
  addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  // reveal on scroll
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  function reveal(el, i) {
    if (el.classList.contains('rv') || el.closest('.hero')) return;
    el.style.setProperty('--i', Math.min(i || 0, 8));
    el.classList.add('rv'); io.observe(el);
  }
  var STATIC = '.section-head, .panel, .locked-panel, .filter-block, .article-body, .stat-card, main h1, .container-folio > h1, .container-folio > p.text-muted-folio';
  var ITEMS = '.row > .col-md-4, .form-folio > *, #article-detail > *, #podcast-detail > *, #book-detail .col-md-7 > *, #account-root > *, #lookup-result > *, .book-card, .content-row, #home-podcasts > *, #podcasts-list > *, .card-grid > *, tbody tr';
  function scan(root) {
    if (reduce) return;
    root.querySelectorAll('.empty-state').forEach(function (el) { el.classList.toggle('is-loading', /^(loading|looking)/i.test(el.textContent.trim())); });
    root.querySelectorAll(STATIC).forEach(function (el) { reveal(el, 0); });
    var groups = new Map();
    root.querySelectorAll(ITEMS).forEach(function (el) {
      var p = el.parentElement, n = groups.get(p) || 0; groups.set(p, n + 1); reveal(el, n);
    });
  }
  scan(document);
  if (!reduce) new MutationObserver(function (ms) {
    ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) { scan(n); if (n.matches && n.matches(ITEMS)) reveal(n, 0); } }); });
  }).observe(document.body, { childList: true, subtree: true });

  // background slideshows on inner page banners
  document.querySelectorAll('[data-slides]').forEach(function (box) {
    var urls = box.dataset.slides.split(','), i = 0;
    box.innerHTML = urls.map(function (u) { return '<div class="hs" style="background-image:url(\'' + u + '\')"></div>'; }).join('');
    var sl = box.children; sl[0].classList.add('on');
    if (sl.length > 1) setInterval(function () { sl[i].classList.remove('on'); i = (i + 1) % sl.length; sl[i].classList.add('on'); }, 6500);
  });
  // marquee: duplicate content for seamless loop
  document.querySelectorAll('.marquee-track').forEach(function (t) { t.innerHTML += t.innerHTML; });

  // page transitions
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank' || a.hasAttribute('download')) return;
    var u = new URL(a.href, location.href);
    if (u.origin !== location.origin || (u.pathname === location.pathname && u.hash)) return;
    if (reduce || 'onpagereveal' in window) return;
    e.preventDefault(); document.body.classList.add('leaving');
    setTimeout(function () { location.href = a.href; }, 230);
  });
  addEventListener('pageshow', function (e) { if (e.persisted) document.body.classList.remove('leaving'); });

  if (!fine || reduce) return;

  // cursor spotlight on panels
  document.addEventListener('pointermove', function (e) {
    var p = e.target.closest && e.target.closest('.panel, .locked-panel'); if (!p) return;
    var r = p.getBoundingClientRect();
    p.style.setProperty('--mx', (e.clientX - r.left) + 'px'); p.style.setProperty('--my', (e.clientY - r.top) + 'px');
  });

  // magnetic buttons
  document.addEventListener('pointermove', function (e) {
    var b = e.target.closest && e.target.closest('.btn-folio:not(.btn-folio-block):not(:disabled)');
    document.querySelectorAll('.btn-folio.mag').forEach(function (x) { if (x !== b) { x.classList.remove('mag'); x.style.translate = ''; } });
    if (!b) return;
    var r = b.getBoundingClientRect(); b.classList.add('mag');
    b.style.translate = ((e.clientX - r.left - r.width / 2) * 0.15) + 'px ' + ((e.clientY - r.top - r.height / 2) * 0.25) + 'px';
  });

  // hero covers: gentle parallax tilt
  var hc = document.getElementById('hero-covers');
  if (hc) {
    var hero = hc.closest('.hero');
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      hc.style.transform = 'perspective(1000px) rotateY(' + (x * 8) + 'deg) rotateX(' + (-y * 6) + 'deg)';
    });
    hero.addEventListener('pointerleave', function () { hc.style.transform = ''; });
    hc.style.transition = 'transform .6s cubic-bezier(.22,1,.36,1)';
  }

  // cart badge pop when it changes
  var badge = document.querySelector('.cart-badge');
  if (badge) new MutationObserver(function () { badge.classList.remove('pop'); void badge.offsetWidth; badge.classList.add('pop'); })
    .observe(badge, { childList: true, characterData: true, subtree: true });
})();
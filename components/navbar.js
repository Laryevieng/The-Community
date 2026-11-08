// ============================================================
//  components/navbar.js — Retro Archive Navbar Component
// ============================================================

function renderNavbar(activePage = '') {
  const navbarHTML = `
    <nav id="navbar">
      <a href="index.html" class="nav-brand" aria-label="Dangerous Boys Beranda">
        <span class="nav-logo">Dangerous Boys</span>
        <span class="nav-badge">BJR·18</span>
      </a>

      <ul class="nav-links">
        <li><a href="index.html#retro-game">Game Bola ⚽</a></li>
        <li><a href="index.html#hero">Arsip Utama</a></li>
        <li><a href="index.html#about" ${activePage==='about' ? 'class="nav-active"' : ''}>Sejarah</a></li>
        <li><a href="index.html#party" ${activePage==='party' ? 'class="nav-active"' : ''}>Perayaan</a></li>
        <li><a href="index.html#dear-banjar" ${activePage==='dear' ? 'class="nav-active"' : ''}>Dear Banjar</a></li>
        <li><a href="index.html#news" ${activePage==='news' ? 'class="nav-active"' : ''}>Warta Jurnal</a></li>
        <li><a href="admin.html" class="nav-admin-link">Katalog Redaksi</a></li>
      </ul>

      <button class="hamburger" id="hamburger" aria-label="Buka Menu" aria-expanded="false">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>
    </nav>

    <!-- Mobile Menu -->
    <div class="mobile-menu" id="mobileMenu" role="dialog" aria-modal="true" aria-label="Menu navigasi">
      <div class="mobile-menu-header">
        <span class="mobile-brand">Dangerous Boys</span>
        <button class="mobile-close" id="mobileClose" aria-label="Tutup Menu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="mobile-menu-nav">
        <a href="index.html#about" class="mobile-link">Sejarah Komunitas</a>
        <a href="index.html#party" class="mobile-link">Dokumentasi Perayaan</a>
        <a href="index.html#dear-banjar" class="mobile-link">Dear Banjar City</a>
        <a href="index.html#news" class="mobile-link">Warta Jurnal</a>
        <a href="admin.html" class="mobile-link mobile-link-admin">Masuk Meja Redaksi →</a>
      </div>
    </div>
  `;

  const root = document.getElementById('navbar-root');
  if (root) root.innerHTML = navbarHTML;

  initNavbar();
}

function closeMobileMenu() {
  const mobileMenu = document.getElementById('mobileMenu');
  const hamburger = document.getElementById('hamburger');
  if (mobileMenu) mobileMenu.classList.remove('open');
  if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

function initNavbar() {
  const nav = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileClose = document.getElementById('mobileClose');

  if (!nav) return;

  function handleScroll() {
    nav.classList.toggle('scrolled', window.scrollY > 30);
  }
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  if (hamburger) {
    hamburger.addEventListener('click', () => {
      mobileMenu.classList.add('open');
      hamburger.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    });
  }

  if (mobileClose) {
    mobileClose.addEventListener('click', closeMobileMenu);
  }

  if (mobileMenu) {
    mobileMenu.addEventListener('click', (e) => {
      if (e.target === mobileMenu) closeMobileMenu();
    });
  }

  document.querySelectorAll('.mobile-link').forEach(link => {
    link.addEventListener('click', closeMobileMenu);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMobileMenu();
  });

  document.querySelectorAll('a[href*="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      const hashIndex = href.indexOf('#');
      if (hashIndex === -1) return;

      const hash = href.slice(hashIndex);
      const isSamePage = href.slice(0, hashIndex) === '' ||
        href.slice(0, hashIndex) === window.location.pathname.split('/').pop();

      if (isSamePage) {
        const target = document.querySelector(hash);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });
}

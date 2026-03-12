// ============================================================
//  components/navbar.js — Navbar Component
//  Inject navbar ke <div id="navbar-root"></div>
// ============================================================

function renderNavbar(activePage = '') {
  const isAdmin = window.location.pathname.includes('admin');

  const navbarHTML = `
    <nav id="navbar">
      <a href="index.html" class="nav-logo">Dangerous Boys</a>

      <ul class="nav-links">
        <li><a href="index.html#about"   ${activePage==='about'   ? 'class="nav-active"' : ''}>About</a></li>
        <li><a href="index.html#party"   ${activePage==='party'   ? 'class="nav-active"' : ''}>Party</a></li>
        <li><a href="index.html#dear-banjar" ${activePage==='dear' ? 'class="nav-active"' : ''}>Dear Banjar City</a></li>
        <li><a href="index.html#news"    ${activePage==='news'    ? 'class="nav-active"' : ''}>News Dangerous Boys</a></li>
      </ul>

      <button class="hamburger" id="hamburger" aria-label="Buka Menu">
        <span></span>
        <span></span>
        <span></span>
      </button>
    </nav>

    <!-- Mobile Menu — overlay fullscreen, terpisah dari navbar -->
    <div class="mobile-menu" id="mobileMenu" role="dialog" aria-modal="true" aria-label="Menu navigasi">
      <button class="mobile-close" id="mobileClose" aria-label="Tutup Menu">✕</button>
      <a href="index.html#about"       class="mobile-link">About</a>
      <a href="index.html#party"       class="mobile-link">Party</a>
      <a href="index.html#dear-banjar" class="mobile-link">Dear Banjar City</a>
      <a href="index.html#news"        class="mobile-link">News Dangerous Boys</a>
    </div>
  `;

  const root = document.getElementById('navbar-root');
  if (root) root.innerHTML = navbarHTML;

  initNavbar();
}

function initNavbar() {
  const nav        = document.getElementById('navbar');
  const hamburger  = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileClose= document.getElementById('mobileClose');

  if (!nav) return;

  // Scroll: tambah class .scrolled
  function handleScroll() {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  }
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll(); // jalankan sekali saat load

  // Hamburger → buka mobile menu
  hamburger && hamburger.addEventListener('click', () => {
    mobileMenu.classList.add('open');
    document.body.style.overflow = 'hidden';
  });

  // Tombol close → tutup mobile menu
  mobileClose && mobileClose.addEventListener('click', closeMobileMenu);

  // Klik di luar konten → tutup mobile menu
  mobileMenu && mobileMenu.addEventListener('click', (e) => {
    if (e.target === mobileMenu) closeMobileMenu();
  });

  // Link di mobile menu → tutup setelah klik
  document.querySelectorAll('.mobile-link').forEach(link => {
    link.addEventListener('click', closeMobileMenu);
  });

  // ESC → tutup mobile menu
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMobileMenu();
  });

  // Smooth scroll untuk anchor link
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

function closeMobileMenu() {
  const mobileMenu = document.getElementById('mobileMenu');
  if (mobileMenu) mobileMenu.classList.remove('open');
  document.body.style.overflow = '';
}
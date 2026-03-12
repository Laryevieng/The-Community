// ============================================================
//  js/animation.js — Scroll Reveal & Animasi
// ============================================================

let revealObserver = null;

/**
 * Inisialisasi IntersectionObserver untuk scroll reveal
 * Elemen dengan class: .reveal, .reveal-left, .reveal-right
 */
function initScrollReveal() {
  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        // Unobserve setelah visible agar tidak re-trigger
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
  });

  observeRevealElements();
}

/**
 * Observe semua elemen reveal yang ada di DOM
 * Dipanggil ulang setelah dynamic content (news) dimuat
 */
function observeRevealElements() {
  const selectors = '.reveal, .reveal-left, .reveal-right';
  document.querySelectorAll(selectors).forEach(el => {
    if (!el.classList.contains('visible')) {
      revealObserver && revealObserver.observe(el);
    }
  });
}

/**
 * Inisialisasi hero parallax ringan
 */
function initHeroParallax() {
  const heroBg = document.querySelector('.hero-bg');
  if (!heroBg) return;

  window.addEventListener('scroll', () => {
    const scrolled = window.scrollY;
    if (scrolled < window.innerHeight) {
      heroBg.style.transform = `translateY(${scrolled * 0.25}px)`;
    }
  }, { passive: true });
}

/**
 * Inisialisasi semua animasi — dipanggil dari main.js
 */
function initAnimations() {
  initScrollReveal();
  initHeroParallax();
}
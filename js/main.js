// ============================================================
//  js/main.js — Entry Point untuk index.html
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  // 1. Render komponen
  renderNavbar();
  renderFooter();

  // 2. Inisialisasi animasi
  initAnimations();

  // 3. Inisialisasi modal
  initModal();

  // 4. Load berita dari Supabase
  loadNews();
});
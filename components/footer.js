// ============================================================
//  components/footer.js — Retro Colophon Footer Component
// ============================================================

function renderFooter() {
  const currentYear = new Date().getFullYear();
  const footerHTML = `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-top">
          <div class="footer-brand-block">
            <div class="footer-brand">
              <span class="footer-logo">Dangerous Boys</span>
              <span class="footer-meta-pill">KATALOG ARSIP 2018–${currentYear}</span>
            </div>
            <p class="footer-tagline">
              Dokumentasi persahabatan, ruang temu, dan arsip visual pemuda Banjar City.
              Dicetak dan dirawat bersama sejak 2018 dari SMKN 2 Banjar.
            </p>
          </div>
          <nav class="footer-nav" aria-label="Navigasi footer">
            <div class="footer-nav-col">
              <span class="footer-col-title">Index Arsip</span>
              <a href="index.html#about">Sejarah Komunitas</a>
              <a href="index.html#party">Dokumentasi Party</a>
              <a href="index.html#dear-banjar">Dear Banjar City</a>
              <a href="index.html#news">Warta Jurnal</a>
            </div>
            <div class="footer-nav-col">
              <span class="footer-col-title">Redaksi</span>
              <a href="admin.html">Meja Redaksi Admin</a>
              <a href="#navbar">Kembali ke Atas ↑</a>
            </div>
          </nav>
        </div>

        <div class="footer-bottom">
          <p>© ${currentYear} Dangerous Boys. Catatan dan dokumentasi bersama di Kota Banjar, Jawa Barat.</p>
          <p>KODAK 400 · 35MM RETRO ARCHIVE SYSTEM</p>
        </div>
      </div>
    </footer>
  `;

  const root = document.getElementById('footer-root');
  if (root) root.innerHTML = footerHTML;
}

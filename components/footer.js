// ============================================================
//  components/footer.js — Footer Component
//  Inject footer ke <div id="footer-root"></div>
// ============================================================

function renderFooter() {
  const footerHTML = `
    <footer>
      <div class="footer-inner">
        <div class="footer-top">
          <div class="footer-brand-block">
            <div class="footer-brand">Dangerous <span>Boys</span></div>
            <p class="footer-tagline">Banjar City · West Java · Indonesia</p>
          </div>
          <nav class="footer-links" aria-label="Footer navigation">
            <a href="index.html#about">About</a>
            <a href="index.html#party">Party</a>
            <a href="index.html#dear-banjar">Dear Banjar City</a>
            <a href="index.html#news">News Dangerous Boys</a>
            <a href="admin.html">Admin Dashboard</a>
          </nav>
        </div>
        <div class="footer-bottom">
          <p class="footer-copy">© ${new Date().getFullYear()} Dangerous Boys. Semua cerita adalah milik kita bersama.</p>
          <p class="footer-city"><em>Dari Banjar, untuk dunia.</em></p>
        </div>
      </div>
    </footer>
  `;

  const root = document.getElementById('footer-root');
  if (root) root.innerHTML = footerHTML;
}
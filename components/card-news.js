// ============================================================
//  components/card-news.js — News Card Component (Warm Retro Archive)
// ============================================================

/**
 * Format tanggal bergaya mesin tik / arsip
 * @param {string} dateStr - ISO date string
 */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Buat HTML satu news card
 * @param {Object} post - data post dari Supabase
 * @param {number} index - index untuk urutan animasi
 */
function createNewsCard(post, index = 0) {
  const safePost = JSON.stringify(post).replace(/'/g, "&#39;").replace(/"/g, '&quot;');

  const imageHTML = post.image_url
    ? `<img src="${post.image_url}" alt="${escapeHtml(post.title)}" loading="lazy" />`
    : `<div class="nc-img-placeholder">
         <span class="nc-ph-tag">Klise Teks</span>
         <span class="nc-ph-title">${escapeHtml(post.title)}</span>
       </div>`;

  return `
    <article
      class="news-card reveal"
      onclick='openNewsModal(${safePost})'
      tabindex="0"
      role="button"
      aria-label="Buka warta: ${escapeHtml(post.title)}"
      onkeydown="if(event.key==='Enter')openNewsModal(${safePost})"
    >
      <div class="news-card-img">
        ${imageHTML}
      </div>
      <div class="news-card-body">
        <div class="nc-meta">
          <span class="nc-author">${escapeHtml(post.author || 'Dangerous Boys')}</span>
          <span>/</span>
          <time class="nc-date">${formatDate(post.created_at)}</time>
        </div>
        <h3 class="nc-title">${escapeHtml(post.title)}</h3>
        <p class="nc-story">${escapeHtml(post.story)}</p>
        <div class="nc-footer">
          <span class="nc-read">
            Baca Klise Berita
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </span>
        </div>
      </div>
    </article>
  `;
}

/**
 * Render loading state
 */
function createNewsLoading() {
  return `
    <div class="news-state" style="grid-column:1/-1">
      <div class="news-state-spinner"></div>
      <p class="news-state-msg">Memuat lembar arsip warta...</p>
    </div>
  `;
}

/**
 * Render empty state
 * @param {string} msg - pesan utama
 * @param {string} sub - penjelasan ringkas
 */
function createNewsEmpty(msg = 'Belum ada catatan yang diterbitkan.', sub = '') {
  return `
    <div class="news-state" style="grid-column:1/-1">
      <p class="news-state-msg">${msg}</p>
      ${sub ? `<p class="news-state-sub">${sub}</p>` : ''}
    </div>
  `;
}

/**
 * Escape HTML untuk keamanan
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

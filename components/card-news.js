// ============================================================
//  components/card-news.js — News Card Component
//  Membangun HTML card berita dari data post Supabase
// ============================================================

/**
 * Format tanggal ke Bahasa Indonesia
 * @param {string} dateStr - ISO date string
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

/**
 * Buat HTML satu news card
 * @param {Object} post - data post dari Supabase
 * @param {number} index - index untuk stagger animation
 */
function createNewsCard(post, index = 0) {
  const delay = index * 0.1;
  const safePost = JSON.stringify(post).replace(/'/g, "&#39;").replace(/"/g, '&quot;');

  const imageHTML = post.image_url
    ? `<img src="${post.image_url}" alt="${escapeHtml(post.title)}" loading="lazy" />`
    : `<div class="nc-img-placeholder">${escapeHtml(post.title)}</div>`;

  return `
    <article
      class="news-card reveal"
      style="transition-delay: ${delay}s"
      onclick='openNewsModal(${safePost})'
      tabindex="0"
      role="button"
      aria-label="Baca: ${escapeHtml(post.title)}"
      onkeydown="if(event.key==='Enter')openNewsModal(${safePost})"
    >
      <div class="news-card-img">
        ${imageHTML}
      </div>
      <div class="nc-meta">
        <span class="nc-author">${escapeHtml(post.author || 'Dangerous Boys')}</span>
        <span class="nc-dot">·</span>
        <span class="nc-date">${formatDate(post.created_at)}</span>
      </div>
      <h3 class="nc-title">${escapeHtml(post.title)}</h3>
      <p class="nc-story">${escapeHtml(post.story)}</p>
      <span class="nc-read" aria-hidden="true">Baca Selengkapnya</span>
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
      <p>Memuat cerita...</p>
    </div>
  `;
}

/**
 * Render empty state
 * @param {string} msg - pesan utama
 * @param {string} sub - pesan kecil
 */
function createNewsEmpty(msg = 'Belum ada cerita.', sub = '') {
  return `
    <div class="news-state" style="grid-column:1/-1">
      <p class="news-state-msg">${msg}</p>
      ${sub ? `<small class="news-state-sub">${sub}</small>` : ''}
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
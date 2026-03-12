// ============================================================
//  js/news.js — Load & Render News dari Supabase
// ============================================================

/**
 * Load dan render semua news posts ke #newsGrid
 */
async function loadNews() {
  const grid = document.getElementById('newsGrid');
  if (!grid) return;

  // Belum dikonfigurasi
  if (!sbIsConfigured()) {
    grid.innerHTML = createNewsEmpty(
      'Belum ada cerita yang diterbitkan.',
      'Konfigurasikan Supabase di js/supabase.js untuk menampilkan berita.'
    );
    return;
  }

  // Loading state
  grid.innerHTML = createNewsLoading();

  try {
    const posts = await sbGetPosts();

    if (!posts || posts.length === 0) {
      grid.innerHTML = createNewsEmpty(
        'Belum ada cerita yang diterbitkan.',
        'Gunakan Admin Dashboard untuk menambahkan berita pertama.'
      );
      return;
    }

    // Render cards
    grid.innerHTML = posts.map((post, i) => createNewsCard(post, i)).join('');

    // Observe elemen baru untuk scroll reveal
    observeRevealElements();

  } catch (err) {
    console.error('[news.js] Error:', err);
    grid.innerHTML = createNewsEmpty(
      'Gagal memuat cerita.',
      'Periksa koneksi dan konfigurasi Supabase Anda.'
    );
  }
}
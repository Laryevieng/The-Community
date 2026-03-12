// ============================================================
//  js/modal.js — Image Popup Modal
// ============================================================

// Data statis untuk party dan Dear Banjar City
const STATIC_MODAL_DATA = {
  party1: {
    tag: 'Party Pertama · 2021',
    title: 'Malam Pertama Kita Merayakan',
    story: 'Malam di mana semuanya terasa seperti mimpi. Untuk pertama kalinya, Dangerous Boys berkumpul dalam perayaan yang sesungguhnya. Musik mengalun kencang, tawa tak berhenti, dan di bawah langit Banjar yang penuh bintang, kita membuat janji yang masih kita pegang hingga hari ini.',
    meta: '📍 Banjar City · 2021 · 40+ Tamu · SMKN 2 Banjar & Aliansi',
    image: null
  },
  party2: {
    tag: 'Party Kedua · 2023',
    title: 'Lebih Besar, Lebih Liar',
    story: 'Dua tahun berlalu, Dangerous Boys kembali dengan lebih banyak wajah, lebih banyak cerita, dan semangat yang tak pernah padam. Party kedua ini menjadi bukti bahwa persahabatan kami terus tumbuh — melampaui tembok sekolah, melampaui waktu.',
    meta: '📍 Banjar City · 2023 · 80+ Tamu · Seluruh Komunitas Banjar',
    image: null
  },
  banjar1: { tag: 'Dear Banjar City', title: 'Jalanan yang Selalu Memanggil Pulang', story: 'Di sini kita belajar arti pulang. Bukan pulang ke rumah, tapi pulang ke tempat di mana kita dikenal — di mana nama kita diucapkan dengan cinta.', meta: '📍 Banjar City · 2022', image: null },
  banjar2: { tag: 'Dear Banjar City', title: 'Komunitas yang Kita Bangun', story: 'Persahabatan yang ditempa dari keringat dan tawa. Dari obrolan di pinggir jalan hingga mimpi yang kita rangkai bersama.', meta: '📍 Banjar City · 2021', image: null },
  banjar3: { tag: 'Dear Banjar City', title: 'Wajah-Wajah Dangerous Boys', story: 'Wajah-wajah yang akan selalu aku rindukan. Setiap detail, setiap senyum, setiap tatapan yang menyimpan ribuan cerita yang tak terucapkan.', meta: '📍 Banjar City · 2023', image: null },
  banjar4: { tag: 'Dear Banjar City', title: 'Sejarah Kecil Kita', story: 'Kita menulis sejarah kecil kita sendiri. Tidak di buku pelajaran — tapi di hati masing-masing, dalam kenangan yang tak akan pernah pudar.', meta: '📍 Banjar City · 2022', image: null },
  banjar5: { tag: 'Dear Banjar City', title: 'Bangga Berdiri di Banjar', story: 'Banjar mengajarkan kita untuk bangga dengan tempat kita berdiri. Kota kecil ini memiliki jiwa yang besar — dan Dangerous Boys adalah salah satu denyutannya.', meta: '📍 Banjar City · 2023', image: null },
  banjar6: { tag: 'Dear Banjar City', title: 'Malam-Malam yang Membentuk Kita', story: 'Malam-malam panjang yang membentuk kita menjadi siapa kita hari ini. Setiap percakapan, setiap momen, adalah fondasi dari segalanya.', meta: '📍 Banjar City · 2022', image: null },
};

/**
 * Buka modal dengan key statis (party / dear banjar)
 * @param {string} key
 */
function openModal(key) {
  const d = STATIC_MODAL_DATA[key];
  if (!d) return;
  _showModal(d.tag, d.title, d.story, d.meta, d.image);
}

/**
 * Buka modal untuk news post dari Supabase
 * @param {Object} post
 */
function openNewsModal(post) {
  _showModal(
    `Oleh ${post.author || 'Dangerous Boys'}`,
    post.title,
    post.story,
    `📅 ${formatDate(post.created_at)}`,
    post.image_url || null
  );
}

/**
 * Internal: set konten dan tampilkan modal
 */
function _showModal(tag, title, story, meta, imgSrc) {
  document.getElementById('modalTag').textContent   = tag   || '';
  document.getElementById('modalTitle').textContent = title || '';
  document.getElementById('modalStory').textContent = story || '';
  document.getElementById('modalMeta').textContent  = meta  || '';

  const img = document.getElementById('modalImg');
  const ph  = document.getElementById('modalPh');

  if (imgSrc) {
    img.src = imgSrc;
    img.style.display = 'block';
    ph.style.display  = 'none';
    img.onerror = () => {
      img.style.display = 'none';
      ph.style.display  = 'flex';
      ph.textContent    = title;
    };
  } else {
    img.style.display = 'none';
    ph.style.display  = 'flex';
    ph.textContent    = title;
  }

  document.getElementById('modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

/**
 * Tutup modal
 */
function closeModal() {
  document.getElementById('modal').classList.remove('open');
  document.body.style.overflow = '';
}

/**
 * Inisialisasi event listener modal
 */
function initModal() {
  // Klik backdrop → tutup
  const modal = document.getElementById('modal');
  modal && modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // ESC → tutup
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}
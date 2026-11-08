// ============================================================
//  js/modal.js — Image Popup Modal
// ============================================================

// Data statis untuk party dan Dear Banjar City
const STATIC_MODAL_DATA = {
  party1: {
    tag: 'Arsip Perayaan · 2021',
    title: 'Malam Pertama Kita Merayakan',
    story: 'Malam pertama Dangerous Boys berkumpul dalam satu perayaan bersama. Musik mengalun, tawa terdengar sepanjang malam, dan di bawah langit Banjar kita menyepakati persahabatan yang bertahan sampai hari ini.',
    meta: 'Banjar City · 2021 · 40+ Hadir · SMKN 2 Banjar & Rekan Aliansi',
    image: 'assets/images/homeajay.jpeg'
  },
  party2: {
    tag: 'Arsip Perayaan · 2023',
    title: 'Lebih Luas, Lebih Dekat',
    story: 'Dua tahun berselang, pertemuan kedua mengumpulkan lebih banyak kawan dan cerita. Perayaan ini menegaskan ikatan pertemanan yang terus terjaga melampaui masa sekolah.',
    meta: 'Banjar City · 2023 · 80+ Hadir · Komunitas Pemuda Banjar',
    image: 'assets/images/socer.jpeg'
  },
  banjar1: {
    tag: 'Dear Banjar City · 01',
    title: 'Jalanan yang Selalu Menjadi Tempat Pulang',
    story: 'Di sini kita belajar arti pulang menuju ruang di mana nama kita dikenal dan diterima seutuhnya.',
    meta: 'Banjar City · 2022 · Dokumentasi Lapangan',
    image: 'assets/images/botak.jpeg'
  },
  banjar2: {
    tag: 'Dear Banjar City · 02',
    title: 'Ikatan Pertemanan yang Ditempa Bersama',
    story: 'Persahabatan yang terbentuk lewat keseharian dan kebersamaan di sudut kota Banjar.',
    meta: 'Banjar City · 2021 · Arsip Anggota',
    image: 'assets/images/scitem.jpeg'
  },
  banjar3: {
    tag: 'Dear Banjar City · 03',
    title: 'Potret Angkatan Dangerous Boys',
    story: 'Wajah-wajah yang mengawali langkah bersama dari masa sekolah hingga menapaki jalan masing-masing.',
    meta: 'Banjar City · 2023 · SMKN 2 Banjar',
    image: 'assets/images/wisudasmk1.jpeg'
  },
  banjar4: {
    tag: 'Dear Banjar City · 04',
    title: 'Catatan Perjalanan Bersama',
    story: 'Kita menyusun catatan perjalanan sendiri di memori masing-masing, tersimpan dalam cerita yang nyata.',
    meta: 'Banjar City · 2022 · Lapangan Olahraga',
    image: 'assets/images/socer2.jpeg'
  },
  banjar5: {
    tag: 'Dear Banjar City · 05',
    title: 'Rasa Bangga Berpijak di Banjar',
    story: 'Banjar mengajarkan kerendahan hati sekaligus keteguhan. Kota ini memberi ruang bertumbuh bagi Dangerous Boys.',
    meta: 'Banjar City · 2023 · Sudut Kota',
    image: 'assets/images/homeajay.jpeg'
  },
  banjar6: {
    tag: 'Dear Banjar City · 06',
    title: 'Malam-Malam Pembentuk Karakter',
    story: 'Pertemuan panjang di warung dan trotoar membentuk cara kita bersikap dan menjaga satu sama lain.',
    meta: 'Banjar City · 2022 · Dokumentasi Malam',
    image: 'assets/images/botak.jpeg'
  },
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
    `Ditulis oleh ${post.author || 'Dangerous Boys'}`,
    post.title,
    post.story,
    formatDate(post.created_at),
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
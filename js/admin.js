// ============================================================
//  js/admin.js — Admin Dashboard Logic
// ============================================================

const ADMIN_PASSWORD = 'dangerousboys2020$'; // ← Ganti password di sini

let allPosts = [];
let deleteTargetId = null;
let selectedFile = null; // File gambar yang dipilih, diupload saat submit

// ── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const dateEl = document.getElementById('adminDate');
    if (dateEl) {
        dateEl.textContent = new Date().toLocaleDateString('id-ID', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        });
    }
    initUploadArea();
});

// ── AUTH ──────────────────────────────────────────────────────
function doLogin() {
    const pw = document.getElementById('loginPass').value;
    if (pw === ADMIN_PASSWORD) {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('adminApp').style.display = 'flex';

        if (!sbIsConfigured()) {
            showToast('⚠️ Supabase belum dikonfigurasi — buka js/supabase.js', 'warning');
            const banner = document.getElementById('configBanner');
            if (banner) banner.style.display = 'flex';
        }

        loadAdminPosts();
    } else {
        document.getElementById('loginErr').style.display = 'block';
        document.getElementById('loginPass').value = '';
        document.getElementById('loginPass').focus();
    }
}

function doLogout() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('adminApp').style.display = 'none';
    document.getElementById('loginPass').value = '';
}

document.addEventListener('keydown', e => {
    const ls = document.getElementById('loginScreen');
    if (ls && ls.style.display !== 'none' && e.key === 'Enter') doLogin();
});

// ── TABS ──────────────────────────────────────────────────────
function showTab(tab, el) {
    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
    el.classList.add('active');
    document.getElementById('tabCreate').style.display = tab === 'create' ? 'block' : 'none';
    document.getElementById('tabList').style.display = tab === 'list' ? 'block' : 'none';
    document.getElementById('pageTitle').innerHTML = tab === 'create'
        ? 'Buat Post <em>Baru</em>'
        : 'Semua <em>Post</em>';
    if (tab === 'list') loadAdminPosts();
}

// ── TOAST ─────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = `toast ${type} show`;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 4500);
}

// ── SET STATUS di dalam form ───────────────────────────────────
function setFormStatus(msg, type = '') {
    const el = document.getElementById('formStatus');
    if (!el) return;
    el.textContent = msg;
    el.className = `form-status ${type}`;
    el.style.display = msg ? 'block' : 'none';
}

// ── LOAD POSTS ────────────────────────────────────────────────
async function loadAdminPosts() {
    const tbody = document.getElementById('postTableBody');
    if (!tbody) return;

    if (!sbIsConfigured()) {
        tbody.innerHTML = `
      <tr><td colspan="6" class="table-empty">
        ⚠️ Supabase belum dikonfigurasi.<br>
        <small>Buka <strong>js/supabase.js</strong> → ganti <code>SUPABASE_URL</code> dan <code>SUPABASE_KEY</code></small>
      </td></tr>`;
        document.getElementById('statTotal').textContent = '0';
        return;
    }

    tbody.innerHTML = `<tr><td colspan="6" class="table-empty">Memuat data...</td></tr>`;

    try {
        allPosts = await sbGetPosts();
        document.getElementById('statTotal').textContent = allPosts.length;
        renderAdminTable(allPosts);
    } catch (e) {
        console.error('[admin] loadAdminPosts:', e);
        tbody.innerHTML = `<tr><td colspan="6" class="table-empty">Gagal memuat post — periksa konfigurasi Supabase</td></tr>`;
        showToast('Gagal memuat post', 'error');
    }
}

function renderAdminTable(posts) {
    const tbody = document.getElementById('postTableBody');
    if (!posts.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="table-empty">Belum ada post. Buat yang pertama!</td></tr>`;
        return;
    }
    tbody.innerHTML = posts.map(p => `
    <tr>
      <td>
        ${p.image_url
            ? `<img class="post-thumb" src="${p.image_url}" alt="${escapeHtml(p.title)}" onerror="this.style.display='none'" />`
            : `<div class="post-thumb-ph">No Img</div>`}
      </td>
      <td><div class="post-title-cell">${escapeHtml(p.title)}</div></td>
      <td><div class="post-story-cell">${escapeHtml(p.story)}</div></td>
      <td><span class="badge-author">${escapeHtml(p.author || '—')}</span></td>
      <td class="post-date-cell">${formatDate(p.created_at)}</td>
      <td class="post-action-cell">
        <button class="btn-edit"   onclick="editPost('${p.id}')">Edit</button>
        <button class="btn-delete" onclick="askDelete('${p.id}')">Hapus</button>
      </td>
    </tr>
  `).join('');
}

function filterTable(q) {
    const lower = q.toLowerCase();
    const filtered = allPosts.filter(p =>
        p.title.toLowerCase().includes(lower) ||
        (p.author || '').toLowerCase().includes(lower) ||
        (p.story || '').toLowerCase().includes(lower)
    );
    renderAdminTable(filtered);
}

// ── SUBMIT (CREATE / EDIT) ────────────────────────────────────
async function submitPost() {
    setFormStatus('');

    // Cek Supabase
    if (!sbIsConfigured()) {
        setFormStatus('⚠️ Supabase belum dikonfigurasi. Buka js/supabase.js dan isi SUPABASE_URL & SUPABASE_KEY.', 'error');
        showToast('Supabase belum dikonfigurasi', 'warning');
        return;
    }

    const id = document.getElementById('editId').value;
    const title = document.getElementById('fTitle').value.trim();
    const story = document.getElementById('fStory').value.trim();
    const author = document.getElementById('fAuthor').value.trim();
    let imgUrl = document.getElementById('fImageUrl').value.trim();

    // Abaikan placeholder text file picker
    if (imgUrl.startsWith('(File dipilih')) imgUrl = '';

    // Validasi
    if (!title) { setFormStatus('Judul wajib diisi.', 'error'); document.getElementById('fTitle').focus(); return; }
    if (!story) { setFormStatus('Cerita wajib diisi.', 'error'); document.getElementById('fStory').focus(); return; }

    const btn = document.getElementById('btnSubmit');
    btn.disabled = true;

    try {
        // ── STEP 1: Upload foto ke Supabase Storage (jika ada file) ──
        if (selectedFile) {
            btn.textContent = '📤 Mengupload foto...';
            setFormStatus('Mengupload foto ke Supabase Storage...', 'info');

            try {
                imgUrl = await sbUploadImage(selectedFile);
                setFormStatus('Foto berhasil diupload. Menyimpan post...', 'info');
            } catch (uploadErr) {
                console.error('[admin] upload foto gagal:', uploadErr);
                setFormStatus(
                    `Upload foto gagal: ${uploadErr.message}\n` +
                    `Pastikan bucket "photos" sudah dibuat dan bersifat public di Supabase Storage.`,
                    'warning'
                );
                // Tanya apakah lanjut tanpa foto
                const lanjut = confirm(
                    `Upload foto gagal.\n\nKemungkinan penyebab:\n` +
                    `1. Bucket "photos" belum dibuat di Supabase → Storage → New bucket\n` +
                    `2. Policy belum diatur (allow insert for anon)\n\n` +
                    `Lanjutkan simpan post TANPA foto?`
                );
                if (!lanjut) {
                    btn.disabled = false;
                    btn.textContent = id ? 'Simpan Perubahan' : 'Terbitkan Post';
                    return;
                }
                imgUrl = ''; // Simpan tanpa foto
            }
        }

        // ── STEP 2: Simpan ke tabel news_posts ───────────────────
        btn.textContent = '💾 Menyimpan...';
        const body = {
            title,
            story,
            author: author || null,
            image_url: imgUrl || null
        };

        if (id) {
            await sbUpdatePost(id, body);
            showToast('✓ Post berhasil diperbarui!');
            setFormStatus('Post berhasil diperbarui!', 'success');
        } else {
            await sbCreatePost(body);
            showToast('✓ Post berhasil diterbitkan!');
            setFormStatus('Post berhasil diterbitkan!', 'success');
        }

        resetForm();
        // Pindah ke list untuk melihat hasilnya
        setTimeout(() => showTab('list', document.getElementById('navList')), 800);

    } catch (e) {
        console.error('[admin] submitPost error:', e);
        setFormStatus(`Gagal menyimpan post: ${e.message}`, 'error');
        showToast(`Gagal: ${e.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = document.getElementById('editId').value ? 'Simpan Perubahan' : 'Terbitkan Post';
    }
}

// ── EDIT POST ─────────────────────────────────────────────────
function editPost(id) {
    const post = allPosts.find(p => p.id === id);
    if (!post) return;

    document.getElementById('editId').value = id;
    document.getElementById('fTitle').value = post.title || '';
    document.getElementById('fStory').value = post.story || '';
    document.getElementById('fAuthor').value = post.author || '';
    document.getElementById('fImageUrl').value = post.image_url || '';

    // Preview foto yang sudah ada
    if (post.image_url) {
        document.getElementById('imgPreviewImg').src = post.image_url;
        document.getElementById('imgPreview').style.display = 'block';
    } else {
        clearImagePreview();
    }

    document.getElementById('formTitle').textContent = 'Edit Post';
    document.getElementById('btnSubmit').textContent = 'Simpan Perubahan';
    setFormStatus('');

    showTab('create', document.getElementById('navCreate'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
    ['editId', 'fTitle', 'fStory', 'fAuthor', 'fImageUrl'].forEach(id => {
        document.getElementById(id).value = '';
    });
    document.getElementById('formTitle').textContent = 'Post Baru';
    document.getElementById('btnSubmit').textContent = 'Terbitkan Post';
    setFormStatus('');
    selectedFile = null;
    clearImagePreview();
}

// ── DELETE ────────────────────────────────────────────────────
function askDelete(id) {
    deleteTargetId = id;
    document.getElementById('confirmOverlay').classList.add('open');
}
function cancelDelete() {
    deleteTargetId = null;
    document.getElementById('confirmOverlay').classList.remove('open');
}
async function confirmDelete() {
    if (!deleteTargetId) return;
    try {
        await sbDeletePost(deleteTargetId);
        showToast('Post berhasil dihapus');
        loadAdminPosts();
    } catch {
        showToast('Gagal menghapus post', 'error');
    }
    cancelDelete();
}

// ── IMAGE UPLOAD AREA ─────────────────────────────────────────
function initUploadArea() {
    const ua = document.getElementById('uploadArea');
    if (!ua) return;

    ['dragover', 'dragleave', 'drop'].forEach(ev => {
        ua.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); });
    });
    ua.addEventListener('dragover', () => ua.classList.add('dragover'));
    ua.addEventListener('dragleave', () => ua.classList.remove('dragover'));
    ua.addEventListener('drop', e => {
        ua.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            const input = document.getElementById('fImageFile');
            const dt = new DataTransfer();
            dt.items.add(file);
            input.files = dt.files;
            handleFileChange(input);
        }
    });
}

function handleFileChange(input) {
    const file = input.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        showToast('File terlalu besar — maks 5MB', 'error'); input.value = ''; return;
    }
    if (!file.type.startsWith('image/')) {
        showToast('Hanya file gambar yang diperbolehkan', 'error'); return;
    }

    selectedFile = file; // Disimpan, diupload saat tombol submit ditekan
    document.getElementById('fImageUrl').value = ''; // Kosongkan URL field

    const reader = new FileReader();
    reader.onload = e => {
        document.getElementById('imgPreviewImg').src = e.target.result;
        document.getElementById('imgPreview').style.display = 'block';
    };
    reader.readAsDataURL(file);

    showToast(`📷 "${file.name}" siap diupload`, 'info');
}

function clearImagePreview() {
    document.getElementById('imgPreview').style.display = 'none';
    document.getElementById('imgPreviewImg').src = '';
    const fi = document.getElementById('fImageFile');
    if (fi) fi.value = '';
    selectedFile = null;
}

// ── HELPERS ───────────────────────────────────────────────────
function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
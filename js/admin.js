// ============================================================
//  js/admin.js — Admin Dashboard Logic
//  Sistem Redaksi & Dokumentasi Dangerous Boys
// ============================================================

const ADMIN_PASSWORD = 'dangerousboys2020$'; // Kata sandi dashboard

let allPosts = [];
let deleteTargetId = null;
let selectedFile = null;

// ── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const dateEl = document.getElementById('adminDate');
    if (dateEl) {
        dateEl.textContent = new Date().toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
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
            showToast('Supabase belum terkonfigurasi. Periksa js/supabase.js', 'warning');
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
    if (el) el.classList.add('active');
    document.getElementById('tabCreate').style.display = tab === 'create' ? 'block' : 'none';
    document.getElementById('tabList').style.display = tab === 'list' ? 'block' : 'none';
    
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        pageTitle.textContent = tab === 'create' ? 'Tulis Post Baru' : 'Daftar Semua Post';
    }
    
    if (tab === 'list') loadAdminPosts();
}

// ── TOAST ─────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = `toast ${type} show`;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 4000);
}

// ── SET STATUS FORM ───────────────────────────────────────────
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
        Supabase belum dikonfigurasi.<br>
        <small>Buka <strong>js/supabase.js</strong> untuk memasukkan SUPABASE_URL dan SUPABASE_KEY</small>
      </td></tr>`;
        document.getElementById('statTotal').textContent = '0';
        return;
    }

    tbody.innerHTML = `<tr><td colspan="6" class="table-empty">Memuat data dari database...</td></tr>`;

    try {
        allPosts = await sbGetPosts();
        document.getElementById('statTotal').textContent = allPosts.length;
        renderAdminTable(allPosts);
    } catch (e) {
        console.error('[admin] loadAdminPosts:', e);
        tbody.innerHTML = `<tr><td colspan="6" class="table-empty">Gagal memuat post — periksa koneksi atau konfigurasi Supabase</td></tr>`;
        showToast('Gagal memuat data post', 'error');
    }
}

function renderAdminTable(posts) {
    const tbody = document.getElementById('postTableBody');
    if (!tbody) return;

    if (!posts.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="table-empty">Belum ada catatan. Silakan tulis catatan baru.</td></tr>`;
        return;
    }

    tbody.innerHTML = posts.map(p => `
    <tr>
      <td>
        ${p.image_url
            ? `<img class="post-thumb" src="${p.image_url}" alt="${escapeHtml(p.title)}" onerror="this.style.display='none'" />`
            : `<div class="post-thumb-ph">Teks</div>`}
      </td>
      <td><div class="post-title-cell">${escapeHtml(p.title)}</div></td>
      <td><div class="post-story-cell">${escapeHtml(p.story)}</div></td>
      <td><span class="badge-author">${escapeHtml(p.author || 'Dangerous Boys')}</span></td>
      <td class="post-date-cell">${formatDate(p.created_at)}</td>
      <td class="post-action-cell">
        <button class="btn-action-edit" onclick="editPost('${p.id}')">Edit</button>
        <button class="btn-action-delete" onclick="askDelete('${p.id}')">Hapus</button>
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

    if (!sbIsConfigured()) {
        setFormStatus('Supabase belum terkonfigurasi. Buka berkas js/supabase.js dan lengkapi konfigurasi.', 'error');
        showToast('Supabase belum terkonfigurasi', 'warning');
        return;
    }

    const id = document.getElementById('editId').value;
    const title = document.getElementById('fTitle').value.trim();
    const story = document.getElementById('fStory').value.trim();
    const author = document.getElementById('fAuthor').value.trim();
    let imgUrl = document.getElementById('fImageUrl').value.trim();

    if (imgUrl.startsWith('(File dipilih')) imgUrl = '';

    if (!title) {
        setFormStatus('Judul catatan wajib diisi.', 'error');
        document.getElementById('fTitle').focus();
        return;
    }
    if (!story) {
        setFormStatus('Isi cerita catatan wajib diisi.', 'error');
        document.getElementById('fStory').focus();
        return;
    }

    const btn = document.getElementById('btnSubmit');
    btn.disabled = true;

    try {
        if (selectedFile) {
            btn.innerHTML = '<span>Mengunggah foto...</span>';
            setFormStatus('Mengunggah berkas foto ke media penyimpanan...', 'info');

            try {
                imgUrl = await sbUploadImage(selectedFile);
                setFormStatus('Foto berhasil diunggah. Menyimpan data...', 'info');
            } catch (uploadErr) {
                console.error('[admin] upload foto gagal:', uploadErr);
                setFormStatus(
                    `Unggah foto gagal: ${uploadErr.message}\n` +
                    `Pastikan bucket "photos" telah dibuat di Supabase Storage.`,
                    'warning'
                );
                
                const lanjut = confirm(
                    `Unggah foto tidak berhasil.\n\nLanjutkan penyimpanan catatan tanpa foto?`
                );
                if (!lanjut) {
                    btn.disabled = false;
                    btn.innerHTML = `<span>${id ? 'Simpan Perubahan' : 'Terbitkan Post'}</span>`;
                    return;
                }
                imgUrl = '';
            }
        }

        btn.innerHTML = '<span>Menyimpan ke database...</span>';
        const body = {
            title,
            story,
            author: author || 'Dangerous Boys',
            image_url: imgUrl || null
        };

        if (id) {
            await sbUpdatePost(id, body);
            showToast('Catatan berhasil diperbarui.', 'success');
            setFormStatus('Catatan berhasil diperbarui.', 'success');
        } else {
            await sbCreatePost(body);
            showToast('Catatan berhasil diterbitkan.', 'success');
            setFormStatus('Catatan berhasil diterbitkan.', 'success');
        }

        resetForm();
        setTimeout(() => showTab('list', document.getElementById('navList')), 700);

    } catch (e) {
        console.error('[admin] submitPost error:', e);
        setFormStatus(`Gagal menyimpan catatan: ${e.message}`, 'error');
        showToast(`Gagal menyimpan: ${e.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<span>${document.getElementById('editId').value ? 'Simpan Perubahan' : 'Terbitkan Post'}</span>`;
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

    if (post.image_url) {
        document.getElementById('imgPreviewImg').src = post.image_url;
        document.getElementById('imgPreview').style.display = 'block';
    } else {
        clearImagePreview();
    }

    document.getElementById('formTitle').textContent = 'Edit Catatan';
    document.getElementById('btnSubmit').innerHTML = '<span>Simpan Perubahan</span>';
    setFormStatus('');

    showTab('create', document.getElementById('navCreate'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
    ['editId', 'fTitle', 'fStory', 'fAuthor', 'fImageUrl'].forEach(id => {
        document.getElementById(id).value = '';
    });
    document.getElementById('formTitle').textContent = 'Tulis Post Baru';
    document.getElementById('btnSubmit').innerHTML = '<span>Terbitkan Post</span>';
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
        showToast('Catatan berhasil dihapus dari arsip.', 'success');
        loadAdminPosts();
    } catch {
        showToast('Gagal menghapus catatan.', 'error');
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
        showToast('Ukuran berkas melebihi batas maksimum 5MB.', 'error');
        input.value = '';
        return;
    }
    if (!file.type.startsWith('image/')) {
        showToast('Format berkas harus berupa gambar.', 'error');
        return;
    }

    selectedFile = file;
    document.getElementById('fImageUrl').value = '';

    const reader = new FileReader();
    reader.onload = e => {
        document.getElementById('imgPreviewImg').src = e.target.result;
        document.getElementById('imgPreview').style.display = 'block';
    };
    reader.readAsDataURL(file);

    showToast(`Berkas "${file.name}" siap diunggah.`, 'info');
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
    return new Date(d).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

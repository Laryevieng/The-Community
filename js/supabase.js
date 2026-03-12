// ============================================================
//  supabase.js — Konfigurasi & Helper Supabase
//  Ganti SUPABASE_URL dan SUPABASE_KEY dengan milikmu
// ============================================================

const SUPABASE_URL = 'https://paehokhizfbsghbmuxpn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhZWhva2hpemZic2doYm11eHBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMDY1MjQsImV4cCI6MjA4ODg4MjUyNH0.b8MV2A2mPp4OF3eABG6CMVvawc7JvsgCVWKK8R2XL9k';

/**
 * Buat request headers untuk Supabase REST API
 */
function sbHeaders(extra = {}) {
    return {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
        ...extra
    };
}

/**
 * Cek apakah Supabase sudah dikonfigurasi
 */
function sbIsConfigured() {
    return SUPABASE_URL !== 'YOUR_SUPABASE_URL' &&
        SUPABASE_KEY !== 'YOUR_SUPABASE_ANON_KEY';
}

/**
 * GET semua news posts, diurutkan terbaru
 */
async function sbGetPosts() {
    const res = await fetch(
        `${SUPABASE_URL}/rest/v1/news_posts?select=*&order=created_at.desc`,
        { headers: sbHeaders() }
    );
    if (!res.ok) throw new Error('Failed to fetch posts');
    return res.json();
}

/**
 * CREATE post baru
 * @param {Object} data - { title, story, author, image_url }
 */
async function sbCreatePost(data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/news_posts`, {
        method: 'POST',
        headers: sbHeaders(),
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create post');
    return res.json();
}

/**
 * UPDATE post yang ada
 * @param {string} id - UUID post
 * @param {Object} data - field yang diupdate
 */
async function sbUpdatePost(id, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/news_posts?id=eq.${id}`, {
        method: 'PATCH',
        headers: sbHeaders(),
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update post');
    return res.json();
}

/**
 * DELETE post
 * @param {string} id - UUID post
 */
async function sbDeletePost(id) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/news_posts?id=eq.${id}`, {
        method: 'DELETE',
        headers: sbHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete post');
    return true;
}

/**
 * UPLOAD gambar ke Supabase Storage bucket "photos"
 * Mengembalikan public URL gambar yang bisa disimpan ke database
 *
 * Syarat di Supabase:
 *   1. Buat bucket bernama "photos" (Storage → New bucket)
 *   2. Set bucket ke PUBLIC
 *   3. Tambahkan policy: allow insert for anon
 *
 * @param {File} file - File object dari input[type=file]
 * @returns {string} Public URL gambar
 */
async function sbUploadImage(file) {
    // Buat nama file unik agar tidak bertabrakan
    const ext = file.name.split('.').pop().toLowerCase();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const path = `news/${fileName}`;

    const res = await fetch(
        `${SUPABASE_URL}/storage/v1/object/photos/${path}`,
        {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': file.type,
                'x-upsert': 'false'
            },
            body: file
        }
    );

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Upload gagal');
    }

    // Kembalikan public URL
    return `${SUPABASE_URL}/storage/v1/object/public/photos/${path}`;
}
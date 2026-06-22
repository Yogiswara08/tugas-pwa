// ============================================================
// 1. GUARD: Cek apakah user punya token? Kalau tidak, usir ke halaman login!
// ============================================================
const myToken = localStorage.getItem('token_toko');

if (!myToken) {
    alert('Anda harus login terlebih dahulu!');
    window.location.href = 'login.html';
}

// ============================================================
// Konfigurasi URL API (Dinamis: Localhost & Hosting)
// ============================================================
const isLocalhost = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const BASE_URL = isLocalhost 
    ? 'http://localhost/Platform/api-toko' 
    : window.location.origin + '/api-toko';

// Menyiapkan Header dinamis: Dosen butuh Authorization di Localhost, tapi Hosting menolaknya.
// CATATAN: Jangan masukkan 'Content-Type' di sini — FormData mengatur boundary-nya sendiri!
const apiHeaders = {};
if (isLocalhost) {
    apiHeaders['Authorization'] = myToken; // Mengirim tiket VIP khusus untuk dosen di Localhost
}

const API_TAMBAH = `${BASE_URL}/tambah_barang.php`;
const API_HAPUS  = `${BASE_URL}/hapus_barang.php`;
const API_UPDATE = `${BASE_URL}/update_barang.php`;

// ============================================================
// State pencarian & paginasi
// ============================================================
let currentPage  = 1;
let currentCari  = '';
let totalHalaman = 1;

/** Bangun URL API get_barang.php secara dinamis */
function buildApiUrl(cari = '', page = 1) {
    const url = new URL(`${BASE_URL}/get_barang.php`);
    url.searchParams.set('token', myToken);
    url.searchParams.set('page',  page);
    if (cari) url.searchParams.set('cari', cari);
    return url.toString();
}

// URL dasar folder uploads (satu level di atas api-toko)
const BASE_UPLOAD_URL = isLocalhost
    ? 'http://localhost/Platform/uploads/'
    : window.location.origin + '/uploads/';

// Fungsi untuk memformat harga ke Rupiah
function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(angka);
}

// Fungsi untuk menampilkan loading state
function showLoading() {
    const tbody = document.getElementById('tabel-barang');
    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="px-6 py-8 text-center">
                <div class="flex flex-col items-center justify-center">
                    <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mb-3"></div>
                    <p class="text-gray-500">Sedang mengambil data dari server...</p>
                    <p class="text-xs text-gray-400 mt-1">Memanggil API: ${buildApiUrl(currentCari, currentPage)}</p>
                </div>
            </td>
        </tr>
    `;
    
    // Update info text
    document.getElementById('info-data').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengambil data dari server...';
}

// Fungsi untuk menampilkan error
function showError(message) {
    const tbody = document.getElementById('tabel-barang');
    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="px-6 py-8 text-center">
                <div class="flex flex-col items-center justify-center">
                    <i class="fas fa-exclamation-triangle text-red-500 text-4xl mb-3"></i>
                    <p class="text-red-600 font-semibold">Gagal Mengambil Data!</p>
                    <p class="text-gray-500 text-sm mt-2">${message}</p>
                    <button onclick="loadData()" class="mt-4 bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-600 transition">
                        <i class="fas fa-sync-alt"></i> Coba Lagi
                    </button>
                </div>
            </td>
        </tr>
    `;
    
    // Update info text
    document.getElementById('info-data').innerHTML = '<i class="fas fa-exclamation-circle text-red-500"></i> Gagal mengambil data: ' + message;
}
// Fungsi utama untuk mengambil data dari API
async function loadData(cari = currentCari, page = currentPage) {
    // Simpan state terbaru
    currentCari = cari;
    currentPage = page;

    const apiUrl = buildApiUrl(cari, page);
    showLoading();
    
    try {
        console.log('Mengirim request ke:', apiUrl);
        
        // Fetch data dari API
        const response = await fetch(apiUrl);
        
        // Cek response status
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Parse JSON response
        const result = await response.json();
        
        console.log('Response dari server:', result);
        
        // Cek status dari response API
        if (result.status === 'success') {
            // Simpan total halaman dari server
            totalHalaman = result.total_halaman || 1;
            currentPage  = result.page || 1;

            // Tampilkan data
            displayData(result.data);
            
            // Update info text
            const jumlahData   = result.data.length;
            const totalData    = result.total_data || jumlahData;
            const infoCari     = cari ? ` (filter: "${escapeHtml(cari)}")` : '';
            document.getElementById('info-data').innerHTML = `
                <i class="fas fa-check-circle text-emerald-500"></i> 
                Menampilkan ${jumlahData} dari ${totalData} data${infoCari}
            `;

            // Perbarui UI paginasi
            updatePaginasiUI();
        } else {
            // Jika API mengembalikan error
            throw new Error(result.message || 'Terjadi kesalahan pada server');
        }
        
    } catch (error) {
        console.error('Error detail:', error);
        
        // Tampilkan pesan error yang lebih informatif
        let errorMessage = error.message;
        
        if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Tidak dapat terhubung ke server. Pastikan: \n1. XAMPP/Laragon sedang berjalan\n2. File get_barang.php ada di folder api-toko\n3. URL API benar';
        } else if (error.message.includes('HTTP 404')) {
            errorMessage = 'Endpoint API tidak ditemukan. Pastikan file get_barang.php ada di http://localhost/api-toko/';
        } else if (error.message.includes('HTTP 403')) {
            errorMessage = 'Akses ditolak (Forbidden). Periksa konfigurasi Apache/XAMPP';
        }
        
        showError(errorMessage);
    }
}

// ============================================================
// Fungsi paginasi
// ============================================================

/** Pindah ke halaman tertentu */
function gantiHalaman(page) {
    if (page < 1 || page > totalHalaman) return;
    loadData(currentCari, page);
    // Scroll ke tabel agar user tahu konten berganti
    document.querySelector('#tabel-barang').closest('.bg-white').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Update state tombol Prev/Next dan teks nomor halaman */
function updatePaginasiUI() {
    const btnPrev      = document.getElementById('btn-prev');
    const btnNext      = document.getElementById('btn-next');
    const infoHalaman  = document.getElementById('info-halaman');

    if (!btnPrev || !btnNext || !infoHalaman) return;

    btnPrev.disabled = (currentPage <= 1);
    btnNext.disabled = (currentPage >= totalHalaman);
    infoHalaman.textContent = `Hal. ${currentPage} / ${totalHalaman}`;
}

// ============================================================
// Fungsi pencarian dengan debounce
// ============================================================

let debounceTimer;

/** Bersihkan kotak cari dan reload */
function clearCari() {
    const input = document.getElementById('input-cari');
    if (input) {
        input.value = '';
        document.getElementById('btn-clear-cari').classList.add('hidden');
    }
    loadData('', 1);
}

// FUNGSI TAMBAH BARANG (CREATE) — menggunakan FormData untuk mendukung upload file
async function tambahBarang(namaBarang, harga, stok, fileGambar) {
    try {
        // Buat FormData (bisa memuat teks sekaligus file)
        const formData = new FormData();
        formData.append('token',       myToken);          // Token auth
        formData.append('nama_barang', namaBarang);
        formData.append('harga',       parseInt(harga));
        formData.append('stok',        parseInt(stok) || 0);
        if (fileGambar) {
            formData.append('gambar', fileGambar);        // File objek dari <input type="file">
        }

        const response = await fetch(API_TAMBAH, {
            method:  'POST',
            headers: apiHeaders,              // Tidak ada Content-Type — browser atur sendiri
            body:    formData
        });
        
        const rawText = await response.text();
        console.log("RESPONSE DARI SERVER (TAMBAH):", rawText);
        
        // Bersihkan injeksi HTML dari InfinityFree (ambil dari { pertama sampai } terakhir)
        let cleanJson = rawText;
        const firstBrace = rawText.indexOf('{');
        const lastBrace  = rawText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            cleanJson = rawText.substring(firstBrace, lastBrace + 1);
        }
        
        const result = JSON.parse(cleanJson);
        
        if (result.status === 'success') {
            // Tampilkan alert sukses
            await Swal.fire({
                icon: 'success',
                title: 'Berhasil!',
                text: result.message,
                timer: 1500,
                showConfirmButton: false
            });
            
            // Reload data tabel tanpa refresh halaman
            await loadData();
            
            return true;
        } else {
            throw new Error(result.message || result.pesan || 'Error dari server');
        }
    } catch (error) {
        console.error('Error tambah barang:', error);
        await Swal.fire({
            icon: 'error',
            title: 'Gagal!',
            text: error.message || 'Gagal menambahkan barang'
        });
        return false;
    }
}

// FUNGSI HAPUS BARANG (DELETE)
async function hapusBarang(id, namaBarang) {
    // Konfirmasi sebelum hapus
    const result = await Swal.fire({
        title: 'Hapus Barang?',
        html: `Apakah Anda yakin ingin menghapus <strong>${escapeHtml(namaBarang)}</strong>?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, Hapus!',
        cancelButtonText: 'Batal'
    });
    
    if (!result.isConfirmed) {
        return false;
    }
    
    try {
        const response = await fetch(API_HAPUS, {
            method: 'DELETE',
            headers: apiHeaders,
            body: JSON.stringify({ token: myToken, id: parseInt(id) })
        });
        
        const rawText = await response.text();
        console.log("RESPONSE DARI SERVER (HAPUS):", rawText);
        
        let cleanJson = rawText;
        const firstBrace = rawText.indexOf('{');
        const lastBrace = rawText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            cleanJson = rawText.substring(firstBrace, lastBrace + 1);
        }
        
        const data = JSON.parse(cleanJson);
        
        if (data.status === 'success') {
            await Swal.fire({
                icon: 'success',
                title: 'Terhapus!',
                text: data.message,
                timer: 1500,
                showConfirmButton: false
            });
            
            // Reload data tabel tanpa refresh halaman
            await loadData();
            return true;
        } else {
            throw new Error(data.message || data.pesan || 'Error dari server');
        }
    } catch (error) {
        console.error('Error hapus barang:', error);
        await Swal.fire({
            icon: 'error',
            title: 'Gagal!',
            text: error.message || 'Gagal menghapus barang'
        });
        return false;
    }
}

// Fungsi untuk menampilkan data ke tabel
function displayData(barangList) {
    const tbody = document.getElementById('tabel-barang');
    
    if (!barangList || barangList.length === 0) {
        // Jika tidak ada data
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-8 text-center">
                    <div class="flex flex-col items-center justify-center">
                        <i class="fas fa-database text-gray-400 text-4xl mb-3"></i>
                        <p class="text-gray-500">Belum ada data barang</p>
                        <p class="text-xs text-gray-400 mt-1">Silakan tambah barang melalui form di atas</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Generate rows untuk setiap barang
    let rows = '';
    barangList.forEach((barang, index) => {
        // Alternating row color
        const bgColor = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';

        // Badge stok berdasarkan jumlah
        const stok = parseInt(barang.stok) || 0;
        let stokBadge;
        if (stok === 0) {
            stokBadge = `<span class="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full">
                            <i class="fas fa-times-circle"></i> Habis
                         </span>`;
        } else if (stok <= 5) {
            stokBadge = `<span class="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">
                            <i class="fas fa-exclamation-circle"></i> ${stok} (Hampir Habis)
                         </span>`;
        } else {
            stokBadge = `<span class="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full">
                            <i class="fas fa-check-circle"></i> ${stok}
                         </span>`;
        }

        // Render thumbnail gambar atau placeholder
        const gambarHtml = barang.gambar
            ? `<img src="${BASE_UPLOAD_URL}${encodeURIComponent(barang.gambar)}"
                    alt="${escapeHtml(barang.nama_barang)}"
                    class="h-12 w-12 object-cover rounded-lg border border-gray-200 shadow-sm"
                    onerror="this.outerHTML='<span class=\'text-gray-300 text-xs\'>N/A</span>'">`
            : `<div class="h-12 w-12 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                   <i class="fas fa-image text-gray-300"></i>
               </div>`;
        
        rows += `
            <tr class="${bgColor} hover:bg-emerald-50 transition duration-150">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <span class="bg-emerald-100 text-emerald-800 text-xs font-mono px-2 py-1 rounded">
                            #${barang.id}
                        </span>
                    </div>
                </td>
                <td class="px-4 py-3">
                    ${gambarHtml}
                </td>
                <td class="px-6 py-4">
                    <div class="flex items-center">
                        <i class="fas fa-box-open text-gray-400 mr-3"></i>
                        <span class="font-medium text-gray-800">${escapeHtml(barang.nama_barang)}</span>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <div class="flex items-center">
                        <i class="fas fa-money-bill-wave text-emerald-500 mr-2"></i>
                        <span class="font-bold text-emerald-600">${formatRupiah(barang.harga)}</span>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <div class="flex items-center">
                        ${stokBadge}
                    </div>
                </td>
                <td class="px-6 py-4 text-center">
                    <div class="flex items-center justify-center gap-2">
                        <button onclick="editBarang(${barang.id}, '${escapeHtml(barang.nama_barang)}', ${barang.harga}, ${stok}, '${barang.gambar ? escapeHtml(barang.gambar) : ''}')"
                                class="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded-lg transition duration-200 text-sm">
                            <i class="fas fa-edit mr-1"></i> Edit
                        </button>
                        <button onclick="hapusBarang(${barang.id}, '${escapeHtml(barang.nama_barang)}')" 
                                class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg transition duration-200 text-sm">
                            <i class="fas fa-trash-alt mr-1"></i> Hapus
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = rows;
}

// Fungsi untuk menghindari XSS (escape HTML)
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Event listener untuk form tambah barang
document.getElementById('form-tambah-barang').addEventListener('submit', async (e) => {
    e.preventDefault(); // Mencegah refresh halaman!
    
    const namaBarang  = document.getElementById('nama_barang').value.trim();
    const harga       = document.getElementById('harga').value;
    const stok        = document.getElementById('stok').value;
    const fileInput   = document.getElementById('gambar');
    const fileGambar  = fileInput.files.length > 0 ? fileInput.files[0] : null;
    
    if (!namaBarang || !harga) {
        Swal.fire({
            icon: 'warning',
            title: 'Perhatian!',
            text: 'Harap isi nama barang dan harga!'
        });
        return;
    }
    
    // Disable button sementara
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Menyimpan...';
    
    // Panggil fungsi tambah barang (sekarang dengan file gambar)
    const success = await tambahBarang(namaBarang, harga, stok, fileGambar);
    
    if (success) {
        // Reset form & preview gambar
        document.getElementById('form-tambah-barang').reset();
        document.getElementById('stok').value = '0';
        document.getElementById('file-label').textContent = 'Pilih atau seret foto...';
        document.getElementById('preview-container').classList.add('hidden');
        document.getElementById('preview-img').src = '#';
    }
    
    // Enable button kembali
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
});

// Preview gambar saat file dipilih (form tambah)
document.getElementById('gambar').addEventListener('change', function () {
    const file = this.files[0];
    if (!file) return;
    const label     = document.getElementById('file-label');
    const preview   = document.getElementById('preview-img');
    const container = document.getElementById('preview-container');
    label.textContent = file.name;
    const reader = new FileReader();
    reader.onload = (e) => {
        preview.src = e.target.result;
        container.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
});

// Preview gambar saat file dipilih (modal edit)
document.getElementById('edit-gambar').addEventListener('change', function () {
    const file = this.files[0];
    if (!file) return;
    const label     = document.getElementById('edit-file-label');
    const preview   = document.getElementById('edit-preview-img');
    const container = document.getElementById('edit-preview-container');
    label.textContent = file.name;
    const reader = new FileReader();
    reader.onload = (e) => {
        preview.src = e.target.result;
        container.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
});

// Auto refresh data setiap 30 detik (opsional)
let autoRefreshInterval;

function startAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    autoRefreshInterval = setInterval(() => {
        console.log('Auto refresh data...');
        loadData();
    }, 30000); // Refresh setiap 30 detik
}

// Load data saat halaman pertama kali dibuka
document.addEventListener('DOMContentLoaded', () => {
    console.log('Halaman siap, memuat data...');
    loadData();
    startAutoRefresh(); // Aktifkan auto refresh (opsional)

    // ============================================================
    // Event pencarian: onkeyup dengan debounce 400ms
    // ============================================================
    const inputCari    = document.getElementById('input-cari');
    const btnClearCari = document.getElementById('btn-clear-cari');

    if (inputCari) {
        inputCari.addEventListener('keyup', () => {
            const keyword = inputCari.value.trim();

            // Tampilkan/sembunyikan tombol X
            if (keyword.length > 0) {
                btnClearCari.classList.remove('hidden');
            } else {
                btnClearCari.classList.add('hidden');
            }

            // Debounce: tunggu 400ms setelah user berhenti mengetik
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                // Setiap pencarian baru, mulai dari halaman 1
                loadData(keyword, 1);
            }, 400);
        });
    }
});

// ============================================================
// FUNGSI UPDATE BARANG (UPDATE / EDIT)
// ============================================================

/** Buka modal edit dan isi field dengan data barang yang dipilih */
function editBarang(id, namaBarang, harga, stok = 0, gambar = '') {
    document.getElementById('edit-id').value              = id;
    document.getElementById('edit-id-display').textContent = id;
    document.getElementById('edit-nama-barang').value      = namaBarang;
    document.getElementById('edit-harga').value            = harga;
    document.getElementById('edit-stok').value             = stok;

    // Reset state foto di modal
    const currentPhoto   = document.getElementById('edit-current-photo');
    const currentImg     = document.getElementById('edit-current-img');
    const currentFilename= document.getElementById('edit-current-filename');
    const editFileLabel  = document.getElementById('edit-file-label');
    const editPreview    = document.getElementById('edit-preview-container');
    const editFileInput  = document.getElementById('edit-gambar');

    editFileInput.value  = '';          // bersihkan pilihan file lama
    editFileLabel.textContent = 'Pilih foto baru...';
    editPreview.classList.add('hidden');
    document.getElementById('edit-preview-img').src = '#';
    // Hapus flag hapus_foto tersembunyi jika ada
    const oldFlag = document.getElementById('edit-hapus-foto-flag');
    if (oldFlag) oldFlag.remove();

    if (gambar) {
        currentImg.src = BASE_UPLOAD_URL + encodeURIComponent(gambar);
        currentFilename.textContent = gambar;
        currentPhoto.classList.remove('hidden');
    } else {
        currentPhoto.classList.add('hidden');
    }

    bukaModalEdit();
}

/** Tampilkan modal dengan animasi */
function bukaModalEdit() {
    const modal = document.getElementById('modal-edit');
    const box   = document.getElementById('modal-box');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    // Trigger animasi masuk
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            box.classList.remove('scale-95', 'opacity-0');
            box.classList.add('scale-100', 'opacity-100');
        });
    });
}

/** Tutup modal dengan animasi */
function tutupModalEdit() {
    const modal = document.getElementById('modal-edit');
    const box   = document.getElementById('modal-box');
    box.classList.remove('scale-100', 'opacity-100');
    box.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }, 250);
}

/** Kirim request POST ke API untuk memperbarui data (mendukung upload gambar) */
async function updateBarang(id, namaBarang, harga, stok) {
    try {
        const formData = new FormData();
        formData.append('token',       myToken);
        formData.append('id',          parseInt(id));
        formData.append('nama_barang', namaBarang);
        formData.append('harga',       parseInt(harga));
        formData.append('stok',        parseInt(stok) || 0);

        // Cek apakah user meminta hapus foto
        const hapusFotoFlag = document.getElementById('edit-hapus-foto-flag');
        if (hapusFotoFlag) {
            formData.append('hapus_foto', '1');
        } else {
            // Lampirkan file gambar baru jika dipilih
            const fileInput = document.getElementById('edit-gambar');
            if (fileInput.files.length > 0) {
                formData.append('gambar', fileInput.files[0]);
            }
        }

        const response = await fetch(API_UPDATE, {
            method:  'POST',
            headers: apiHeaders,   // Tanpa Content-Type — browser atur sendiri
            body:    formData
        });

        const rawText = await response.text();
        console.log('RESPONSE DARI SERVER (UPDATE):', rawText);

        let cleanJson = rawText;
        const firstBrace = rawText.indexOf('{');
        const lastBrace  = rawText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            cleanJson = rawText.substring(firstBrace, lastBrace + 1);
        }

        const result = JSON.parse(cleanJson);

        if (result.status === 'success') {
            tutupModalEdit();
            await Swal.fire({
                icon: 'success',
                title: 'Berhasil!',
                text: result.message,
                timer: 1500,
                showConfirmButton: false
            });
            await loadData();
            return true;
        } else {
            throw new Error(result.message || result.pesan || 'Error dari server');
        }
    } catch (error) {
        console.error('Error update barang:', error);
        await Swal.fire({
            icon: 'error',
            title: 'Gagal!',
            text: error.message || 'Gagal memperbarui barang'
        });
        return false;
    }
}

/** Tombol hapus foto di modal edit: tambahkan flag tersembunyi & sembunyikan preview saat ini */
function hapusFotoEdit() {
    const currentPhoto = document.getElementById('edit-current-photo');
    currentPhoto.classList.add('hidden');
    // Buat input tersembunyi sebagai penanda
    if (!document.getElementById('edit-hapus-foto-flag')) {
        const flag = document.createElement('input');
        flag.type  = 'hidden';
        flag.id    = 'edit-hapus-foto-flag';
        flag.name  = 'hapus_foto';
        flag.value = '1';
        document.getElementById('form-edit-barang').appendChild(flag);
    }
}

/** Event listener untuk form edit di dalam modal */
document.getElementById('form-edit-barang').addEventListener('submit', async (e) => {
    e.preventDefault();

    const id          = document.getElementById('edit-id').value;
    const namaBarang  = document.getElementById('edit-nama-barang').value.trim();
    const harga       = document.getElementById('edit-harga').value;
    const stok        = document.getElementById('edit-stok').value;

    if (!namaBarang || !harga) {
        Swal.fire({ icon: 'warning', title: 'Perhatian!', text: 'Harap isi semua field!' });
        return;
    }

    // Disable tombol saat proses
    const btnSimpan = document.getElementById('btn-simpan-edit');
    const originalText = btnSimpan.innerHTML;
    btnSimpan.disabled = true;
    btnSimpan.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Menyimpan...';

    await updateBarang(id, namaBarang, harga, stok);

    btnSimpan.disabled = false;
    btnSimpan.innerHTML = originalText;
});

// Tutup modal dengan tombol Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') tutupModalEdit();
});

// ============================================================
// Export fungsi ke global scope
// ============================================================
window.loadData       = loadData;
window.hapusBarang    = hapusBarang;
window.tambahBarang   = tambahBarang;
window.editBarang     = editBarang;
window.updateBarang   = updateBarang;
window.tutupModalEdit = tutupModalEdit;
window.hapusFotoEdit  = hapusFotoEdit;
window.gantiHalaman   = gantiHalaman;
window.clearCari      = clearCari;

// ============================================================
// FUNGSI LOGOUT
// Panggil fungsi ini dari tombol "Logout" di index.html
// Contoh: <button onclick="logout()">Logout</button>
// ============================================================
function logout() {
    Swal.fire({
        title: 'Yakin ingin keluar?',
        text: "Sesi login Anda akan dihapus",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Ya, Keluar!',
        cancelButtonText: 'Batal'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.removeItem('token_toko');
            window.location.href = 'login.html';
        }
    });
}
window.logout = logout;

// Cek apakah browser mendukung Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('Service Worker Berhasil Didaftarkan!', registration.scope);
            })
            .catch(err => {
                console.error('Service Worker Gagal:', err);
            });
    });
}
<?php
include "koneksi.php";

// =================== BAGIAN PENGUNCI API ===================
// Menangkap Header Authorization yang dikirim Javascript
$headers = [];
if (function_exists('apache_request_headers')) {
    $headers = apache_request_headers();
} elseif (function_exists('getallheaders')) {
    $headers = getallheaders();
}

$token_dikirim = isset($headers['Authorization']) ? $headers['Authorization'] : '';

// Karena request sekarang pakai FormData (multipart), token datang dari $_POST
// bukan dari php://input
if ($token_dikirim === '') {
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $token_dikirim = $_SERVER['HTTP_AUTHORIZATION'];
    } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $token_dikirim = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    } elseif (isset($_GET['token'])) {
        $token_dikirim = $_GET['token']; // Fallback query string
    } elseif (isset($_POST['token'])) {
        $token_dikirim = $_POST['token']; // Fallback POST FormData body
    }
}

// Cek apakah token dikirim, dan apakah token tersebut ada di tabel users
$cek_token = mysqli_query($koneksi, "SELECT * FROM users WHERE token='$token_dikirim'");

if(mysqli_num_rows($cek_token) === 0 || $token_dikirim === '') {
    // JIKA TOKEN PALSU / KOSONG, HENTIKAN PROGRAM DISINI! (die)
    die(json_encode(["status" => "error", "pesan" => "Akses Ditolak! Token Invalid."]));
}
// ===========================================================

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        "status"  => "error",
        "message" => "Method tidak diizinkan. Gunakan POST."
    ]);
    exit;
}

// Validasi nama (sekarang dari $_POST)
if (!isset($_POST['nama_barang']) || empty(trim($_POST['nama_barang']))) {
    echo json_encode(["status" => "error", "message" => "Nama barang wajib diisi!"]);
    exit;
}

// Validasi harga
if (!isset($_POST['harga']) || !is_numeric($_POST['harga']) || $_POST['harga'] <= 0) {
    echo json_encode(["status" => "error", "message" => "Harga harus berupa angka positif!"]);
    exit;
}

// Validasi stok
$stok = isset($_POST['stok']) ? (int)$_POST['stok'] : 0;
if ($stok < 0) $stok = 0;

$nama_barang = mysqli_real_escape_string($koneksi, trim($_POST['nama_barang']));
$harga       = (int)$_POST['harga'];

// =================== UPLOAD GAMBAR ===================
$nama_file_db = NULL; // default: tidak ada gambar

if (isset($_FILES['gambar']) && $_FILES['gambar']['error'] === UPLOAD_ERR_OK) {
    // Tentukan path direktori uploads (relatif dari api-toko ke htdocs/Platform/uploads)
    $upload_dir = dirname(__DIR__) . '/uploads/';

    // Buat direktori /uploads jika belum ada
    if (!is_dir($upload_dir)) {
        mkdir($upload_dir, 0755, true);
    }

    $file_tmp      = $_FILES['gambar']['tmp_name'];
    $file_name_ori = $_FILES['gambar']['name'];
    $file_size     = $_FILES['gambar']['size'];
    $file_type     = $_FILES['gambar']['type'];

    // Validasi tipe file: hanya izinkan gambar
    $allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!in_array($file_type, $allowed_types)) {
        echo json_encode(["status" => "error", "message" => "Format gambar tidak valid! Gunakan JPG, PNG, GIF, atau WEBP."]);
        exit;
    }

    // Validasi ukuran: maks 2 MB
    if ($file_size > 2 * 1024 * 1024) {
        echo json_encode(["status" => "error", "message" => "Ukuran gambar terlalu besar! Maks 2 MB."]);
        exit;
    }

    // Buat nama file unik agar tidak bentrok
    $ext           = pathinfo($file_name_ori, PATHINFO_EXTENSION);
    $nama_file_unik = uniqid('barang_', true) . '.' . strtolower($ext);
    $tujuan_upload  = $upload_dir . $nama_file_unik;

    if (move_uploaded_file($file_tmp, $tujuan_upload)) {
        $nama_file_db = mysqli_real_escape_string($koneksi, $nama_file_unik);
    } else {
        echo json_encode(["status" => "error", "message" => "Gagal menyimpan file gambar ke server."]);
        exit;
    }
}
// =====================================================

// Simpan ke database (termasuk gambar jika ada)
if ($nama_file_db !== NULL) {
    $query = "INSERT INTO barang (nama_barang, harga, stok, gambar) VALUES ('$nama_barang', $harga, $stok, '$nama_file_db')";
} else {
    $query = "INSERT INTO barang (nama_barang, harga, stok) VALUES ('$nama_barang', $harga, $stok)";
}

$hasil = mysqli_query($koneksi, $query);

if ($hasil) {
    $id_baru   = mysqli_insert_id($koneksi);
    $query_get = "SELECT * FROM barang WHERE id = $id_baru";
    $hasil_get = mysqli_query($koneksi, $query_get);
    $data_baru = mysqli_fetch_assoc($hasil_get);

    echo json_encode([
        "status"  => "success",
        "message" => "Barang berhasil ditambahkan!",
        "data"    => $data_baru
    ]);
} else {
    echo json_encode([
        "status"  => "error",
        "message" => "Gagal menambahkan: " . mysqli_error($koneksi)
    ]);
}

mysqli_close($koneksi);
?>
<?php
include "koneksi.php";

// =================== BAGIAN PENGUNCI API ===================
$headers = [];
if (function_exists('apache_request_headers')) {
    $headers = apache_request_headers();
} elseif (function_exists('getallheaders')) {
    $headers = getallheaders();
}

$token_dikirim = isset($headers['Authorization']) ? $headers['Authorization'] : '';

// FormData mengirim token via $_POST
if ($token_dikirim === '') {
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $token_dikirim = $_SERVER['HTTP_AUTHORIZATION'];
    } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $token_dikirim = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    } elseif (isset($_GET['token'])) {
        $token_dikirim = $_GET['token'];
    } elseif (isset($_POST['token'])) {
        $token_dikirim = $_POST['token']; // Fallback dari FormData
    }
}

$cek_token = mysqli_query($koneksi, "SELECT * FROM users WHERE token='$token_dikirim'");

if (mysqli_num_rows($cek_token) === 0 || $token_dikirim === '') {
    die(json_encode(["status" => "error", "pesan" => "Akses Ditolak! Token Invalid."]));
}
// ===========================================================

// UBAH: terima POST (bukan PUT) agar bisa membawa $_FILES
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method tidak diizinkan. Gunakan POST."]);
    exit;
}

// Validasi ID
$id = isset($_POST['id']) ? (int)$_POST['id'] : 0;
if ($id <= 0) {
    echo json_encode(["status" => "error", "message" => "ID barang tidak valid!"]);
    exit;
}

// Validasi nama barang
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

// Cek apakah barang dengan ID ini ada
$query_cek  = "SELECT id, gambar FROM barang WHERE id = $id";
$hasil_cek  = mysqli_query($koneksi, $query_cek);
if (mysqli_num_rows($hasil_cek) == 0) {
    echo json_encode(["status" => "error", "message" => "Data dengan ID $id tidak ditemukan!"]);
    exit;
}
$data_lama     = mysqli_fetch_assoc($hasil_cek);
$gambar_lama   = $data_lama['gambar']; // nama file foto yang sudah tersimpan

$upload_dir    = dirname(__DIR__) . '/uploads/';
$nama_file_db  = $gambar_lama; // default: tetap pakai foto lama

// =================== LOGIKA UPLOAD GAMBAR ===================
$hapus_foto = isset($_POST['hapus_foto']) && $_POST['hapus_foto'] === '1';

if ($hapus_foto) {
    // User meminta foto dihapus
    if ($gambar_lama && file_exists($upload_dir . $gambar_lama)) {
        unlink($upload_dir . $gambar_lama);
    }
    $nama_file_db = NULL;

} elseif (isset($_FILES['gambar']) && $_FILES['gambar']['error'] === UPLOAD_ERR_OK) {
    // User mengunggah foto baru
    if (!is_dir($upload_dir)) {
        mkdir($upload_dir, 0755, true);
    }

    $file_tmp  = $_FILES['gambar']['tmp_name'];
    $file_size = $_FILES['gambar']['size'];
    $file_type = $_FILES['gambar']['type'];

    $allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!in_array($file_type, $allowed_types)) {
        echo json_encode(["status" => "error", "message" => "Format gambar tidak valid! Gunakan JPG, PNG, GIF, atau WEBP."]);
        exit;
    }

    if ($file_size > 2 * 1024 * 1024) {
        echo json_encode(["status" => "error", "message" => "Ukuran gambar terlalu besar! Maks 2 MB."]);
        exit;
    }

    $ext            = pathinfo($_FILES['gambar']['name'], PATHINFO_EXTENSION);
    $nama_file_unik = uniqid('barang_', true) . '.' . strtolower($ext);
    $tujuan         = $upload_dir . $nama_file_unik;

    if (move_uploaded_file($file_tmp, $tujuan)) {
        // Hapus foto lama jika ada
        if ($gambar_lama && file_exists($upload_dir . $gambar_lama)) {
            unlink($upload_dir . $gambar_lama);
        }
        $nama_file_db = mysqli_real_escape_string($koneksi, $nama_file_unik);
    } else {
        echo json_encode(["status" => "error", "message" => "Gagal menyimpan file gambar ke server."]);
        exit;
    }
}
// ============================================================

// Bangun query UPDATE
if ($nama_file_db === NULL) {
    $query = "UPDATE barang SET nama_barang='$nama_barang', harga=$harga, stok=$stok, gambar=NULL WHERE id=$id";
} else {
    $nama_file_esc = mysqli_real_escape_string($koneksi, $nama_file_db);
    $query = "UPDATE barang SET nama_barang='$nama_barang', harga=$harga, stok=$stok, gambar='$nama_file_esc' WHERE id=$id";
}

$hasil = mysqli_query($koneksi, $query);

if ($hasil) {
    $query_get = "SELECT * FROM barang WHERE id = $id";
    $hasil_get = mysqli_query($koneksi, $query_get);
    $data_baru = mysqli_fetch_assoc($hasil_get);
    echo json_encode([
        "status"  => "success",
        "message" => "Barang berhasil diperbarui!",
        "data"    => $data_baru
    ]);
} else {
    echo json_encode([
        "status"  => "error",
        "message" => "Gagal memperbarui barang: " . mysqli_error($koneksi)
    ]);
}

mysqli_close($koneksi);
?>
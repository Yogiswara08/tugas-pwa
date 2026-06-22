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

// Jika lolos pengecekan di atas, baris di bawah ini baru akan dieksekusi
$json_data = file_get_contents("php://input");
$input = json_decode($json_data, true);

// Jaring pengaman tambahan untuk InfinityFree tanpa .htaccess
if ($token_dikirim === '') {
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $token_dikirim = $_SERVER['HTTP_AUTHORIZATION'];
    } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $token_dikirim = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    } elseif (isset($_GET['token'])) {
        $token_dikirim = $_GET['token']; // Fallback query string
    } elseif (isset($input['token'])) {
        $token_dikirim = $input['token']; // Fallback JSON body
    }
}

// Cek apakah token dikirim, dan apakah token tersebut ada di tabel users
$cek_token = mysqli_query($koneksi, "SELECT * FROM users WHERE token='$token_dikirim'");

if(mysqli_num_rows($cek_token) === 0 || $token_dikirim === '') {
    // JIKA TOKEN PALSU / KOSONG, HENTIKAN PROGRAM DISINI! (die)
    die(json_encode(["status" => "error", "pesan" => "Akses Ditolak! Token Invalid."]));
}
// ===========================================================

// Jika lolos pengecekan di atas, baris di bawah ini (logika Tambah Barang) baru akan dieksekusi
$json_data = file_get_contents("php://input");
// ... (sisa kode tambah_barang Anda yang lama) ...

// Cek method request (harus DELETE)
if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    echo json_encode([
        "status" => "error",
        "message" => "Method tidak diizinkan. Gunakan DELETE."
    ]);
    exit;
}

// Ambil ID dari request (bisa dari query string atau JSON)
if (isset($_GET['id'])) {
    $id = (int)$_GET['id'];
} else {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = isset($input['id']) ? (int)$input['id'] : 0;
}

// Validasi ID
if ($id <= 0) {
    echo json_encode([
        "status" => "error",
        "message" => "ID barang tidak valid!"
    ]);
    exit;
}

// Cek apakah data dengan ID tersebut ada
$query_cek = "SELECT * FROM barang WHERE id = $id";
$hasil_cek = mysqli_query($koneksi, $query_cek);

if (mysqli_num_rows($hasil_cek) == 0) {
    echo json_encode([
        "status" => "error",
        "message" => "Data dengan ID $id tidak ditemukan!"
    ]);
    exit;
}

// Buat query DELETE
$query = "DELETE FROM barang WHERE id = $id";
$hasil = mysqli_query($koneksi, $query);

// Cek hasil query
if ($hasil) {
    echo json_encode([
        "status" => "success",
        "message" => "Barang berhasil dihapus!",
        "id" => $id
    ]);
} else {
    echo json_encode([
        "status" => "error",
        "message" => "Gagal menghapus barang: " . mysqli_error($koneksi)
    ]);
}

mysqli_close($koneksi);
?>
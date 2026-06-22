<?php
// 1. Panggil kunci gudang (koneksi)
include "koneksi.php";

// ============================================================
// 2. Baca parameter pencarian dan halaman dari query string
// ============================================================
$cari        = isset($_GET['cari']) ? trim($_GET['cari']) : '';
$page        = isset($_GET['page']) ? (int)$_GET['page'] : 1;
$per_halaman = 10; // Jumlah barang per halaman

if ($page < 1) $page = 1;

// ============================================================
// 3. Hitung total data (untuk membuat total_halaman)
// ============================================================
if ($cari !== '') {
    $cari_escaped = mysqli_real_escape_string($koneksi, $cari);
    $sql_count = "SELECT COUNT(*) AS total FROM barang WHERE nama_barang LIKE '%{$cari_escaped}%'";
} else {
    $sql_count = "SELECT COUNT(*) AS total FROM barang";
}

$hasil_count  = mysqli_query($koneksi, $sql_count);
$row_count    = mysqli_fetch_assoc($hasil_count);
$total_data   = (int)$row_count['total'];
$total_halaman = (int)ceil($total_data / $per_halaman);
if ($total_halaman < 1) $total_halaman = 1;

// Pastikan page tidak melebihi total halaman
if ($page > $total_halaman) $page = $total_halaman;

// ============================================================
// 4. Ambil data sesuai halaman & kata kunci
// ============================================================
$offset = ($page - 1) * $per_halaman;

if ($cari !== '') {
    $query = "SELECT * FROM barang WHERE nama_barang LIKE '%{$cari_escaped}%' ORDER BY id DESC LIMIT {$per_halaman} OFFSET {$offset}";
} else {
    $query = "SELECT * FROM barang ORDER BY id DESC LIMIT {$per_halaman} OFFSET {$offset}";
}

$hasil = mysqli_query($koneksi, $query);

// 5. Siapkan keranjang kosong untuk menampung data
$data_barang = array();

// 6. Masukkan data dari gudang ke keranjang satu per satu
while ($baris = mysqli_fetch_assoc($hasil)) {
    $data_barang[] = $baris;
}

// 7. Buat format bungkusan paket (Response API)
$response = [
    "status"         => "success",
    "message"        => "Berhasil mengambil data",
    "data"           => $data_barang,
    "page"           => $page,
    "per_halaman"    => $per_halaman,
    "total_data"     => $total_data,
    "total_halaman"  => $total_halaman
];

// 8. Olah dan tampilkan paket sebagai JSON!
header('Content-Type: application/json');
echo json_encode($response);

// Tutup koneksi
mysqli_close($koneksi);
?>
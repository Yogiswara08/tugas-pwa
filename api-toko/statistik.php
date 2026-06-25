<?php
// Panggil koneksi database
include "koneksi.php";

// ============================================================
// Ambil data barang untuk statistik
// ============================================================
$query  = "SELECT nama_barang, harga, stok FROM barang ORDER BY stok DESC LIMIT 10";
$hasil  = mysqli_query($koneksi, $query);

$labels       = [];
$values_stok  = [];
$values_harga = [];
$values_nilai = []; // nilai = harga * stok

while ($baris = mysqli_fetch_assoc($hasil)) {
    $labels[]       = $baris['nama_barang'];
    $values_stok[]  = (int) $baris['stok'];
    $values_harga[] = (int) $baris['harga'];
    $values_nilai[] = (int) $baris['harga'] * (int) $baris['stok'];
}

// ============================================================
// Ringkasan statistik global
// ============================================================
$q_summary = "SELECT
    COUNT(*)            AS total_produk,
    SUM(stok)           AS total_stok,
    SUM(harga * stok)   AS total_nilai,
    AVG(harga)          AS rata_harga,
    SUM(CASE WHEN stok = 0 THEN 1 ELSE 0 END)  AS produk_habis,
    SUM(CASE WHEN stok > 0 AND stok <= 5 THEN 1 ELSE 0 END) AS produk_menipis
FROM barang";

$r_summary = mysqli_query($koneksi, $q_summary);
$summary   = mysqli_fetch_assoc($r_summary);

// ============================================================
// Kembalikan JSON
// ============================================================
$response = [
    "status"  => "success",
    "labels"  => $labels,
    "values"  => [
        "stok"  => $values_stok,
        "harga" => $values_harga,
        "nilai" => $values_nilai,
    ],
    "summary" => [
        "total_produk"   => (int)   $summary['total_produk'],
        "total_stok"     => (int)   $summary['total_stok'],
        "total_nilai"    => (int)   $summary['total_nilai'],
        "rata_harga"     => (float) $summary['rata_harga'],
        "produk_habis"   => (int)   $summary['produk_habis'],
        "produk_menipis" => (int)   $summary['produk_menipis'],
    ]
];

echo json_encode($response);
mysqli_close($koneksi);
?>

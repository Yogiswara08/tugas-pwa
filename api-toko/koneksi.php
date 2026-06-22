<?php
// Mengizinkan akses dari domain luar (CORS) - Penting untuk API!
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

// Deklarasi parameter koneksi
$host = "localhost";
$user = "root";
$pass = ""; // Kosongkan jika Laragon/XAMPP bawaan
$db = "db_toko";

// Membuka jembatan koneksi
$koneksi = mysqli_connect($host, $user, $pass, $db);

// Cek jika koneksi gagal
if (!$koneksi) {
    die(json_encode(["status" => "error", "pesan" => "Koneksi Database Gagal!"]));
}

// Set charset ke UTF-8
mysqli_set_charset($koneksi, "utf8");
?>
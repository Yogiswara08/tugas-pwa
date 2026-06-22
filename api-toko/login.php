<?php
include "koneksi.php";

$json_data = file_get_contents("php://input");
$data = json_decode($json_data, true);

if(isset($data['username']) && isset($data['password'])) {
    $username = mysqli_real_escape_string($koneksi, $data['username']);
    $password = mysqli_real_escape_string($koneksi, $data['password']); // Idealnya gunakan password_hash()

    $query = "SELECT * FROM users WHERE username='$username' AND password='$password'";
    $result = mysqli_query($koneksi, $query);

    if(mysqli_num_rows($result) > 0) {
        $user = mysqli_fetch_assoc($result);
        
        // 1. GENERATE TOKEN ACAK (Kombinasi waktu & angka random)
        $token = md5(uniqid(rand(), true));
        $user_id = $user['id'];

        // 2. Simpan token ini ke database user tersebut
        mysqli_query($koneksi, "UPDATE users SET token='$token' WHERE id='$user_id'");

        // 3. Kembalikan token ke Frontend PWA
        echo json_encode([
            "status" => "success", 
            "pesan" => "Login Berhasil", 
            "token" => $token
        ]);
    } else {
        echo json_encode(["status" => "error", "pesan" => "Username atau Password Salah!"]);
    }
} else {
    echo json_encode(["status" => "error", "pesan" => "Akses Ditolak"]);
}
?>
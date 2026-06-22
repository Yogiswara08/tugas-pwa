-- ============================================================
-- Setup Database: db_toko
-- Jalankan script ini di phpMyAdmin atau MySQL CLI
-- ============================================================

-- Buat database jika belum ada
CREATE DATABASE IF NOT EXISTS `db_toko`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `db_toko`;

-- Buat tabel barang dengan kolom stok dan gambar
CREATE TABLE IF NOT EXISTS `barang` (
  `id`          INT(11)      NOT NULL AUTO_INCREMENT,
  `nama_barang` VARCHAR(255) NOT NULL,
  `harga`       INT(11)      NOT NULL DEFAULT 0,
  `stok`        INT(11)      NOT NULL DEFAULT 0,
  `gambar`      VARCHAR(255) DEFAULT NULL,
  `created_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Buat tabel users (untuk menyimpan token login)
CREATE TABLE IF NOT EXISTS `users` (
  `id`         INT(11)      NOT NULL AUTO_INCREMENT,
  `username`   VARCHAR(100) NOT NULL,
  `password`   VARCHAR(255) NOT NULL,
  `token`      VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Jika tabel sudah ada tapi belum punya kolom 'stok', jalankan:
-- ALTER TABLE `barang` ADD COLUMN `stok` INT(11) NOT NULL DEFAULT 0 AFTER `harga`;

-- Jika tabel sudah ada tapi belum punya kolom 'gambar', jalankan:
-- ALTER TABLE `barang` ADD COLUMN `gambar` VARCHAR(255) DEFAULT NULL AFTER `stok`;

-- Contoh data awal (opsional)
-- INSERT INTO `barang` (`nama_barang`, `harga`, `stok`) VALUES
--   ('Buku Tulis', 5000, 50),
--   ('Pensil 2B', 2000, 100),
--   ('Penghapus', 1500, 30);

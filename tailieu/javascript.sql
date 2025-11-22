-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 08, 2025 at 06:02 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `javascript`
--

-- --------------------------------------------------------

--
-- Table structure for table `sanpham`
--

CREATE TABLE `sanpham` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `status` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sanpham`
--

INSERT INTO `sanpham` (`id`, `name`, `description`, `status`) VALUES
(1, 'Điện thoại iPhone 15 Pro', 'Phiên bản mới nhất của Apple với chip A17 Pro và camera 48MP.', 1),
(2, 'Laptop Dell XPS 13', 'Laptop cao cấp, mỏng nhẹ, hiệu năng mạnh mẽ cho dân văn phòng.', 1),
(3, 'Tai nghe Bluetooth Sony WH-1000XM5', 'Chống ồn chủ động, âm thanh chất lượng cao.', 1),
(4, 'Chuột Logitech MX Master 3S', 'Chuột không dây đa thiết bị, pin bền, thao tác mượt mà.', 1),
(5, 'Máy ảnh Canon EOS R6', 'Máy ảnh full-frame cho nhiếp ảnh gia chuyên nghiệp.', 0),
(6, 'Máy tính bảng iPad Pro M4', 'Hiệu năng vượt trội với chip Apple M4, màn hình Liquid Retina XDR.', 1),
(7, 'Tai nghe AirPods Pro 2', 'Chống ồn chủ động, âm thanh sống động, kết nối liền mạch với iPhone.', 1),
(8, 'Smartwatch Samsung Galaxy Watch 6', 'Đồng hồ thông minh với màn hình AMOLED, theo dõi sức khỏe toàn diện.', 1),
(9, 'Laptop MacBook Air M3', 'Thiết kế siêu mỏng nhẹ, hiệu năng mạnh mẽ với chip M3.', 1),
(10, 'Điện thoại Samsung Galaxy S24 Ultra', 'Camera 200MP, hiệu năng mạnh, hỗ trợ bút S Pen.', 1),
(11, 'Loa Bluetooth JBL Charge 5', 'Âm thanh mạnh mẽ, chống nước IP67, thời lượng pin 20 giờ.', 1),
(12, 'Máy chơi game PlayStation 5', 'Trải nghiệm đồ họa chân thực, tốc độ tải cực nhanh.', 1),
(13, 'Bàn phím cơ Keychron K6', 'Thiết kế nhỏ gọn, kết nối Bluetooth, phím bấm êm ái.', 1),
(14, 'Màn hình LG UltraWide 34\"', 'Tỉ lệ 21:9, độ phân giải cao, phù hợp cho công việc và giải trí.', 1),
(15, 'Camera hành trình GoPro Hero 12', 'Quay video 5.3K, chống rung cực tốt, chống nước 10m.', 1),
(16, 'Ổ cứng SSD Samsung 1TB', 'Tốc độ đọc ghi cực nhanh, lưu trữ an toàn, bền bỉ.', 1);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `sanpham`
--
ALTER TABLE `sanpham`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `sanpham`
--
ALTER TABLE `sanpham`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

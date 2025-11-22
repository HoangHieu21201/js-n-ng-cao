const express = require('express');
const app = express();
const port = 8080;
const mysql = require('mysql');
const NodeCache = require("node-cache");
const cors = require('cors'); // Nên cài thêm cors nếu frontend và backend khác port

// --- Middleware ---
// 1. Quan trọng: Để đọc dữ liệu JSON gửi từ Vue lên
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));
app.use(cors()); // Cho phép Vue gọi API

// --- Khởi tạo Cache ---
const productCache = new NodeCache({ stdTTL: 60, checkperiod: 120 });
console.log("💿 Node Cache đã được khởi tạo!");

// --- Cấu hình Kết nối MySQL ---
const con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "javascript"
});

con.connect(function (err) {
  if (err) {
    console.error("❌ Lỗi kết nối MySQL:", err.message);
  } else {
    console.log("✅ Đã kết nối MySQL thành công!");
  }
});

// --- Định nghĩa ROUTES ---

// 🏠 Route mặc định
app.get('/', (req, res) => {
  res.send('<h1>Server API đang chạy!</h1>');
});

// 🟢 1. LẤY DANH SÁCH (PHÂN TRANG)
// Frontend gọi: /api/home?page=1
app.get('/api/home', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  if (page <= 0 || limit <= 0) {
    return res.status(400).send("Tham số page/limit không hợp lệ.");
  }

  const offset = limit * (page - 1);

  // Đếm tổng
  const sqlCount = "SELECT COUNT(*) AS totalItems FROM sanpham";
  // Lấy dữ liệu (Thêm price, image để hiển thị đầy đủ ở Frontend)
  const sqlData = "SELECT id, name, price, image, description, status FROM sanpham LIMIT ? OFFSET ?";

  con.query(sqlCount, (errCount, countResult) => {
    if (errCount) return res.status(500).json({ error: "Lỗi đếm dữ liệu" });

    const totalItems = countResult[0].totalItems;

    con.query(sqlData, [limit, offset], (errData, dataResult) => {
      if (errData) return res.status(500).json({ error: "Lỗi lấy dữ liệu" });

      res.json({
        page: page,
        limit: limit,
        totalItems: totalItems,
        data: dataResult
      });
    });
  });
});

// 🟢 2. XEM CHI TIẾT
app.get('/api/products/:id', (req, res) => {
  const productId = req.params.id;
  const cacheKey = `product-${productId}`;

  // Check Cache
  const cachedProduct = productCache.get(cacheKey);
  if (cachedProduct) {
    console.log(`[Cache Hit] ID: ${productId}`);
    return res.json(cachedProduct);
  }

  // Query DB
  const sql = "SELECT * FROM sanpham WHERE id = ?";
  con.query(sql, [productId], (err, result) => {
    if (err) return res.status(500).json({ error: "Lỗi DB" });
    if (result.length === 0) return res.status(404).json({ error: "Không tìm thấy" });

    const productData = result[0];
    productCache.set(cacheKey, productData); // Lưu cache
    res.json(productData);
  });
});

// 🔵 3. THÊM MỚI (CREATE)
// Frontend gọi: POST /api/products
app.post('/api/products', (req, res) => {
  // Lấy dữ liệu từ body (cần app.use(express.json()) ở trên)
  const { name, price, description, image, status } = req.body;

  // Validate cơ bản
  if (!name || !price) {
    return res.status(400).json({ error: "Tên và giá là bắt buộc!" });
  }

  const sql = "INSERT INTO sanpham (name, price, description, image, status) VALUES (?, ?, ?, ?, ?)";
  const values = [name, price, description || '', image || '', status || 1];

  con.query(sql, values, (err, result) => {
    if (err) {
      console.error("Lỗi thêm sản phẩm:", err);
      return res.status(500).json({ error: "Lỗi khi thêm vào database" });
    }

    res.status(201).json({
      message: "Thêm sản phẩm thành công!",
      id: result.insertId,
      ...req.body
    });
  });
});

// 🟠 4. CẬP NHẬT (UPDATE)
// Frontend gọi: PUT /api/products/:id
app.put('/api/products/:id', (req, res) => {
  const productId = req.params.id;
  const { name, price, description, image, status } = req.body;

  const sql = "UPDATE sanpham SET name=?, price=?, description=?, image=?, status=? WHERE id=?";
  const values = [name, price, description, image, status, productId];

  con.query(sql, values, (err, result) => {
    if (err) {
      console.error("Lỗi cập nhật:", err);
      return res.status(500).json({ error: "Lỗi khi cập nhật database" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Không tìm thấy sản phẩm để sửa" });
    }

    // QUAN TRỌNG: Xóa cache cũ của sản phẩm này để lần sau tải lại lấy dữ liệu mới
    productCache.del(`product-${productId}`);
    console.log(`🗑️ Đã xóa cache ID: ${productId}`);

    res.json({ message: "Cập nhật thành công!", id: productId });
  });
});

// 🔴 5. XÓA (DELETE)
// Frontend gọi: DELETE /api/products/:id
app.delete('/api/products/:id', (req, res) => {
  const productId = req.params.id;

  const sql = "DELETE FROM sanpham WHERE id = ?";

  con.query(sql, [productId], (err, result) => {
    if (err) return res.status(500).json({ error: "Lỗi khi xóa" });

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Không tìm thấy sản phẩm để xóa" });
    }

    // Xóa cache
    productCache.del(`product-${productId}`);
    
    res.json({ message: "Đã xóa sản phẩm thành công!", id: productId });
  });
});

// Middleware 404
app.use((req, res) => {
  res.status(404).json({ error: "API Route không tồn tại" });
});

// Start Server
app.listen(port, () => {
  console.log(`🚀 Server CRUD đang chạy tại: http://localhost:${port}`);
});
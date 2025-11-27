const express = require('express');
const app = express();
const port = 8080;
const http = require('http');
const { Server } = require("socket.io");
const mysql = require('mysql');
const NodeCache = require("node-cache");
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// --- QUAN TRỌNG: Thư viện check Magic Bytes ---
const FileType = require('file-type');

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use('/photo', express.static(path.join(__dirname, 'public/photo')));

// Tạo thư mục nếu chưa có
const uploadDir = path.join(__dirname, 'public/photo');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// --- CẤU HÌNH MULTER ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, 'public/photo'); },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Lớp bảo vệ 1: Kiểm tra đuôi file và MimeType gửi lên
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file ảnh (jpeg, jpg, png, gif, webp)!'));
  }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });
const productCache = new NodeCache({ stdTTL: 300, checkperiod: 600 });

// --- KẾT NỐI DB ---
const con = mysql.createConnection({
  host: "localhost", user: "root", password: "", database: "javascript"
});

con.connect(function (err) {
  if (err) console.error("❌ Lỗi MySQL:", err.message);
  else console.log("✅ MySQL Connected!");
});

io.on('connection', (socket) => { /* ... */ });

// --- HELPER FUNCTIONS ---

const clearListCache = () => {
  const keys = productCache.keys().filter(key => key.startsWith('home-'));
  if (keys.length > 0) productCache.del(keys);
};

const processImages = (req) => {
  let oldImages = [];
  try {
    if (req.body.images) {
      const parsed = JSON.parse(req.body.images);
      oldImages = Array.isArray(parsed) ? parsed : [];
    }
  } catch (e) { oldImages = []; }

  let newImages = [];
  if (req.files && req.files.length > 0) {
    newImages = req.files.map(file => file.filename);
  }

  return JSON.stringify([...oldImages, ...newImages]);
};

// Lớp bảo vệ 2: Kiểm tra Magic Bytes (Nội dung thật của file)
const checkFileSignature = async (filePath) => {
  try {
    const type = await FileType.fromFile(filePath);
    if (!type) return false; // Không nhận diện được file
    
    // Danh sách đuôi file an toàn thực sự
    const allowed = ['jpg', 'png', 'gif', 'webp'];
    return allowed.includes(type.ext);
  } catch (error) {
    return false;
  }
};

// --- ROUTES ---

app.get('/', (req, res) => res.send('API Running...'));

app.get('/api/home', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 12;
  const cacheKey = `home-page-${page}-limit-${limit}`;

  if (productCache.has(cacheKey)) return res.json(productCache.get(cacheKey));

  const offset = limit * (page - 1);
  const sqlCount = "SELECT COUNT(*) AS totalItems FROM sanpham";
  const sqlData = "SELECT id, name, price, image, description, status FROM sanpham ORDER BY id DESC LIMIT ? OFFSET ?";

  con.query(sqlCount, (err, countRes) => {
    if (err) return res.status(500).json({ error: "Lỗi đếm" });
    con.query(sqlData, [limit, offset], (err2, dataRes) => {
      if (err2) return res.status(500).json({ error: "Lỗi data" });
      const response = { page, limit, totalItems: countRes[0].totalItems, data: dataRes };
      productCache.set(cacheKey, response);
      res.json(response);
    });
  });
});

app.get('/api/products/:id', (req, res) => {
  const productId = req.params.id;
  const sql = "SELECT * FROM sanpham WHERE id = ?";
  con.query(sql, [productId], (err, result) => {
    if (err || result.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(result[0]);
  });
});

// --- POST: Thêm mới (CÓ ASYNC ĐỂ CHECK FILE) ---
app.post('/api/products', upload.array('images', 10), async (req, res) => {
  const { name, price, description, status } = req.body;
  if (!name || !price) return res.status(400).json({ error: "Thiếu tên/giá" });

  // === KIỂM TRA BẢO MẬT FILE ===
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      const isValid = await checkFileSignature(file.path);
      if (!isValid) {
        // Nếu phát hiện file giả mạo -> Xóa toàn bộ file vừa upload để dọn rác
        req.files.forEach(f => fs.unlinkSync(f.path));
        return res.status(400).json({ error: `Phát hiện file giả mạo hoặc lỗi: ${file.originalname}` });
      }
    }
  }
  // ===============================

  const imageJson = processImages(req);

  const sql = "INSERT INTO sanpham (name, price, description, image, status) VALUES (?, ?, ?, ?, ?)";
  con.query(sql, [name, price, description || '', imageJson, status || 1], (err, result) => {
    if (err) return res.status(500).json({ error: "Lỗi DB" });
    clearListCache();
    io.emit('server_update', { action: 'create', id: result.insertId });
    res.status(201).json({ message: "Thêm thành công", images: imageJson });
  });
});

// --- PUT: Cập nhật (CÓ ASYNC ĐỂ CHECK FILE) ---
app.put('/api/products/:id', upload.array('images', 10), async (req, res) => {
  const productId = req.params.id;
  const { name, price, description, status } = req.body;

  // === KIỂM TRA BẢO MẬT FILE ===
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      const isValid = await checkFileSignature(file.path);
      if (!isValid) {
        req.files.forEach(f => fs.unlinkSync(f.path));
        return res.status(400).json({ error: `Phát hiện file giả mạo hoặc lỗi: ${file.originalname}` });
      }
    }
  }
  // ===============================

  const imageJson = processImages(req);

  const sql = "UPDATE sanpham SET name=?, price=?, description=?, image=?, status=? WHERE id=?";
  con.query(sql, [name, price, description, imageJson, status, productId], (err, result) => {
    if (err) return res.status(500).json({ error: "Lỗi DB" });
    productCache.del(`product-${productId}`);
    clearListCache();
    io.emit('server_update', { action: 'update', id: productId });
    res.json({ message: "Cập nhật thành công", images: imageJson });
  });
});

app.delete('/api/products/:id', (req, res) => {
  const productId = req.params.id;
  const sql = "DELETE FROM sanpham WHERE id = ?";
  con.query(sql, [productId], (err, result) => {
    if (err) return res.status(500).json({ error: "Lỗi xoá" });
    productCache.del(`product-${productId}`);
    clearListCache();
    io.emit('server_update', { action: 'delete', id: productId });
    res.json({ message: "Đã xóa" });
  });
});

server.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
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


const toSlug = (str) => {
    if (!str) return '';
    return str
        .normalize('NFD') 
        .replace(/[\u0300-\u036f]/g, '') 
        .toUpperCase() 
        .replace(/\s+/g, '_')
        .replace(/[^A-Z0-9_]/g, '');
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, 'public/photo'); },
  filename: function (req, file, cb) {
    let rawName = req.body.name || req.headers['x-product-name'] || req.query.name || 'product';
    
    console.log(`📸 Uploading: ${file.originalname} | Name detected: ${rawName}`);

    const slugName = toSlug(rawName) || 'PRODUCT';

    const idSuffix = req.params.id ? `_ID${req.params.id}` : '';

    // để ko bị trùng tên 
    const randomNum = Math.floor(Math.random() * 1000000); 
    
    const ext = path.extname(file.originalname);

    cb(null, `${slugName}${idSuffix}_${randomNum}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/i;
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

// Hàm xử lý logic ghép ảnh cũ và mới
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

  return {
    jsonString: JSON.stringify([...oldImages, ...newImages]),
    keptImages: oldImages 
  };
};

// Hàm xoá file vật lý trên ổ cứng
const deleteFilesFromDisk = (filenames) => {
  if (!Array.isArray(filenames)) return;
  filenames.forEach(filename => {
    const filePath = path.join(__dirname, 'public/photo', filename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Đã xoá file rác: ${filename}`);
      } catch (err) {
        console.error(`❌ Lỗi xoá file ${filename}:`, err);
      }
    }
  });
};

// Lớp bảo vệ 2: Kiểm tra Magic Bytes (Nội dung thật của file)
const checkFileSignature = async (filePath) => {
  try {
    const type = await FileType.fromFile(filePath);
    if (!type) return false;
    const allowed = ['jpg', 'png', 'gif', 'webp'];
    return allowed.includes(type.ext);
  } catch (error) {
    // Nếu file quá nhỏ hoặc lỗi đọc, có thể trả về false hoặc bỏ qua tuỳ logic
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

// --- POST: Thêm mới ---
app.post('/api/products', upload.array('images', 10), async (req, res) => {
  // Lấy dữ liệu từ body (Sau khi Multer đã xử lý xong)
  const { name, price, description, status } = req.body;
  
  // Debug log để kiểm tra body sau khi upload
  console.log("📝 Data received:", { name, price });

  if (!name || !price) {
      // Nếu lỗi validation, nhớ xoá các file ảnh đã lỡ upload để tránh rác
      if (req.files) req.files.forEach(f => fs.unlinkSync(f.path));
      return res.status(400).json({ error: "Thiếu tên/giá" });
  }

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

  const { jsonString } = processImages(req); // Lấy chuỗi JSON từ hàm helper mới

  const sql = "INSERT INTO sanpham (name, price, description, image, status) VALUES (?, ?, ?, ?, ?)";
  con.query(sql, [name, price, description || '', jsonString, status || 1], (err, result) => {
    if (err) return res.status(500).json({ error: "Lỗi DB" });
    clearListCache();
    io.emit('server_update', { action: 'create', id: result.insertId });
    res.status(201).json({ message: "Thêm thành công", images: jsonString });
  });
});

// --- PUT: Cập nhật ---
app.put('/api/products/:id', upload.array('images', 10), async (req, res) => {
  const productId = req.params.id;
  const { name, price, description, status } = req.body;

  // 1. Kiểm tra file mới upload (Bảo mật)
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      const isValid = await checkFileSignature(file.path);
      if (!isValid) {
        req.files.forEach(f => fs.unlinkSync(f.path));
        return res.status(400).json({ error: `Phát hiện file giả mạo hoặc lỗi: ${file.originalname}` });
      }
    }
  }

  // 2. Lấy dữ liệu cũ từ DB để so sánh ảnh
  con.query("SELECT image FROM sanpham WHERE id = ?", [productId], (err, result) => {
    if (err || result.length === 0) return res.status(404).json({ error: "Không tìm thấy sản phẩm" });

    let dbImages = [];
    try { dbImages = JSON.parse(result[0].image) || []; } catch (e) {}

    // Xử lý danh sách ảnh mới từ client gửi lên
    const { jsonString, keptImages } = processImages(req);

    // Tìm các ảnh có trong DB cũ NHƯNG không có trong danh sách giữ lại -> Cần xoá
    const imagesToDelete = dbImages.filter(img => !keptImages.includes(img));
    
    // Thực hiện xoá file rác
    deleteFilesFromDisk(imagesToDelete);

    // 3. Cập nhật vào Database
    const sql = "UPDATE sanpham SET name=?, price=?, description=?, image=?, status=? WHERE id=?";
    con.query(sql, [name, price, description, jsonString, status, productId], (err, updateResult) => {
      if (err) return res.status(500).json({ error: "Lỗi DB Update" });
      
      productCache.del(`product-${productId}`);
      clearListCache();
      io.emit('server_update', { action: 'update', id: productId });
      res.json({ message: "Cập nhật thành công", images: jsonString });
    });
  });
});

// --- DELETE: Xoá ---
app.delete('/api/products/:id', (req, res) => {
  const productId = req.params.id;

  // 1. Lấy thông tin ảnh trước khi xoá record
  con.query("SELECT image FROM sanpham WHERE id = ?", [productId], (err, result) => {
    if (err) return res.status(500).json({ error: "Lỗi DB" });
    if (result.length === 0) return res.status(404).json({ error: "Not found" });

    let imagesToDelete = [];
    try { imagesToDelete = JSON.parse(result[0].image) || []; } catch(e) {}

    // 2. Xoá toàn bộ ảnh của sản phẩm này trên đĩa
    deleteFilesFromDisk(imagesToDelete);

    // 3. Xoá record trong DB
    const sql = "DELETE FROM sanpham WHERE id = ?";
    con.query(sql, [productId], (err, deleteResult) => {
      if (err) return res.status(500).json({ error: "Lỗi xoá DB" });
      
      productCache.del(`product-${productId}`);
      clearListCache();
      io.emit('server_update', { action: 'delete', id: productId });
      res.json({ message: "Đã xóa sản phẩm và hình ảnh liên quan" });
    });
  });
});

server.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
<script setup>
import { ref, computed, onMounted, reactive, nextTick } from 'vue';
import Swal from 'sweetalert2';
import { io } from "socket.io-client";

// --- IMPORT QUILL THỦ CÔNG ---
// Import đối tượng Quill và CSS để khởi tạo thủ công thay vì dùng Component bị lỗi
import { Quill } from '@vueup/vue-quill';
import '@vueup/vue-quill/dist/vue-quill.snow.css';

const API_URL = 'http://localhost:8080';

const apiResponse = ref(null);
const isLoading = ref(false);
const isSubmitting = ref(false);
const currentPage = ref(1);

const isModalVisible = ref(false);
const modalMode = ref('view');
const fileInputRef = ref(null);

// --- QUILL STATE ---
const quillEditorRef = ref(null);
let quillInstance = null;

// --- STATE MỚI CHO QUẢN LÝ ẢNH LINH HOẠT ---
const galleryItems = ref([]);
const activeImage = ref('');

const formData = reactive({
  id: null, name: '', price: 0, description: '', image: '[]', status: 1
});

const products = computed(() => apiResponse.value?.data || []);
const pageInfo = computed(() => {
  if (!apiResponse.value) return { page: 1, limit: 12, total: 0, hasMore: false };
  let totalRecords = apiResponse.value.total || apiResponse.value.totalItems || apiResponse.value.count || 0;
  if (totalRecords === 0 && apiResponse.value.data?.length > 0) totalRecords = 50;

  return {
    page: apiResponse.value.page || 1,
    limit: apiResponse.value.limit || 12,
    total: totalRecords,
    hasMore: apiResponse.value.data?.length === (apiResponse.value.limit || 12),
  };
});

const totalPages = computed(() => {
  if (!pageInfo.value.total || !pageInfo.value.limit) return 0;
  return Math.ceil(pageInfo.value.total / pageInfo.value.limit);
});

const visiblePages = computed(() => {
  const total = totalPages.value;
  const current = pageInfo.value.page;
  const delta = 2;
  if (total <= 1) return [1];
  const range = [], pages = [];
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) range.push(i);
  }
  let l;
  for (let i of range) {
    if (l) {
      if (i - l === 2) pages.push(l + 1);
      else if (i - l !== 1) pages.push('...');
    }
    pages.push(i);
    l = i;
  }
  return pages;
});

const formatPrice = (price) => typeof price === "number" ? new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price) : "N/A";
const placeholderImage = (name = "Product") => `https://placehold.co/600x400/e0e0e0/555555?text=${encodeURI(name)}`;

// --- HÀM XỬ LÝ ẢNH ---
const parseImages = (imageField) => {
  if (!imageField) return [];
  try {
    const parsed = JSON.parse(imageField);
    return Array.isArray(parsed) ? parsed : [imageField];
  } catch (e) {
    return imageField ? [imageField] : [];
  }
};

const getImageUrl = (imageName) => {
  if (!imageName) return placeholderImage();
  if (imageName.startsWith('blob:') || imageName.startsWith('http')) return imageName;
  return `${API_URL}/photo/${imageName}`;
};

const getThumbnail = (product) => {
  const images = parseImages(product.image);
  return images.length > 0 ? getImageUrl(images[0]) : placeholderImage(product.name);
};

const handleImageError = (event) => event.target.src = placeholderImage("Error");

const fetchData = async (page) => {
  try {
    const res = await fetch(`${API_URL}/api/home?page=${page}`);
    if (!res.ok) throw new Error(res.statusText);
    apiResponse.value = await res.json();
    currentPage.value = apiResponse.value.page || page;
  } catch (error) {
    console.error(error);
  } finally {
    isLoading.value = false;
  }
};

const changePage = (page) => {
  if (page === '...') return;
  if (page >= 1 && page <= totalPages.value && page !== pageInfo.value.page) {
    isLoading.value = true;
    fetchData(page);
  }
};

// --- LOGIC MỚI: Thêm ảnh vào danh sách chung ---
const onFileChange = (event) => {
  const files = Array.from(event.target.files);
  if (files.length > 0) {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];
    const invalidFile = files.find(f => !validTypes.includes(f.type) || f.size > 10 * 1024 * 1024);

    if (invalidFile) {
      Swal.fire({ icon: 'error', title: 'File không hợp lệ', text: 'Chỉ chấp nhận ảnh đúng định dạng JPEG, PNG, GIF, WEBP < 10MB.' });
      event.target.value = null;
      return;
    }

    files.forEach(file => {
      const url = URL.createObjectURL(file);
      galleryItems.value.push({
        type: 'local',
        file: file,
        url: url
      });
    });

    if (galleryItems.value.length > 0) {
      activeImage.value = galleryItems.value[galleryItems.value.length - 1].url;
    }
    event.target.value = null;
  }
};

const removeGalleryItem = (index) => {
  const item = galleryItems.value[index];
  if (item.type === 'local') {
    URL.revokeObjectURL(item.url);
  }
  galleryItems.value.splice(index, 1);

  if (galleryItems.value.length > 0) {
    activeImage.value = galleryItems.value[0].url;
  } else {
    activeImage.value = '';
  }
};

// Cấu hình Toolbar cho Quill
const quillModules = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    [{ 'header': [1, 2, false] }],
    ['link', 'clean']
  ]
};

// --- HÀM KHỞI TẠO QUILL THỦ CÔNG ---
const initQuill = async () => {
  await nextTick(); // Đợi DOM được render xong (vì Modal dùng v-if)
  
  if (quillEditorRef.value) {
    // Tạo instance mới
    quillInstance = new Quill(quillEditorRef.value, {
      theme: 'snow',
      modules: quillModules,
      placeholder: 'Nhập mô tả sản phẩm...',
    });

    // Set nội dung ban đầu
    quillInstance.root.innerHTML = formData.description || '';

    // Lắng nghe sự kiện thay đổi
    quillInstance.on('text-change', () => {
      formData.description = quillInstance.root.innerHTML;
    });
  }
};

const openModal = async (mode, product = null) => {
  modalMode.value = mode;
  galleryItems.value = [];
  activeImage.value = '';

  if (mode === 'add') {
    Object.assign(formData, { id: null, name: '', price: 0, description: '', image: '[]', status: 1 });
    if (fileInputRef.value) fileInputRef.value.value = null;
  } else if (product) {
    Object.assign(formData, { ...product });
    const serverImages = parseImages(product.image);

    serverImages.forEach(imgName => {
      galleryItems.value.push({
        type: 'server',
        name: imgName,
        url: getImageUrl(imgName)
      });
    });

    if (galleryItems.value.length > 0) {
      activeImage.value = galleryItems.value[0].url;
    } else {
      activeImage.value = placeholderImage(product.name);
    }
  }
  isModalVisible.value = true;
  document.body.style.overflow = "hidden";
  
  // Khởi tạo Quill nếu không phải chế độ xem
  if (mode !== 'view') {
    await initQuill();
  }
};

const closeModal = () => {
  isModalVisible.value = false;
  document.body.style.overflow = "";
  quillInstance = null; // Reset instance
  galleryItems.value.forEach(item => {
    if (item.type === 'local') URL.revokeObjectURL(item.url);
  });
};

const handleSubmit = async () => {
  if (isSubmitting.value) return;
  if (!formData.name || formData.price < 0) {
    Swal.fire({ icon: 'warning', title: 'Thiếu thông tin', text: 'Vui lòng nhập tên và giá hợp lệ.' });
    return;
  }

  isSubmitting.value = true;
  try {
    const data = new FormData();
    data.append('name', formData.name);
    data.append('price', formData.price);
    data.append('description', formData.description || '');
    data.append('status', formData.status);

    const oldImagesToKeep = galleryItems.value
      .filter(item => item.type === 'server')
      .map(item => item.name);

    data.append('images', JSON.stringify(oldImagesToKeep));

    const newFilesToUpload = galleryItems.value
      .filter(item => item.type === 'local')
      .map(item => item.file);

    newFilesToUpload.forEach(file => {
      data.append('images', file);
    });

    const url = modalMode.value === 'add' ? `${API_URL}/api/products` : `${API_URL}/api/products/${formData.id}`;
    const method = modalMode.value === 'add' ? 'POST' : 'PUT';

    const res = await fetch(url, { method, body: data });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "Lỗi khi lưu");

    await fetchData(currentPage.value);

    closeModal();
    Swal.fire({ icon: 'success', title: 'Thành công!', timer: 1500, showConfirmButton: false });
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'Thất bại', text: error.message });
  } finally {
    isSubmitting.value = false;
  }
};

const handleDelete = async (product) => {
  const result = await Swal.fire({
    title: 'Bạn có chắc chắn?', text: `Xóa "${product.name}"?`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Xóa', cancelButtonText: 'Hủy'
  });
  if (!result.isConfirmed) return;
  if (isModalVisible.value) closeModal();
  try {
    const res = await fetch(`${API_URL}/api/products/${product.id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error("Lỗi khi xóa");
    await fetchData(currentPage.value);
    Swal.fire('Đã xóa!', '', 'success');
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Lỗi', text: 'Không thể xóa sản phẩm này.' });
  }
};

const prevPage = () => changePage(pageInfo.value.page - 1);
const nextPage = () => changePage(pageInfo.value.page + 1);

onMounted(() => {
  isLoading.value = true;
  fetchData(currentPage.value);

  const socket = io(API_URL);
  socket.on("connect", () => {
    console.log("🟢 Đã kết nối Socket:", socket.id);
  });
  socket.on("server_update", (data) => {
    console.log("🔔 Server báo có thay đổi:", data);
    fetchData(currentPage.value);
    const actionMap = { 'create': 'được thêm mới', 'update': 'được cập nhật', 'delete': 'đã bị xóa' };
    const msg = actionMap[data.action] || 'có thay đổi';
    Swal.fire({
      toast: true, position: 'top-end', icon: 'info',
      title: `Dữ liệu vừa ${msg}`, showConfirmButton: false, timer: 3000
    });
  });
});

</script>

<template>
  <div class="app-container">
    <div class="header-section">
      <div class="header-content">
        <h1>Quản Lý Kho Hàng </h1>
      </div>
      <button class="btn btn-primary btn-lg" @click="openModal('add')"><span class="icon">+</span> Thêm sản
        phẩm</button>
    </div>

    <div v-if="isLoading" class="state-container">
      <div class="loader"></div>
      <p>Đang tải dữ liệu...</p>
    </div>

    <div v-else-if="products.length > 0" class="product-grid">
      <div v-for="product in products" :key="product.id" class="product-card" @click="openModal('view', product)">
        <div class="card-image-container">
          <div v-if="product.status === 0" class="card-badge badge-danger">Hết hàng</div>
          <img :src="getThumbnail(product)" :alt="product.name" @error="handleImageError" />
          <div v-if="parseImages(product.image).length > 1" class="multi-badge">
            📚 {{ parseImages(product.image).length }} ảnh
          </div>
        </div>
        <div class="card-body">
          <h3 class="card-title">{{ product.name }}</h3>
          <!-- Loại bỏ hiển thị mô tả thô ở card để tránh vỡ layout nếu HTML dài, hoặc strip HTML nếu cần -->
          <p class="card-desc" v-html="product.description ? product.description.replace(/<[^>]*>?/gm, '').substring(0, 100) + '...' : 'Chưa có mô tả'"></p>
          <div class="card-meta"><span class="price-tag">{{ formatPrice(product.price) }}</span></div>
        </div>
        <div class="card-footer" @click.stop>
          <button class="btn btn-outline-primary btn-sm" @click="openModal('edit', product)">✏️ Sửa</button>
          <button class="btn btn-outline-danger btn-sm" @click="handleDelete(product)">🗑️ Xóa</button>
        </div>
      </div>
    </div>

    <div v-else class="state-container no-data">
      <p>📭 Chưa có sản phẩm nào.</p>
    </div>

    <div v-if="!isLoading && products.length > 0" class="pagination-container">
      <button class="btn btn-white" @click="prevPage" :disabled="pageInfo.page <= 1">← Trước</button>
      <div class="page-numbers">
        <template v-for="(item, index) in visiblePages" :key="index">
          <span v-if="item === '...'" class="dots">...</span>
          <button v-else class="btn-page" :class="{ 'active': item === pageInfo.page }" @click="changePage(item)">{{
            item }}</button>
        </template>
      </div>
      <button class="btn btn-white" @click="nextPage" :disabled="pageInfo.page >= totalPages">Sau →</button>
    </div>
  </div>

  <!-- MODAL -->
  <div v-if="isModalVisible" class="modal-backdrop" @click.self="closeModal">
    <div class="modal-panel">
      <button class="modal-close-btn" @click="closeModal">&times;</button>
      <div class="modal-header">
        <h2>{{ modalMode === 'view' ? 'Chi Tiết' : modalMode === 'add' ? 'Thêm Mới' : 'Cập Nhật' }}</h2>
      </div>
      <div class="modal-body">
        <form v-if="modalMode !== 'view'" @submit.prevent="handleSubmit" class="custom-form">
          <div class="form-grid">
            <div class="form-col-left">
              <label class="form-label">Hình ảnh ({{ galleryItems.length }} ảnh)</label>

              <!-- Khung xem ảnh lớn -->
              <div class="main-preview-box">
                <img v-if="activeImage" :src="activeImage" class="main-img" @error="handleImageError" />
                <div v-else class="no-img-placeholder">Chưa có ảnh</div>
              </div>

              <!-- Danh sách Thumbnail linh hoạt -->
              <div class="thumbnail-strip" v-if="galleryItems.length > 0">
                <div v-for="(item, idx) in galleryItems" :key="idx" class="thumb-item"
                  :class="{ 'active': activeImage === item.url }" @click="activeImage = item.url">
                  <img :src="item.url" @error="handleImageError" />
                  <div class="remove-btn" @click.stop="removeGalleryItem(idx)" title="Xoá ảnh này">
                    &times;
                  </div>
                </div>
              </div>

              <div class="upload-control">
                <input type="file" ref="fileInputRef" multiple accept="image/*" @change="onFileChange"
                  class="hidden-input" />
                <button type="button" class="btn btn-white btn-full" @click="$refs.fileInputRef.click()">
                  📷 Thêm ảnh mới
                </button>
                <p class="hint-text" v-if="modalMode === 'edit'">* Bạn có thể thêm/xoá ảnh tuỳ ý.</p>
              </div>
            </div>

            <div class="form-col-right">
              <div class="form-group">
                <label>Tên sản phẩm <span class="req">*</span></label>
                <input v-model="formData.name" type="text" class="form-control" required />
              </div>
              <div class="form-group">
                <label>Giá bán <span class="req">*</span></label>
                <input v-model.number="formData.price" type="number" class="form-control" required />
              </div>
              <div class="form-group">
                <label>Trạng thái</label>
                <select v-model="formData.status" class="form-control">
                  <option :value="1">Đang kinh doanh</option>
                  <option :value="0">Ngừng kinh doanh</option>
                </select>
              </div>
              
              <!-- QUILL EDITOR SECTION (THỦ CÔNG) -->
              <div class="form-group quill-group">
                <label>Mô tả chi tiết</label>
                <div class="quill-wrapper">
                    <div ref="quillEditorRef" style="height: 200px;"></div>
                </div>
              </div>

            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-white" @click="closeModal">Hủy</button>
            <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
              {{ isSubmitting ? 'Đang lưu...' : 'Lưu thông tin' }}
            </button>
          </div>
        </form>

        <div v-else class="view-layout">
          <div class="view-gallery">
            <div class="view-main-image">
              <img :src="activeImage" class="detail-image" @error="handleImageError" />
            </div>
            <div class="view-thumbnails">
              <div v-for="(imgName, idx) in parseImages(formData.image)" :key="idx" class="view-thumb"
                :class="{ 'active': activeImage === getImageUrl(imgName) }" @click="activeImage = getImageUrl(imgName)">
                <img :src="getImageUrl(imgName)" @error="handleImageError" />
              </div>
            </div>
          </div>
          <div class="view-info">
            <div class="view-header">
              <h2 class="detail-name">{{ formData.name }}</h2>
              <span class="status-pill" :class="formData.status === 1 ? 'status-success' : 'status-error'">
                {{ formData.status === 1 ? "Đang bán" : "Hết hàng" }}
              </span>
            </div>
            <div class="detail-price">{{ formatPrice(formData.price) }}</div>
            <div class="detail-section">
              <h4>Mô tả:</h4>
              <!-- Sử dụng v-html để hiển thị nội dung Rich Text -->
              <div class="detail-desc ql-editor" v-html="formData.description || '<p>Không có mô tả.</p>'"></div>
            </div>
            <div class="view-actions">
              <button class="btn btn-outline-primary" @click="modalMode = 'edit'">✏️ Sửa thông tin</button>
              <button class="btn btn-outline-danger" @click="handleDelete(formData)">🗑️ Xóa sản phẩm</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
* {
  box-sizing: border-box;
}

.app-container {
  font-family: 'Inter', sans-serif;
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  background-color: #f3f4f6;
  min-height: 100vh;
  color: #1f2937;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 2.5rem;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 1rem;
}

.header-content h1 {
  font-size: 2rem;
  font-weight: 800;
  background: linear-gradient(to right, #029d76, #77fc6d);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.625rem 1.25rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.btn-primary {
  background-color: #029d76;
  color: white;
}

.btn-primary:hover {
  background-color: #1d4ed8;
}

.btn-white {
  background: white;
  border-color: #d1d5db;
  color: #374151;
}

.btn-white:hover {
  background: #f9fafb;
}

.btn-full {
  width: 100%;
  margin-top: 0.5rem;
}

.btn-outline-primary {
  background: #eff6ff;
  color: #029d76;
  border: 1px solid #bfdbfe;
}

.btn-outline-danger {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 2rem;
}

.product-card {
  background: white;
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  border: 1px solid #f3f4f6;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  height: 100%;
  transition: transform 0.3s;
}

.product-card:hover {
  transform: translateY(-5px);
}

.card-image-container {
  height: 220px;
  position: relative;
  background: #f9fafb;
}

.card-image-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.multi-badge {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: bold;
}

.card-body {
  padding: 1.25rem;
  flex-grow: 1;
}

.card-title {
  font-weight: 700;
  margin-bottom: 0.5rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.price-tag {
  color: #029d76;
  font-weight: 800;
  font-size: 1.2rem;
}

.card-footer {
  padding: 0.75rem;
  background: #f9fafb;
  border-top: 1px solid #eee;
  display: flex;
  gap: 0.5rem;
}

.card-footer button {
  flex: 1;
}

.card-badge {
  position: absolute;
  top: 1rem;
  left: 1rem;
  padding: 0.25rem 0.75rem;
  border-radius: 99px;
  font-size: 0.75rem;
  font-weight: 700;
  background: #fee2e2;
  color: #991b1b;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
}

.modal-panel {
  background: white;
  width: 100%;
  max-width: 900px;
  border-radius: 1rem;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid #eee;
}

.modal-body {
  padding: 2rem;
  overflow-y: auto;
}

.modal-close-btn {
  position: absolute;
  top: 1rem;
  right: 1.5rem;
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: #9ca3af;
}

.form-grid {
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 2rem;
}

@media (max-width: 768px) {

  .form-grid,
  .view-layout {
    grid-template-columns: 1fr;
  }
}

.main-preview-box {
  width: 100%;
  height: 300px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #eee;
  background: #f8f8f8;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
}

.main-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.thumbnail-strip {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 5px;
  margin-bottom: 10px;
}

.thumb-item {
  width: 60px;
  height: 60px;
  border: 2px solid transparent;
  border-radius: 6px;
  overflow: visible;
  cursor: pointer;
  flex-shrink: 0;
  position: relative;
}

.thumb-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
}

.thumb-item.active {
  border-color: #029d76;
  opacity: 0.8;
}

.remove-btn {
  position: absolute;
  top: -6px;
  right: -6px;
  background: #ef4444;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  text-align: center;
  line-height: 18px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  z-index: 10;
}

.remove-btn:hover {
  background: #dc2626;
  transform: scale(1.1);
}

.hint-text {
  font-size: 0.8rem;
  color: #ef4444;
  margin-top: 5px;
  font-style: italic;
}

.hidden-input {
  display: none;
}

.view-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.view-gallery {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.view-main-image {
  height: 400px;
  background: #f3f4f6;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.view-main-image img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.view-thumbnails {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.view-thumb {
  width: 70px;
  height: 70px;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.view-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.view-thumb:hover,
.view-thumb.active {
  border-color: #029d76;
  transform: scale(1.05);
}

.view-info {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.detail-name {
  font-size: 1.8rem;
  margin: 0;
  color: #111827;
}

.detail-price {
  font-size: 2rem;
  color: #029d76;
  font-weight: 800;
}

/* CSS CHO PHẦN HIỂN THỊ CHI TIẾT */
.detail-desc {
  background: #f9fafb;
  padding: 1rem;
  border-radius: 8px;
  line-height: 1.6;
  /* Đảm bảo nội dung HTML trong Quill không bị tràn */
  overflow-wrap: break-word;
}
/* Style cho nội dung bên trong v-html nếu cần */
.detail-desc :deep(ul), .detail-desc :deep(ol) {
    padding-left: 1.5rem;
}
.detail-desc :deep(p) {
    margin-bottom: 0.5rem;
}

.status-pill {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
}

.status-success {
  background: #dcfce7;
  color: #166534;
}

.status-error {
  background: #fee2e2;
  color: #991b1b;
}

.view-actions {
  margin-top: auto;
  display: flex;
  gap: 1rem;
  padding-top: 1rem;
}

.view-actions button {
  flex: 1;
  padding: 0.8rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-label {
  font-weight: 600;
  margin-bottom: 0.5rem;
  display: block;
}

.form-control {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
}

.form-control:focus {
  outline: none;
  border-color: #029d76;
  box-shadow: 0 0 0 3px rgba(2, 157, 118, 0.1);
}

/* QUILL CUSTOM STYLES */
.quill-wrapper {
    background: white;
    border-radius: 0.5rem;
}
/* Style lại cho khung soạn thảo thủ công */
:deep(.ql-toolbar) {
    border-top-left-radius: 0.5rem;
    border-top-right-radius: 0.5rem;
    background: #f9fafb;
}
:deep(.ql-container) {
    border-bottom-left-radius: 0.5rem;
    border-bottom-right-radius: 0.5rem;
    font-size: 1rem;
    background: white;
}

.pagination-container {
  display: flex;
  justify-content: center;
  gap: 5px;
  margin-top: 3rem;
}

.page-numbers {
  display: flex;
  gap: 5px;
  align-items: center;
}

.btn-page {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #eee;
  background: white;
  border-radius: 4px;
  cursor: pointer;
}

.btn-page.active {
  background: #029d76;
  color: white;
  border-color: #029d76;
}

.loader {
  border: 3px solid #f3f3f3;
  border-top: 3px solid #029d76;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}
</style>
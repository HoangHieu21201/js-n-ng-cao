<script setup>
import { ref, computed, onMounted, reactive } from 'vue';

// --- STATE (Dữ liệu) ---
const apiResponse = ref(null);
const isLoading = ref(false);
const isSubmitting = ref(false);
const currentPage = ref(1);

// Modal State
const isModalVisible = ref(false);
const modalMode = ref('view'); // 'view' | 'add' | 'edit'
const fileInputRef = ref(null); // Tham chiếu đến thẻ input file để reset
const previewImage = ref(''); // Dùng để hiển thị ảnh xem trước khi chọn file

const formData = reactive({
  id: null,
  name: '',
  price: 0,
  description: '',
  image: '', // Lưu đường dẫn ảnh hoặc Base64 string
  status: 1
});

// --- COMPUTED (Tính toán) ---
const products = computed(() => apiResponse.value?.data || []);

const pageInfo = computed(() => {
  if (!apiResponse.value) return { page: 1, limit: 12, hasMore: false };
  return {
    page: apiResponse.value.page,
    limit: apiResponse.value.limit,
    hasMore: apiResponse.value.data.length === apiResponse.value.limit,
  };
});

// --- METHODS (Hàm xử lý) ---

// 1. Lấy dữ liệu (Read)
const fetchData = async (page) => {
  if (isLoading.value) return;
  isLoading.value = true;
  try {
    // Mock API call (giả lập)
    const res = await fetch(`/api/home?page=${page}`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    apiResponse.value = await res.json();
    currentPage.value = apiResponse.value.page;
  } catch (error) {
    console.error("Lỗi tải dữ liệu:", error);
  } finally {
    isLoading.value = false;
  }
};

const prevPage = () => {
  if (pageInfo.value.page > 1) fetchData(pageInfo.value.page - 1);
};
const nextPage = () => {
  if (pageInfo.value.hasMore) fetchData(pageInfo.value.page + 1);
};

// 2. Xử lý File Upload (Mới)
const onFileChange = (event) => {
  const file = event.target.files[0];
  if (file) {
    // Kiểm tra định dạng file (chỉ cho phép ảnh)
    if (!file.type.match('image.*')) {
      alert('Vui lòng chỉ chọn file ảnh!');
      return;
    }

    // Sử dụng FileReader để đọc file thành Base64 (Mô phỏng upload thành công và trả về URL)
    const reader = new FileReader();
    reader.onload = (e) => {
      // e.target.result chính là chuỗi Base64 của ảnh
      formData.image = e.target.result; 
      previewImage.value = e.target.result;
    };
    reader.readAsDataURL(file);
  }
};

// 3. Xử lý Modal & Form
const openModal = (mode, product = null) => {
  modalMode.value = mode;
  previewImage.value = ''; // Reset preview

  if (mode === 'add') {
    Object.assign(formData, { id: null, name: '', price: 0, description: '', image: '', status: 1 });
    if (fileInputRef.value) fileInputRef.value.value = null; // Reset input file
  } else if (product) {
    Object.assign(formData, { ...product });
    previewImage.value = product.image; // Hiển thị ảnh hiện có
  }

  isModalVisible.value = true;
  document.body.style.overflow = "hidden";
};

const closeModal = () => {
  isModalVisible.value = false;
  document.body.style.overflow = "";
};

// 4. Thêm / Sửa (Create / Update)
const handleSubmit = async () => {
  if (isSubmitting.value) return;
  
  // Validate cơ bản
  if (!formData.name || formData.price < 0) {
    alert("Vui lòng nhập tên và giá hợp lệ.");
    return;
  }

  isSubmitting.value = true;

  try {
    const url = modalMode.value === 'add'
      ? '/api/products'
      : `/api/products/${formData.id}`;

    const method = modalMode.value === 'add' ? 'POST' : 'PUT';

    // Lưu ý: Ở môi trường thực tế, bạn sẽ dùng FormData để gửi file lên server upload riêng
    // const dataToSend = new FormData();
    // dataToSend.append('photo', fileObject);
    // ... sau đó server trả về URL ảnh, rồi mới lưu sản phẩm.
    
    // Ở đây ta gửi JSON chứa ảnh Base64
    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (!res.ok) throw new Error("Lỗi khi lưu sản phẩm");

    await fetchData(currentPage.value);
    closeModal();
    alert(modalMode.value === 'add' ? 'Thêm thành công!' : 'Cập nhật thành công!');

  } catch (error) {
    console.error(error);
    alert("Có lỗi xảy ra, vui lòng thử lại!");
  } finally {
    isSubmitting.value = false;
  }
};

// 5. Xóa (Delete)
const handleDelete = async (product) => {
  if (!confirm(`Bạn có chắc muốn xóa: ${product.name}?`)) return;

  try {
    const res = await fetch(`/api/products/${product.id}`, { method: 'DELETE' });

    if (!res.ok) throw new Error("Lỗi khi xóa sản phẩm");

    await fetchData(currentPage.value);
    alert('Đã xóa sản phẩm!');
  } catch (error) {
    console.error(error);
    alert("Không thể xóa sản phẩm này.");
  }
};

// Utilities
const formatPrice = (price) => {
  if (typeof price !== "number") return "N/A";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
};

const placeholderImage = (name = "Product") => {
  return `https://placehold.co/400x300/e0e0e0/555555?text=${encodeURI(name)}`;
};

const handleImageError = (event) => {
  event.target.src = placeholderImage("Error");
};

// Lifecycle
onMounted(() => {
  fetchData(currentPage.value);
});
</script>

<template>
  <div class="app-container">
    <!-- Header: Tiêu đề & Nút Thêm -->
    <div class="header-actions">
      <h1>Quản lý kho hàng</h1>
      <button class="btn-add" @click="openModal('add')">
        + Thêm mới
      </button>
    </div>

    <!-- Trạng thái Loading -->
    <div v-if="isLoading" class="loading-spinner">
      <div class="spinner"></div>
      <p>Đang tải dữ liệu...</p>
    </div>

    <!-- Lưới sản phẩm -->
    <div v-else-if="products.length > 0" class="product-grid">
      <div v-for="product in products" :key="product.id" class="product-card" @click="openModal('view', product)">
        <div v-if="product.status === 0" class="status-overlay">
          <span>Hết hàng</span>
        </div>

        <img :src="product.image || placeholderImage(product.name)" :alt="product.name" class="product-image"
          @error="handleImageError" />

        <div class="product-content">
          <h3>{{ product.name }}</h3>
          <p>{{ product.description }}</p>
          <span class="product-price">{{ formatPrice(product.price) }}</span>
        </div>

        <!-- Nút hành động (Sửa / Xóa) -->
        <div class="card-actions">
          <button class="btn-icon edit" @click.stop="openModal('edit', product)">
            ✎
          </button>
          <button class="btn-icon delete" @click.stop="handleDelete(product)">
            ×
          </button>
        </div>
      </div>
    </div>

    <!-- Trạng thái không có sản phẩm -->
    <div v-else-if="!isLoading && products.length === 0" class="no-products">
      <p>Không tìm thấy sản phẩm nào.</p>
    </div>

    <!-- Phân trang -->
    <div v-if="!isLoading && apiResponse" class="pagination">
      <button @click="prevPage" :disabled="pageInfo.page <= 1">
        &laquo; Trang trước
      </button>
      <span>Trang {{ pageInfo.page }}</span>
      <button @click="nextPage" :disabled="!pageInfo.hasMore">
        Trang sau &raquo;
      </button>
    </div>
  </div>

  <!-- Modal Đa Năng (Xem / Thêm / Sửa) -->
  <div v-if="isModalVisible" class="modal-overlay" @click.self="closeModal">
    <div class="modal-content">
      <button class="modal-close" @click="closeModal">&times;</button>

      <h2>
        {{ modalMode === 'view' ? 'Chi tiết sản phẩm' :
          modalMode === 'add' ? 'Thêm sản phẩm mới' : 'Cập nhật sản phẩm' }}
      </h2>
      <hr />

      <!-- FORM NHẬP LIỆU -->
      <form v-if="modalMode !== 'view'" @submit.prevent="handleSubmit" class="product-form">
        <div class="form-group">
          <label>Tên sản phẩm <span class="required">*</span></label>
          <input v-model="formData.name" type="text" required placeholder="Nhập tên..." />
        </div>

        <div class="form-group">
          <label>Giá (VNĐ) <span class="required">*</span></label>
          <input v-model.number="formData.price" type="number" required placeholder="0" min="0" />
        </div>

        <!-- INPUT FILE ẢNH MỚI -->
        <div class="form-group">
          <label>Hình ảnh</label>
          <div class="image-upload-container">
            <!-- Input chọn file -->
            <input 
              type="file" 
              ref="fileInputRef"
              accept="image/png, image/jpeg, image/jpg" 
              @change="onFileChange" 
              class="file-input"
            />
            
            <!-- Hiển thị preview nếu có ảnh -->
            <div v-if="previewImage" class="image-preview-box">
              <img :src="previewImage" alt="Preview" class="preview-img" />
              <p class="preview-label">Ảnh đã chọn</p>
            </div>
            <div v-else class="no-image-placeholder">
              Chưa chọn ảnh
            </div>
          </div>
        </div>

        <div class="form-group">
          <label>Mô tả</label>
          <textarea v-model="formData.description" rows="3" placeholder="Mô tả chi tiết..."></textarea>
        </div>

        <div class="form-group">
          <label>Trạng thái</label>
          <select v-model="formData.status">
            <option :value="1">Đang bán</option>
            <option :value="0">Hết hàng</option>
          </select>
        </div>

        <div class="form-actions">
          <button type="button" @click="closeModal" class="btn-cancel">Hủy</button>
          <button type="submit" class="btn-submit" :disabled="isSubmitting">
            {{ isSubmitting ? 'Đang xử lý...' : 'Lưu dữ liệu' }}
          </button>
        </div>
      </form>

      <!-- CHẾ ĐỘ XEM CHI TIẾT -->
      <div v-else class="view-mode">
        <div class="view-image-wrapper">
            <img :src="formData.image || placeholderImage(formData.name)" class="modal-product-image"
            @error="handleImageError" />
        </div>
        <h3 class="modal-product-name">{{ formData.name }}</h3>
        <p class="modal-product-price">{{ formatPrice(formData.price) }}</p>
        
        <div class="info-row">
            <strong>Mô tả:</strong>
            <p>{{ formData.description || 'Chưa có mô tả' }}</p>
        </div>

        <div class="info-row">
            <strong>Trạng thái:</strong>
            <span :class="['status-badge', formData.status === 1 ? 'status-active' : 'status-inactive']">
            {{ formData.status === 1 ? "Đang bán" : "Hết hàng" }}
            </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Giữ lại các style cũ và thêm style mới cho File Upload */

.app-container {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  color: #333;
  background-color: #f8f9fa;
  min-height: 100vh;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e9ecef;
}

h1 {
  color: #2c3e50;
  margin: 0;
  font-size: 1.8rem;
}

/* Buttons */
.btn-add {
  background-color: #10b981;
  color: white;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.2s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.btn-add:hover {
  background-color: #059669;
}

.btn-icon {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  margin-left: 0.5rem;
  transition: all 0.2s;
}

.btn-icon:hover {
  transform: scale(1.1);
}

.btn-icon.edit {
  background-color: #e0f2fe;
  color: #0284c7;
}

.btn-icon.delete {
  background-color: #fee2e2;
  color: #dc2626;
}

/* Grid & Card */
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.product-card {
  position: relative;
  background-color: #ffffff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: transform 0.2s, box-shadow 0.2s;
  overflow: hidden;
  cursor: pointer;
  display: flex;
  flex-direction: column;
}

.product-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.card-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 20;
  background: rgba(255,255,255,0.8);
  padding: 4px;
  border-radius: 20px;
}

.product-card:hover .card-actions {
  opacity: 1;
}

.product-image {
  width: 100%;
  height: 180px;
  object-fit: cover;
  border-bottom: 1px solid #f0f0f0;
}

.product-content {
  padding: 1.2rem;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.product-content h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
  color: #333;
  font-weight: 600;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-content p {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 0.8rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex-grow: 1;
  line-height: 1.4;
}

.product-price {
  font-size: 1.1rem;
  font-weight: 700;
  color: #dc2626;
  text-align: left;
}

/* Status & Overlays */
.status-overlay {
  position: absolute;
  inset: 0;
  background-color: rgba(255, 255, 255, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
  backdrop-filter: blur(1px);
  pointer-events: none;
}

.status-overlay span {
  font-size: 1rem;
  font-weight: bold;
  color: #555;
  background: white;
  padding: 0.4rem 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
}

.pagination button {
  padding: 0.5rem 1rem;
  background: white;
  border: 1px solid #d1d5db;
  color: #374151;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.pagination button:hover:not(:disabled) {
  border-color: #10b981;
  color: #10b981;
}

.pagination button:disabled {
  background: #f3f4f6;
  color: #9ca3af;
  cursor: not-allowed;
}

/* Loading & Empty */
.loading-spinner,
.no-products {
  text-align: center;
  padding: 3rem 0;
  color: #9ca3af;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-top: 4px solid #10b981;
  border-radius: 50%;
  margin: 0 auto 1rem;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}

/* Modal & Form Styles */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
  padding: 1rem;
}

.modal-content {
  background: #fff;
  padding: 2rem;
  border-radius: 12px;
  width: 100%;
  max-width: 550px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  animation: zoomIn 0.2s ease-out;
}

@keyframes zoomIn {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.modal-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  font-size: 2rem;
  line-height: 1;
  color: #9ca3af;
  cursor: pointer;
  transition: color 0.2s;
}

.modal-close:hover {
  color: #374151;
}

.product-form .form-group {
  margin-bottom: 1.2rem;
}

.product-form label {
  display: block;
  margin-bottom: 0.4rem;
  font-weight: 600;
  font-size: 0.95rem;
  color: #374151;
}

.required {
  color: #dc2626;
}

.product-form input[type="text"],
.product-form input[type="number"],
.product-form textarea,
.product-form select {
  width: 100%;
  padding: 0.6rem 0.8rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.product-form input:focus,
.product-form textarea:focus,
.product-form select:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

/* --- Style mới cho Upload File --- */
.image-upload-container {
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
  background-color: #f9fafb;
}

.file-input {
  margin-bottom: 1rem;
}

.image-preview-box {
  margin-top: 0.5rem;
}

.preview-img {
  max-width: 100%;
  max-height: 200px;
  border-radius: 6px;
  border: 1px solid #eee;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.preview-label {
  font-size: 0.8rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

.no-image-placeholder {
  color: #9ca3af;
  font-style: italic;
  font-size: 0.9rem;
  padding: 1rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.8rem;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.btn-cancel {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
  padding: 0.6rem 1.2rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}

.btn-submit {
  background: #10b981;
  color: white;
  border: none;
  padding: 0.6rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
}

.btn-submit:hover { background-color: #059669; }
.btn-cancel:hover { background-color: #f3f4f6; }
.btn-submit:disabled { opacity: 0.7; cursor: not-allowed; }

/* Modal View Mode */
.view-mode {
    text-align: left;
}

.view-image-wrapper {
    text-align: center;
    background: #f3f4f6;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
}

.modal-product-image {
  max-width: 100%;
  max-height: 300px;
  object-fit: contain;
  border-radius: 4px;
}

.modal-product-name {
  color: #111827;
  font-size: 1.5rem;
  margin-bottom: 0.25rem;
}

.modal-product-price {
  font-size: 1.25rem;
  font-weight: 700;
  color: #dc2626;
  margin-bottom: 1.5rem;
}

.info-row {
    margin-bottom: 1rem;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 600;
}

.status-active {
  background: #d1fae5;
  color: #065f46;
}

.status-inactive {
  background: #fee2e2;
  color: #991b1b;
}
</style>
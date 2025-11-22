
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
const formData = reactive({
  id: null,
  name: '',
  price: 0,
  description: '',
  image: '',
  status: 1
});

// --- COMPUTED (Tính toán) ---
const products = computed(() => apiResponse.value?.data || []);

const pageInfo = computed(() => {
  if (!apiResponse.value) return { page: 1, limit: 10, hasMore: false };
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

// 2. Xử lý Modal & Form
const openModal = (mode, product = null) => {
  modalMode.value = mode;

  if (mode === 'add') {
    // Reset form khi thêm mới
    Object.assign(formData, { id: null, name: '', price: 0, description: '', image: '', status: 1 });
  } else if (product) {
    // Copy dữ liệu sản phẩm vào form
    Object.assign(formData, { ...product });
  }

  isModalVisible.value = true;
  document.body.style.overflow = "hidden";
};

const closeModal = () => {
  isModalVisible.value = false;
  document.body.style.overflow = "";
};

// 3. Thêm / Sửa (Create / Update)
const handleSubmit = async () => {
  if (isSubmitting.value) return;
  isSubmitting.value = true;

  try {
    const url = modalMode.value === 'add'
      ? '/api/products'
      : `/api/products/${formData.id}`; // Backend cần hỗ trợ route này

    const method = modalMode.value === 'add' ? 'POST' : 'PUT';

    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (!res.ok) throw new Error("Lỗi khi lưu sản phẩm");

    // Refresh lại dữ liệu sau khi lưu thành công
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

// 4. Xóa (Delete)
const handleDelete = async (product) => {
  if (!confirm(`Bạn có chắc muốn xóa: ${product.name}?`)) return;

  try {
    const res = await fetch(`/api/products/${product.id}`, { method: 'DELETE' }); // Backend cần hỗ trợ route này

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

const placeholderImage = (name = "San pham") => {
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
      <h1>Quản lý sản phẩm</h1>
      <button class="btn-add" @click="openModal('add')">
        + Thêm sản phẩm
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

      <!-- Tiêu đề Modal thay đổi theo chế độ -->
      <h2>
        {{ modalMode === 'view' ? 'Chi tiết sản phẩm' :
          modalMode === 'add' ? 'Thêm sản phẩm mới' : 'Cập nhật sản phẩm' }}
      </h2>
      <hr />

      <!-- FORM NHẬP LIỆU (Khi mode là Add hoặc Edit) -->
      <form v-if="modalMode !== 'view'" @submit.prevent="handleSubmit" class="product-form">
        <div class="form-group">
          <label>Tên sản phẩm</label>
          <input v-model="formData.name" type="text" required placeholder="Nhập tên..." />
        </div>

        <div class="form-group">
          <label>Giá (VNĐ)</label>
          <input v-model.number="formData.price" type="number" required placeholder="0" />
        </div>

        <div class="form-group">
          <label>Hình ảnh (URL)</label>
          <input v-model="formData.image" type="text" placeholder="https://..." />
        </div>

        <div class="form-group">
          <label>Mô tả</label>
          <textarea v-model="formData.description" rows="3"></textarea>
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
            {{ isSubmitting ? 'Đang lưu...' : 'Lưu lại' }}
          </button>
        </div>
      </form>

      <!-- CHẾ ĐỘ XEM CHI TIẾT (View Only) -->
      <div v-else class="view-mode">
        <img :src="formData.image || placeholderImage(formData.name)" class="modal-product-image"
          @error="handleImageError" />
        <h3 class="modal-product-name">{{ formData.name }}</h3>
        <p class="modal-product-price">{{ formatPrice(formData.price) }}</p>
        <p>{{ formData.description }}</p>

        <span :class="['status-badge', formData.status === 1 ? 'status-active' : 'status-inactive']">
          Trạng thái: {{ formData.status === 1 ? "Đang bán" : "Hết hàng" }}
        </span>

        <p class="product-id">ID: {{ formData.id }}</p>
      </div>
    </div>
  </div>
</template>


<style scoped>
.app-container {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  color: #333;
  background-color: #f9f9f9;
  min-height: 100vh;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2.5rem;
}

h1 {
  color: #2c3e50;
  margin: 0;
}

/* Buttons */
.btn-add {
  background-color: #28a745;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  font-size: 1rem;
}

.btn-add:hover {
  background-color: #218838;
}

.btn-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  margin-left: 0.5rem;
  transition: transform 0.2s;
}

.btn-icon:hover {
  transform: scale(1.1);
}

.btn-icon.edit {
  background-color: #e3f2fd;
  color: #007bff;
}

.btn-icon.delete {
  background-color: #fce8e6;
  color: #e74c3c;
}

/* Grid & Card */
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2.5rem;
}

.product-card {
  position: relative;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  background-color: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s;
  overflow: hidden;
  cursor: pointer;
  display: flex;
  flex-direction: column;
}

.product-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.card-actions {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 20;
}

.product-card:hover .card-actions {
  opacity: 1;
}

.product-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
  border-bottom: 1px solid #f0f0f0;
}

.product-content {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.product-content h3 {
  margin: 0 0 0.75rem 0;
  font-size: 1.25rem;
  color: #007bff;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-content p {
  font-size: 0.95rem;
  color: #555;
  margin-bottom: 1rem;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex-grow: 1;
}

.product-price {
  font-size: 1.2rem;
  font-weight: bold;
  color: #e74c3c;
  text-align: right;
}

/* Status & Overlays */
.status-overlay {
  position: absolute;
  inset: 0;
  background-color: rgba(255, 255, 255, 0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
  backdrop-filter: blur(2px);
  pointer-events: none;
}

.status-overlay span {
  font-size: 1.2rem;
  font-weight: bold;
  color: #e74c3c;
  padding: 0.5rem 1rem;
  border: 2px solid #e74c3c;
  border-radius: 6px;
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  margin-top: 2.5rem;
}

.pagination button {
  padding: 0.75rem 1.5rem;
  background: #fff;
  border: 1px solid #007bff;
  color: #007bff;
  border-radius: 8px;
  cursor: pointer;
}

.pagination button:hover:not(:disabled) {
  background: #007bff;
  color: #fff;
}

.pagination button:disabled {
  background: #f1f1f1;
  color: #ccc;
  border-color: #ddd;
  cursor: not-allowed;
}

/* Loading & Empty */
.loading-spinner,
.no-products {
  text-align: center;
  padding: 4rem 0;
  color: #95a5a6;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 5px solid #f3f3f3;
  border-top: 5px solid #007bff;
  border-radius: 50%;
  margin: 0 auto 1rem;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  100% {
    transform: rotate(360deg);
  }
}

/* Modal & Form Styles */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(3px);
}

.modal-content {
  background: #fff;
  padding: 2.5rem;
  border-radius: 12px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}

.modal-close {
  position: absolute;
  top: 15px;
  right: 15px;
  background: none;
  border: none;
  font-size: 2.5rem;
  line-height: 1;
  color: #aaa;
  cursor: pointer;
}

.modal-close:hover {
  color: #333;
}

.product-form .form-group {
  margin-bottom: 1rem;
}

.product-form label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.product-form input,
.product-form textarea,
.product-form select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
}

.product-form textarea {
  resize: vertical;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
}

.btn-cancel {
  background: #f1f1f1;
  color: #333;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
}

.btn-submit {
  background: #007bff;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
}

.btn-submit:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Modal View Mode */
.modal-product-image {
  width: 100%;
  max-height: 350px;
  object-fit: cover;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.modal-product-name {
  color: #007bff;
  font-size: 1.75rem;
  margin-bottom: 0.5rem;
}

.modal-product-price {
  font-size: 1.5rem;
  font-weight: 600;
  color: #e74c3c;
  margin-bottom: 1rem;
}

.status-badge {
  display: inline-block;
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  margin-top: 1rem;
  font-weight: 600;
}

.status-active {
  background: #e6f7f0;
  color: #008a4c;
}

.status-inactive {
  background: #fdf0f0;
  color: #e74c3c;
}

.product-id {
  text-align: right;
  color: #999;
  margin-top: 1rem;
  font-size: 0.9rem;
}
</style>
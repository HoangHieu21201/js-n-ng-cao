<script setup>
import { ref, onMounted, computed } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router'
import axios from 'axios';

// Sửa đổi: Giữ lại biến để tương thích ngrok, nhưng thêm giá trị dự phòng cho môi trường local
const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const ngrokHeaderConfig = {
  headers: { 'ngrok-skip-browser-warning': 'true' },
};

const router = useRouter()
const store = useStore();
const user = ref(null)
const showBackToTop = ref(false)

const cartItemCount = computed(() => store.getters['cart/cartItems'].length);

const handleLogout = () => {
  localStorage.removeItem('loggedInUser')
  user.value = null
  // Giữ lại logic chuyển trang và tải lại để đảm bảo trạng thái được làm mới hoàn toàn
  router.push('/login').then(() => {
    window.location.reload();
  });
}

const handleScroll = () => {
  showBackToTop.value = window.scrollY > 300
}

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// Tối ưu: Gộp 2 onMounted thành 1 để code sạch hơn và quản lý tập trung
onMounted(async () => {
  // Lấy thông tin user khi component được tạo
  const storedUser = JSON.parse(localStorage.getItem('loggedInUser'))
  if (storedUser) {
    try {
      // Sử dụng biến API_URL đã được sửa đổi và thêm header ngrok
      const res = await axios.get(`${API_URL}/user/${storedUser.id}`, ngrokHeaderConfig)
      user.value = res.data
    } catch (err) {
      // SỬA LỖI CHÍNH:
      // Giống như code cũ, chỉ báo lỗi ra console, không tự động đăng xuất người dùng.
      // Điều này giúp tránh việc bị "đá" ra ngoài khi API tạm thời không khả dụng.
      console.error("Lỗi khi lấy thông tin người dùng:", err)
    }
  }

  // Thêm event listener cho việc cuộn trang
  window.addEventListener('scroll', handleScroll)
})
</script>

<template>
  <header>
    <nav class="navbar navbar-expand-lg shadow-sm sticky-top custom-navbar">
      <div class="container">
        <router-link class="navbar-brand d-flex align-items-center" to="/">
          <img src="https://figurecollector.io.vn/wp-content/uploads/2025/09/logofigure.png" alt="logo" width="220"
            class="me-2" />
        </router-link>

        <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <i class="fa fa-bars text-dark fs-4"></i>
        </button>

        <div class="collapse navbar-collapse" id="navbarNav">
          <ul class="navbar-nav mx-auto text-center gap-lg-4">
            <li class="nav-item ">
              <router-link class="nav-link" to="/">Trang chủ </router-link>
            </li>
            <li class="nav-item ">
              <router-link active-class="active-link" class="nav-link" to="/shop">Cửa hàng</router-link>
            </li>
            <li class="nav-item ">
              <router-link active-class="active-link" class="nav-link" to="/about">About</router-link>
            </li>
            <li class="nav-item ">
              <router-link active-class="active-link" class="nav-link" to="/profile">Hồ sơ</router-link>
            </li>
            <li class="nav-item ">
              <router-link active-class="active-link" to="/wishlist" class="nav-link">
                Yêu thích
                <i class="fa fa-heart ms-1" style="color: red;"></i>
              </router-link>
            </li>
          </ul>


          <div class="d-flex align-items-center gap-2">
            <template v-if="user">
              <span class="text-dark">
                <i class="fa-solid fa-user" style="color: #000000;"></i>
                Hi, <b>{{ user.fullname }}</b>
              </span>

              <template v-if="user.role === 'admin'">
                <router-link to="/admin" class="btn btn-dark btn-sm fw-semibold">Admin Panel</router-link>
              </template>

              <button @click="handleLogout" class="btn btn-outline-danger btn-sm">Đăng xuất</button>
            </template>

            <template v-else>
              <router-link to="/login" class="btn btn-outline-dark btn-sm">Đăng nhập</router-link>
              <router-link to="/register" class="btn btn-dark btn-sm fw-semibold">Đăng ký</router-link>
            </template>

            <div class="position-relative">
              <router-link to="/cart"><i class="fa-solid fa-cart-shopping fs-5 text-dark"></i></router-link>
              <span v-if="cartItemCount > 0"
                class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                style="font-size: 10px;">
                {{ cartItemCount }}
              </span>
            </div>

          </div>

        </div>
      </div>
    </nav>
  </header>

  <router-view />

  <footer class="footer text-dark mt-5">
    <div class="container py-5">
      <div class="row gy-4">
        <div class="col-lg-4 col-md-6">
          <router-link class="navbar-brand d-flex align-items-center" to="/">
            <img src="https://figurecollector.io.vn/wp-content/uploads/2025/09/logofigure.png" alt="logo" width="220"
              class="me-2" />
          </router-link>
          <p class="small text-secondary mb-3">
            Figure gundam đẳng cấp — Cập nhật những xu hướng mới nhất
            và nâng tầm phong cách cùng Figurecollector.io.vn
          </p>
          <div class="d-flex gap-3">
            <a href="#" class="social"><i class="fab fa-facebook-f"></i></a>
            <a href="#" class="social"><i class="fab fa-instagram"></i></a>
            <a href="#" class="social"><i class="fab fa-tiktok"></i></a>
            <a href="#" class="social"><i class="fab fa-twitter"></i></a>
          </div>
        </div>

        <div class="col-lg-2 col-md-6">
          <h6 class="fw-semibold mb-3 text-black">Liên kết nhanh</h6>
          <ul class="list-unstyled footer-links">
            <li><router-link to="/" class="text-decoration-none">Trang chủ</router-link></li>
            <li><router-link to="/shop" class="text-decoration-none">Danh mục</router-link></li>
            <li><router-link to="/about" class="text-decoration-none">About</router-link></li>
            <li><router-link to="/profile" class="text-decoration-none">Tài khoản</router-link></li>
          </ul>
        </div>

        <div class="col-lg-3 col-md-6">
          <h6 class="fw-semibold mb-3 text-black">Hỗ trợ</h6>
          <ul class="list-unstyled footer-links">
            <li><a href="#" class="text-decoration-none">Hỏi & Đáp</a></li>
            <li><a href="#" class="text-decoration-none">Chính sách bảo mật</a></li>
            <li><a href="#" class="text-decoration-none">Điều khoản dịch vụ</a></li>
            <li><a href="#" class="text-decoration-none">Liên hệ với chúng tôi</a></li>
          </ul>
        </div>

        <div class="col-lg-3 col-md-6">
          <h6 class="fw-semibold mb-3 text-black">Liên hệ</h6>
          <p class="small mb-1"><i class="fa fa-map-marker-alt me-2"></i>BMT, Dak Lak, Vietnam</p>
          <p class="small mb-1"><i class="fa fa-envelope me-2"></i>support@figurecollector.vn</p>
          <p class="small mb-0"><i class="fa fa-phone me-2"></i>+84 123 456 789</p>
        </div>
      </div>
    </div>

    <div class="footer-bottom text-center py-3 mt-4 border-top border-secondary">
      <p class="mb-0 small text-secondary">
        &copy; 2025 <b>Github</b> — HoangHieu21201/Vue
      </p>
    </div>
    <button v-show="showBackToTop" class="back-to-top" @click="scrollToTop">
      <i class="fa-solid fa-chevron-up"></i>
    </button>
  </footer>
</template>

<style scoped>
.active-link {
  font-weight: 600;
  color: #000 !important;
  text-decoration: underline coral;
}

.back-to-top {
  position: fixed;
  bottom: 25px;
  right: 25px;
  width: 45px;
  height: 45px;
  border-radius: 50%;
  background-color: #000;
  color: #fff;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  z-index: 999;
}

.back-to-top:hover {
  background-color: #444;
  transform: translateY(-3px);
}

body {
  background-color: #fff;
  color: #222;
}

.custom-navbar {
  background-color: #fff;
  border-bottom: 1px solid #e5e5e5;
  padding: 0.8rem 0;
  transition: all 0.3s ease;
}

.navbar-brand img {
  /* filter: brightness(0); */
  /* cho logo đen trắng */
}

.navbar-nav .nav-link {
  color: #333 !important;
  font-weight: 500;
  transition: color 0.3s;
}

.navbar-nav .nav-link:hover {
  color: #000 !important;
  text-decoration: underline;
}

.navbar-nav .nav-link.router-link-active {
  color: #000 !important;
  font-weight: 600;
}

.footer {
  background: #f8f8f8;
  border-top: 1px solid #ddd;
  font-size: 0.95rem;
  color: #333;
}

.footer h6,
.footer h5 {
  color: #000;
}

.footer-links a {
  color: #555;
  transition: color 0.3s;
  display: inline-block;
  padding: 3px 0;
}

.footer-links a:hover {
  color: #000;
  text-decoration: underline;
}

.social {
  color: #333;
  font-size: 1.1rem;
  border: 1px solid #aaa;
  width: 35px;
  height: 35px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: 0.3s;
}

.social:hover {
  background-color: #000;
  color: #fff;
  border-color: #000;
}

.footer-bottom {
  background-color: #f0f0f0;
}

@media (max-width: 991px) {
  .navbar-collapse {
    background-color: #fff;
    border-top: 1px solid #eee;
    padding: 1rem;
  }

  .nav-link {
    padding: 0.5rem 0;
  }
}
</style>
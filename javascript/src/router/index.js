// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import Product from '../views/Product.vue'
import Cart from '../views/Cart.vue'

const routes = [
  { path: '/', component: Product }, // Trang chủ là trang sản phẩm
  { path: '/cart', component: Cart } // Trang giỏ hàng
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
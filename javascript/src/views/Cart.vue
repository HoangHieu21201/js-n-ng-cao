<script setup>
import { useCartStore } from '../stores/cart'
// Lấy dữ liệu từ store
const cartStore = useCartStore()
</script>

<template>
  <div>
    <h1>Giỏ hàng của bạn</h1>
    <div v-if="cartStore.items.length === 0">
      Chưa có sản phẩm nào.
    </div>
    <ul v-else>
      <li v-for="item in cartStore.items" :key="item.id">
        {{ item.name }} - Số lượng: {{ item.quantity }} - Giá: {{ item.price }}
        <button @click="cartStore.removeItem(item.id)">Xóa</button>
      </li>
    </ul>
  </div>
</template>
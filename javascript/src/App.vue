<script setup>
// Không cần import component Product ở đây nữa vì Router sẽ lo việc đó
</script>

<template>
  <div id="app">
    <nav>
      <router-link to="/">Danh sách Sản phẩm</router-link> |
      <router-link to="/cart">Giỏ hàng</router-link>
    </nav>
    
    <router-view></router-view>
  </div>
</template>

<style>
/* CSS chung cho toàn app (nếu có) */
nav {
  padding: 20px;
  background: #f0f0f0;
  margin-bottom: 20px;
}
nav a {
  margin: 0 10px;
  text-decoration: none;
  font-weight: bold;
  color: #2c3e50;
}
.router-link-active {
  color: #42b983;
}
</style>
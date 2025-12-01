import { createApp } from 'vue'
import './style.css' // Nếu bạn có file css chung
import App from './App.vue'
import router from './router' // Import router từ file index.js vừa tạo

const app = createApp(App)

// Kích hoạt router
app.use(router)

app.mount('#app')
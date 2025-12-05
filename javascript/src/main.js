// src/main.js
import { createApp } from 'vue'
import './style.css' // Nếu có file css chung
import App from './App.vue'
import router from './router' // Import router vừa tạo
import { createPinia } from 'pinia' // Import Pinia

const app = createApp(App)
const pinia = createPinia()

app.use(router)
app.use(pinia)
app.mount('#app')
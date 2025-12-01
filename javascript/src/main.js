
import { createApp } from "vue";
import App from "./App.vue";
import router from "../router/index.js";



const app = createApp(App);
const options = {
    position: "top-right",
    timeout: 4000, 
    closeOnClick: true,
    pauseOnFocusLoss: true,
    pauseOnHover: true,
    draggable: true,
    draggablePercent: 0.6,
    showCloseButtonOnHover: false,
    hideProgressBar: false,
    closeButton: "button",
    icon: true,
    rtl: false
};
app.use(router);
app.use(store);
app.use(Toast, options);
app.mount("#app");
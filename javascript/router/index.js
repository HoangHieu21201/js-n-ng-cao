import { createRouter, createWebHistory } from "vue-router";

// User pages
// Note: If this file is in 'src/router/', '..' takes you to 'src/'
import home from "../page/home.vue";

// FIX: 'userLayout' was used in routes but not imported
// Make sure this path points to your actual layout file
import userLayout from "../layout/userLayout.vue"; 

const routes = [
  {
    path: "/",
    component: userLayout,
    children: [
      { path: "", component: home },
    ],
  },
  // You referenced '/login' and '/404' in your beforeEach guard, 
  // so you likely need routes for them:
  {
    path: "/login",
    name: "Login",
    // Example of lazy-loading a component
    component: () => import("../page/login.vue") 
  },
  {
    path: "/404",
    name: "NotFound",
    component: () => import("../page/404.vue")
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    return { top: 0 };
  },
});

router.beforeEach((to, from, next) => {
  // Ensure this localStorage key exists, or handle null gracefully
  const loggedUser = JSON.parse(localStorage.getItem("loggedInUser"));

  if (to.meta.requiresAdmin) {
    if (!loggedUser) {
      next("/login");
    } else if (loggedUser.role !== "admin") {
      next("/404");
    } else {
      next();
    }
  } else {
    next();
  }
});

export default router;
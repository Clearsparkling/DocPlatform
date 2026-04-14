import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: () => import("../components/Home.vue")
    },
    {
      path: "/login",
      name: "login",
      component: () => import("../components/Login.vue")
    }
  ],
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem("token")
  if (to.path == "/") {
    next()
  } else if (to.name !== "login" && !token) {
    next({ name: "login" })
  } else {
    next()
  }
})


export default router
import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { storeToRefs } from 'pinia'




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
    },
    {
      path: "/markdown",
      name: "markdown",
      component: () => import("../components/MarkdownText.vue")
    },
    {
      path: "/:id",
      name: "userhomepage",
      component: () => import("../components/MarkdownText.vue")
    },
    {
      path: "/upload",
      name: "upload",
      component:() => import("../components/UpLoad.vue")
    },


    // 404 Not Found
    {
      path: "/:pathMatch(.*)*",
      name: "Not Found",
      component: () => import("../components/NotFound.vue")
    }
  ],
})

router.beforeEach((to, from, next) => {
  const { userToken, userUsername } = storeToRefs(useUserStore())

  if (to.path == "/") {
    next()
  } else if (to.name !== "login" && !userToken.value) {
    next({ name: "login" })
  } else {
    next()
  }
})


export default router
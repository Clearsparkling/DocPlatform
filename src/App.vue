<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterView } from 'vue-router';
// 头部组件
import Nav from './components/Nav.vue';
// 底部组件
import Bottom from './components/Bottom.vue';

import request from './utils/request';
import { useUserStore } from './stores/userStore';
import { ElNotification } from 'element-plus'
import MagneticDemo from './components/MagneticDemo.vue'
import TypeWriter from './components/TypeWriter.vue'
import Cross from './components/Cross.vue'
import Closure from './components/Closure.vue'
import Music from './components/Music.vue'
const errorAlter = (title: string, messgae: string) => {
  ElNotification({
    title: title,
    message: messgae,
    type: 'error'
  })
}

const userStore = useUserStore()

onMounted(async () => {
  if (userStore.userToken) {
    // 使用后端已有的 /auth/me 接口验证 token 是否有效
    await request.get("/auth/me").then((res) => {
      // token 有效，更新用户名（确保一致性）
      if (res.data.success) {
        userStore.userUsername = res.data.data.username
      }
    }).catch(() => {
      // token 无效或过期，清空并提示
      userStore.userToken = ''
      userStore.userUsername = ''
      errorAlter('提示', 'token已过期，请重新登录')
    })
  }
})

</script>

<template>
  <div class="background">
    <Nav></Nav>

    <RouterView class="flex-box">

    </RouterView>

    <Bottom></Bottom>
  </div>
  <!-- <Cross />
  <MagneticDemo /> -->


  <!-- <TypeWriter /> -->
</template>

<!-- 隐藏全局光标 -->
<style>
/* * {
  cursor: none !important;
} */
</style>

<style scoped>
.background {
  width: 100%;
  min-height: 100vh;
  background-color: #16171D;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.flex-box {
  flex: 1;
}
</style>

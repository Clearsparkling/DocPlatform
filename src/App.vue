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
    await request.get("/auth/token/expiration").then((res) => {
      console.log(res.data)
    }).catch((error) => {
      userStore.userToken = ''
      userStore.userUsername = ''
      errorAlter('错误','token已过期，请重新登录')
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

</template>

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

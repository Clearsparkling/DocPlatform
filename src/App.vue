<script setup lang="ts">
import { RouterView } from 'vue-router';
// 头部组件
import Nav from './components/Nav.vue';
// 底部组件
import Bottom from './components/Bottom.vue';
</script>

<template>
  <div class="background">
    <Nav></Nav>
    
    <RouterView>

    </RouterView>

    <Bottom></Bottom>
  </div>

</template>

<style scoped>
.background {
  width: 100%;
  background-color: #16171D;
  display: flex;
  flex-direction: column;
  align-items: center;
}

</style>

<script setup lang="ts">
import { RouterView } from 'vue-router';
import Home from './components/Home.vue'

</script>

<template>
  <div class="background">
    <nav>
      <div class="centent-box">

        <div class="left">
          <div class="logo"></div>

          <button class="url resetButton">
            相关链接
          </button>
        </div>


        <div class="right">
          <a class="login resetButton" href="/login">
            登录
          </a>
        </div>
      </div>

    </nav>
    <RouterView>

    </RouterView>
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



nav {
  width: 100%;
  display: flex;
  justify-content: center;
}

nav .centent-box {
  width: min(95%, 1440px);
  height: 80px;
  border: 1px solid #3B3440;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

nav .resetButton {
  height: 40px;
  width: 100px;
  display: flex;
  justify-content: center;
  align-items: center;
  border: none;
  background-color: rgba(0, 0, 0, 0);
  color: white;
  font-size: 16px;
  transition: all 0.3s ease;
}

nav .resetButton:hover {
  color: rgb(179, 154, 255);
}
</style>

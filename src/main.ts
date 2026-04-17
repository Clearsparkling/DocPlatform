// 重置样式表
import "./assets/reset.css"

// ElementUI
import ElementPlus from "element-plus"
import 'element-plus/dist/index.css'

import { createApp } from 'vue'
// Pinia+Pinia持久化存储
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

import App from './App.vue'
import router from './router'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(ElementPlus)

app.mount('#app')

import { defineStore } from "pinia";
import { ref } from "vue";

export const useUserStore = defineStore('userStore', () => {
    const userToken = ref()
    const userUsername = ref()

    return { userToken, userUsername }

}, {
    persist: {
        // 存储位置
        storage: localStorage,
        // 需要持久化存储的变量
        pick: ['userToken','userUsername'],
    }
})
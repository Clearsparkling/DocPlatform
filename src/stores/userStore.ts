import { defineStore } from "pinia";

export const useUserStore = defineStore('userStore', {
    state: () => ({
        userToken: '' as string,
        userUsername: '' as string,
        compileDocId: null as number | null,
    }),
    persist: {
        storage: localStorage,
    }
})

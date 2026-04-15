import axios from "axios";
import { useUserStore } from "@/stores/userStore";

const request = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
})

// 请求拦截器 登录后所有的请求都将token作为请求头发送到后端
request.interceptors.request.use(
    (config) => {
        const { userToken } = useUserStore()
        if (userToken) {
            config.headers.Authorization = `Bearer ${userToken}`
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

export default request
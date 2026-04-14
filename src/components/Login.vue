<script lang='ts' setup name='Login'>
import { ref } from 'vue'
import router from '@/router'
import request from '@/utils/request'



// 注册登录遮罩切换方法
const toRegester = () => {
    const shadeDom = document.querySelector(".shade") as HTMLElement
    shadeDom.style.right = "0%"
}
const toLogin = () => {
    const shadeDom = document.querySelector(".shade") as HTMLElement
    shadeDom.style.right = "40%"
}

// 注册
const registerAccount = ref()
const registerPassword = ref()
const registerAgainPassword = ref()

const register = () => {
    if (!registerAccount.value) {
        alert("请输入要创建的账户名")
    } else if (!(registerPassword.value == registerAgainPassword.value)) {
        alert("两次输入的密码不同")
    } else {
        request.post("/auth/register", {
            username: registerAccount.value,
            password: registerPassword.value
        }).then(res => {
            console.log(res)
            const { accessToken } = res.data
            localStorage.setItem("token", accessToken)
            router.push("/")
        })
    }
}


// 登录
const loginAccount = ref()
const loginPassword = ref()

const login = () => {
    if (!loginAccount.value) {
        alert("请输入您的账户")
    } else if (!loginPassword.value) {
        alert("请输入您的密码")
    } else {
        request.post("/auth/login", {
            username: loginAccount.value,
            password: loginPassword.value
        }).then(({ data }) => {
            const { accessToken } = data
            localStorage.setItem("token", accessToken)
            router.push("/")
        }).catch((params) => {
            console.log(params)
        })
    }
}



</script>

<template>
    <div class="and-box">

        <div class="centen-box">
            <div class="shade">
                <div class="galss"></div>
            </div>

            <div class="register">
                <div class="left-flex-box">
                    <span style="font-size: 40px;">注册</span>
                    <div class="input-flex-box">
                        <span>账户</span>
                        <input v-model="registerAccount" type="text" class="input-style">
                        <span>密码</span>
                        <input v-model="registerPassword" type="password" class="input-style">
                        <span>请再次输入密码</span>
                        <input v-model="registerAgainPassword" type="password" class="input-style">
                    </div>
                    <button @click="register()" class="register-button button-style">
                        注册
                    </button>
                    <span>已有账号？</span>
                    <button @click="toLogin()" class="to-login button-style">
                        去登录
                    </button>
                </div>
            </div>

            <div class="login">
                <div class="left-flex-box">

                    <span style="font-size: 40px;">登录</span>
                    <div class="input-flex-box">
                        <span>账户</span>
                        <input v-model="loginAccount" type="text" class="input-style">
                        <span>密码</span>
                        <input v-model="loginPassword" type="password" class="input-style">
                    </div>
                    <button @click="login()" class="login-button button-style">
                        登录
                    </button>
                    <span>还没有账号？</span>
                    <button @click="toRegester()" class="to-register button-style">
                        去注册
                    </button>
                </div>
            </div>

        </div>
    </div>
</template>

<style scoped>
.and-box {
    width: min(95%, 1440px);
    height: 90vh;
    border: 1px solid #3B3440;
    display: flex;
    justify-content: center;
    align-items: center;
}

.shade {
    height: 100%;
    width: 60%;
    border-radius: 20px;
    background: no-repeat;
    background-image: url(../svg/background.png);
    background-size: cover;
    position: absolute;
    z-index: 999;
    right: 40%;
    transition: all 500ms ease;
}

.galss {
    height: 100%;
    width: 100%;
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(5px);
}

.centen-box {
    width: 80%;
    height: 80%;
    border-radius: 20px;
    background: rgba(137, 90, 246);
    backdrop-filter: blur(10px);
    display: flex;
    justify-content: space-between;
    position: relative;
}

/* button通用样式 */
.button-style {
    height: 40px;
    width: 100%;
    border-radius: 5px;
    border: 2px solid;
    background-color: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
}

/* input通用样式 */
.input-style {
    height: 40px;
    width: 100%;
    border-radius: 10px;
    border: none;
}

.input-style:focus {
    outline: none;
}


/* 登录卡片 */
.login,
.register {
    height: 100%;
    width: 40%;
    color: white;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 20px;
}

.left-flex-box {
    width: 70%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: start;
    gap: 30px;
    flex-direction: column;
}

.input-flex-box {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 5px;
}
</style>
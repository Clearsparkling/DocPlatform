<script lang='ts' setup name='Nav'>
import router from '@/router';
import { useUserStore } from '@/stores/userStore';
import { storeToRefs } from 'pinia';
import { computed } from 'vue';

import { ElNotification } from 'element-plus';
const successAlter = (title: string, messgae: string) => {
    ElNotification({
        title: title,
        message: messgae,
        type: 'success'
    })
}

const { userToken, userUsername } = storeToRefs(useUserStore())

const gitTest = (value:string) => {
    return value
}

// 相关链接数组
const aboutUrl = [
    {
        name: "MarkItDown",
        url: "https://github.com/microsoft/markitdown"
    },
    {
        name: "Markdown-it",
        url: "https://github.com/markdown-it/markdown-it"
    },
    {
        name: "Github-Markdown-css",
        url: "https://github.com/sindresorhus/github-markdown-css"
    },
    {
        name: "md-editor",
        url:"https://github.com/imzbf/md-editor-v3"
    }
]

// 退出登录
const logOut = () => {
    userToken.value = ''
    userUsername.value = ''
    successAlter('退出登录成功','')
    router.push("/login")
}

// 登录导航条逻辑
// false 未登录
// true 已登录
const loginType = computed(() => {
	return !!userToken.value
})


</script>

<template>
    <nav>
        <div class="centent-box">

            <div class="left">
                <div class="logo">
                    <RouterLink to="/">
                    <img src="../svg/DocLogo.png" alt="">
                    </RouterLink>
                </div>
                <div class="drop-down">
                    <button class="url resetButton">
                        相关链接
                    </button>
                    <ul class="about-url-box">
                        <div class="margin-box">
                            <a v-for="(value, index) in aboutUrl" :key="index" :href="value.url">
                                <li>{{ value.name }}</li>
                            </a>
                        </div>
                    </ul>
                </div>
            </div>


            <div class="right">
                <RouterLink to="/login" v-if="!loginType" class="login resetButton">
                    登录
                </RouterLink>
                <RouterLink :to="`/${userUsername}`" v-if="loginType" class="resetButton">{{ userUsername }}</RouterLink>
                <div @click="logOut" v-if="loginType" class="resetButton">
                    退出登录
                </div>
            </div>
        </div>

    </nav>

</template>

<style scoped>
nav {
    width: 100%;
    display: flex;
    justify-content: center;
}

nav .left{
    display: flex;
}

nav .logo{
    width: 100px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
}

nav .logo img{
    height: 40px;
}

nav .right {
    display: flex;
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
    height: 80px;
    width: 100px;
    display: flex;
    justify-content: center;
    align-items: center;
    border: none;
    background-color: rgba(0, 0, 0, 0);
    color: white;
    font-size: 16px;
    transition: all 0.3s ease;
    cursor: pointer;
}

nav .resetButton:hover {
    color: rgb(179, 154, 255);
}

/* 下拉框盒 */
.drop-down {
    position: relative;
}

.about-url-box {
    position: absolute;
    background-color: #16171D;
    border: 1px solid #3B3440;
    border-radius: 5px;
    top: 70px;
    display: none;
    z-index: 999;
}

.margin-box {
    margin: 10px;
}

.about-url-box a {
    display: block;
    height: 35px;
    width: 90px;
    padding-left: 10px;
    display: flex;
    justify-content: left;
    align-items: center;
    font-size: 13px;
    border-radius: 5px;
    color: white;
    transition: all 0.3s ease;
}

.about-url-box a:hover {
    background-color: #1E2129;
    color: rgb(179, 154, 255);
}

.url:hover+.about-url-box,
.about-url-box:hover {
    display: block;
}
</style>
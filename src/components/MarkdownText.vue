<script lang='ts' setup name='MarkdownText'>
// markdown解析及样式
import markdownit from 'markdown-it'
import 'github-markdown-css/github-markdown-dark.css'
import request from '@/utils/request';
import { onMounted, ref } from 'vue';



// markdown-it
const md = markdownit()
const result = ref()

// markdown列表Active的选项
const activeList = ref()

// 加载
const isLoading = ref(true)


// get user markdown list
interface User {
    id: number;
    username: string;
    password: string;
    createdAt: string;
    updatedAt: string | null;
}
interface UserList {
    // 是否转换
    converted: boolean;

    createdAt: string;
    filePath: string;
    fileSize: number;
    fileType: string;
    id: number;
    mdContent: string | null;
    originalName: string;
    title: string;
    updatedAt: string | null;
    user: User;
}

const userMarkdownList = ref<UserList[]>([])


// 渲染列表选中的md文档
const getDocumentById = (mdContent: string) => {
    const markdownText = ref(mdContent)
    result.value = md.render(markdownText.value)
}


onMounted(async () => {
    await request.get("/documents").then((res) => {
        // 获取笔记列表
        userMarkdownList.value = res.data.data.documents
        // 获取首篇笔记
        result.value = md.render(res.data.data.documents[0].mdContent)
    }).catch((params) => {
        console.log(params)
    })
})

</script>

<template>
    <div class="border-box">

        <div class="manage-box">
            <div class="upload icom-box">
                <svg t="1776407378790" class="icon" viewBox="0 0 1024 1024" version="1.1"
                    xmlns="http://www.w3.org/2000/svg" p-id="4821" width="30" height="30">
                    <path
                        d="M857.6 956.8H166.4c-54.4 0-102.4-48-102.4-105.6v-182.4c0-19.2 12.8-32 32-32s32 12.8 32 32v182.4c0 22.4 16 41.6 38.4 41.6h694.4c19.2 0 38.4-19.2 38.4-41.6v-182.4c0-19.2 12.8-32 32-32s32 12.8 32 32v182.4c-3.2 57.6-48 105.6-105.6 105.6z"
                        fill="white" p-id="4822"></path>
                    <path
                        d="M512 764.8c-19.2 0-32-12.8-32-32v-640c0-19.2 12.8-32 32-32s32 12.8 32 32v640c0 19.2-12.8 32-32 32z"
                        fill="white" p-id="4823"></path>
                    <path
                        d="M720 326.4c-9.6 0-16-3.2-22.4-9.6L512 131.2l-185.6 185.6c-12.8 12.8-32 12.8-44.8 0s-12.8-32 0-44.8L489.6 64c12.8-12.8 32-12.8 44.8 0l208 208c12.8 12.8 12.8 32 0 44.8-6.4 6.4-12.8 9.6-22.4 9.6z"
                        fill="white" p-id="4824"></path>
                </svg>
            </div>

            <div class="compile icom-box">
                <svg t="1776408444924" class="icon" viewBox="0 0 1024 1024" version="1.1"
                    xmlns="http://www.w3.org/2000/svg" p-id="6255" width="33" height="33">
                    <path
                        d="M526.41 117.029v58.514a7.314 7.314 0 0 1-7.315 7.314H219.429a36.571 36.571 0 0 0-35.987 29.989l-0.585 6.583V804.57a36.571 36.571 0 0 0 29.989 35.987l6.583 0.585H804.57a36.571 36.571 0 0 0 35.987-29.989l0.585-6.583v-317.44a7.314 7.314 0 0 1 7.314-7.314h58.514a7.314 7.314 0 0 1 7.315 7.314v317.44a109.714 109.714 0 0 1-99.182 109.203l-10.533 0.512H219.43a109.714 109.714 0 0 1-109.203-99.182l-0.512-10.533V219.43a109.714 109.714 0 0 1 99.182-109.203l10.533-0.512h299.666a7.314 7.314 0 0 1 7.314 7.315z m307.345 31.817l41.4 41.399a7.314 7.314 0 0 1 0 10.313L419.985 655.726a7.314 7.314 0 0 1-10.313 0l-41.399-41.4a7.314 7.314 0 0 1 0-10.312l455.168-455.168a7.314 7.314 0 0 1 10.313 0z"
                        p-id="6256"></path>
                </svg>
            </div>
        </div>

        <div class="md-list">
            <ul>
                <li @click="getDocumentById(value.mdContent as string); activeList = index"
                    v-for="(value, index) in userMarkdownList" class="markdown-list"
                    :class="{ 'list-active': activeList === index }">
                    {{ value.originalName }}
                </li>
            </ul>
        </div>

        <div v-html="result" class="markdown-body">

        </div>
    </div>
</template>

<style scoped>
.border-box {
    width: min(95%, 1440px);
    display: flex;
    justify-content: right;
    border: 1px solid #3B3440;
}

.manage-box {
    width: 50px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    border-right: 1px solid #3B3440;
}

.icom-box {
    height: 50px;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    transition: all 500ms;
}

path {
    fill: white;
    transition: all 500ms;
}

.icom-box:hover path,
.icom-box:hover {
    fill: #747bff;
    background-color: #0c0c0f;
    border-radius: 5px;
}

.md-list {
    flex: 1;
    display: flex;
    flex-direction: column;
    color: azure;
    border-right: 1px solid #3B3440;
    padding: 10px;
}

.markdown-list {
    display: flex;
    align-items: center;
    line-height: 27px;
    min-height: 40px;
    min-width: 160px;
    border-radius: 5px;
    cursor: pointer;
    transition: all 500ms;
    padding: 2px 10px;
}

.markdown-list:hover {
    background-color: #0c0c0f;
    color: #747bff;
}

.list-active {
    color: #747bff;
}

@media (max-width: 767px) {
    .md-list ,
    .manage-box{
        display: none;
    }

    .markdown-body {
        flex: 1;
    }

}

/* Github markdown css */
.markdown-body {
    box-sizing: border-box;
    min-width: 200px;
    max-width: 980px;
    padding: 45px;
}

@media (max-width: 767px) {
    .markdown-body {
        padding: 15px;
    }
}

@media (prefers-color-scheme: dark) {
    body {
        background-color: #0d1117;
    }
}

/* Github markdown css fix */

@media (min-width: 767px) {
    .markdown-body {
        flex: 10;
    }
}
</style>
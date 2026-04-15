<script lang='ts' setup name='MarkdownText'>
// markdown解析及样式
import markdownit from 'markdown-it'
import 'github-markdown-css/github-markdown-dark.css'

import request from '@/utils/request';

import axiostwo from "../svg/Axios二次封装.md?raw"
import { onMounted, ref } from 'vue';
const md = markdownit()
const markdownText = ref(axiostwo)

const result = md.render(markdownText.value);

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

const getDocumentById = async (id: number) => {
    await request.get(`/documents/${id}`, {

    }).then((res) => {
        console.log(res.data)
    })
}


onMounted(async () => {
    await request.get("/documents").then((res) => {
        userMarkdownList.value = res.data.data
        console.log(userMarkdownList.value)
    }).catch((params) => {
        console.log(params)
    })
})

</script>

<template>
    <div class="border-box">
        <div class="md-list">
            <ul>
                <li @click="getDocumentById(value.id)" v-for="(value, index) in userMarkdownList" class="markdown-list">
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

.md-list{
    flex: 1;
    display: flex;
    flex-direction: column;
    color: azure;
}

.markdown-list{
    flex: 1;
    display: flex;
    align-items: center;
    height: 30px;
    width: 100%;
    min-width: 160px;
    background-color: aqua;
    border-radius: 10px;
    text-indent: 1em;
    cursor: pointer;
    border-right: 1px solid #3B3440;
}

@media (max-width: 767px) {
    .md-list {
           display: none;
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
</style>
<script lang='ts' setup name='MarkdownText'>
// markdown解析及样式
import markdownit from 'markdown-it'
import 'github-markdown-css/github-markdown-dark.css'
import request from '@/utils/request';
import { onMounted, ref } from 'vue';
import { useUserStore } from '@/stores/userStore';
import router from '@/router';


const activeDocId = ref()

// markdown-it
const md = markdownit()
const result = ref()

// markdown列表Active的选项
const activeList = ref(0)

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

// 获取笔记列表&获取首篇笔记
const getDocList = async () => {
    await request.get("/documents").then((res) => {
        // 获取笔记列表
        userMarkdownList.value = res.data.data
        // 获取首篇笔记
        result.value = md.render(res.data.data[0].mdContent)
        activeDocId.value = res.data.data[0].id
    }).catch((params) => {
        console.log(params)
    })
}


onMounted(() => {
    getDocList()
})

//
const toCompileById = () => {
    const userStore = useUserStore()
    userStore.compileDocId = activeDocId.value
    router.push('/compile')
}

// 删除
const deleteDocById = async () => {
    await request.delete(`/documents/${activeDocId.value}`).then((res) => {
        deleteSucceed()
        getDocList()
    })
}


// 删除提示框
import { ElMessageBox } from 'element-plus'
import { ElNotification } from 'element-plus'

const dialogVisible = ref(false)

const handleClose = (done: () => void) => {
    ElMessageBox.confirm('Are you sure to close this dialog?')
        .then(() => {
            done()
        })
        .catch(() => {

        })
}

// Alter
const deleteSucceed = () => {
    ElNotification({
        title: '提示',
        message: '删除成功',
        type: 'success',
    })
}
const downloadSucceed = () => {
    ElNotification({
        title: '提示',
        message: '下载成功',
        type: 'success'
    })
}


// 下载

const activeDocInfo = ref<UserList>()


// 此方法为获取mdContent的字符串自行包装成markdown文件进行下载
const downloadDoc = async () => {
    await request.get(`/documents/${activeDocId.value}`).then((res) => {
        downloadSucceed()
        const { mdContent, title } = res.data.data
        downloadMarkdown(mdContent, title)
    })
}

/*
此下载方法为后端提供的接口
时间不够 后端没提供文件名所以下载的文件缺个文件名
*/
// const downloadDoc = async () => {
//     await request.get(`/documents/${activeDocId.value}/download`).then((res) => {
//         console.log(res.data)
//         const blob = new Blob([res.data], { type: 'text/markdown;chars:utf-8' })
//         const link = document.createElement('a')
//         link.href = URL.createObjectURL(blob)
//         link.download = 'text.md'
//         link.click()
//     })
// }

// 字符串包装成md并下载
const downloadMarkdown = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/markdown;chars:utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}.md`
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    downloadSucceed()
}


</script>

<template>

    <!-- 提示框 -->
    <el-dialog v-model="dialogVisible" title="Tips" width="500" :before-close="handleClose">
        <span>确认要删除该文档吗？</span>
        <template #footer>
            <div class="dialog-footer">
                <el-button @click="dialogVisible = false">取消</el-button>
                <el-button type="primary" @click="dialogVisible = false; deleteDocById()">
                    确定
                </el-button>
            </div>
        </template>
    </el-dialog>

    <div class="border-box">

        <div class="manage-box">
            <RouterLink to="/upload">
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
            </RouterLink>

            <a @click="toCompileById">
                <div class="compile icom-box">
                    <svg t="1776408444924" class="icon" viewBox="0 0 1024 1024" version="1.1"
                        xmlns="http://www.w3.org/2000/svg" p-id="6255" width="32" height="32">
                        <path
                            d="M526.41 117.029v58.514a7.314 7.314 0 0 1-7.315 7.314H219.429a36.571 36.571 0 0 0-35.987 29.989l-0.585 6.583V804.57a36.571 36.571 0 0 0 29.989 35.987l6.583 0.585H804.57a36.571 36.571 0 0 0 35.987-29.989l0.585-6.583v-317.44a7.314 7.314 0 0 1 7.314-7.314h58.514a7.314 7.314 0 0 1 7.315 7.314v317.44a109.714 109.714 0 0 1-99.182 109.203l-10.533 0.512H219.43a109.714 109.714 0 0 1-109.203-99.182l-0.512-10.533V219.43a109.714 109.714 0 0 1 99.182-109.203l10.533-0.512h299.666a7.314 7.314 0 0 1 7.314 7.315z m307.345 31.817l41.4 41.399a7.314 7.314 0 0 1 0 10.313L419.985 655.726a7.314 7.314 0 0 1-10.313 0l-41.399-41.4a7.314 7.314 0 0 1 0-10.312l455.168-455.168a7.314 7.314 0 0 1 10.313 0z"
                            p-id="6256"></path>
                    </svg>
                </div>
            </a>

            <a @click="dialogVisible = true">
                <div class="delete icom-box">
                    <svg t="1776409868918" class="icon" viewBox="0 0 1024 1024" version="1.1"
                        xmlns="http://www.w3.org/2000/svg" p-id="7422" width="28" height="28">
                        <path
                            d="M790.24 281.76l1.248 604.192c0 31.712-13.088 48.672-44.896 48.672l-461.504-1.28c-31.776 0-45.792-14.496-45.792-46.144l0-605.44-71.52 0 0 605.728c0 63.552 51.712 115.2 115.232 115.2l460.8 0c63.552 0 115.232-51.68 115.232-115.2l0-605.728-68.864 0zM335.744 411.392l0 428.928c0 2.784 0.416 5.472 1.12 8.032 21.088 0 42.208-0.032 63.328-0.192 0.672-2.464 1.088-5.152 1.088-7.84l0-428.736c-21.856-0.096-43.68-0.16-65.536-0.192l0 0zM624.992 412.928l0 427.424c0 2.208 0.256 4.384 0.704 6.496 21.344-0.128 42.72-0.16 64.032-0.224 0.448-2.048 0.672-4.096 0.672-6.336l0-427.168c-21.792-0.032-43.616-0.096-65.408-0.192l0 0zM978.912 165.664l-255.904 0 0-72.192c1.12-58.112-46.752-72.128-94.528-72.128l-229.952 0c-59.36 0-93.216 22.304-93.216 70.112l-0.256 74.208-259.968 0 0 70.496 933.792 0 0-70.496 0.032 0zM657.504 165.664l-288.032 0 0-50.496c0-16 11.296-29.92 27.296-29.92l230.432 1.248c16 0 30.08 11.488 30.08 27.488l0.224 51.68zM482.688 412.96l0 427.36c0 2.208 0.256 4.416 0.704 6.496 21.152-0.096 42.304-0.16 63.456-0.16 0.448-2.08 0.672-4.096 0.672-6.336l0-427.168c-21.632-0.032-43.232-0.096-64.864-0.192l0 0z"
                            fill="white" p-id="7423"></path>
                    </svg>
                </div>
            </a>

            <a @click="downloadDoc">
                <div class="download icom-box">
                    <svg t="1776410073880" class="icon" viewBox="0 0 1024 1024" version="1.1"
                        xmlns="http://www.w3.org/2000/svg" p-id="8421" width="34" height="34">
                        <path
                            d="M544.256 605.184l244.224-244.224a31.744 31.744 0 0 1 45.056 45.056l-295.424 295.424a36.864 36.864 0 0 1-51.2 0L190.464 406.528a31.744 31.744 0 1 1 45.056-45.056l244.224 244.224V111.104a32.256 32.256 0 1 1 64 0zM153.6 902.656a32.256 32.256 0 0 1 0-64h716.8a32.256 32.256 0 0 1 0 64z"
                            fill="white" p-id="8422"></path>
                    </svg>
                </div>
            </a>
        </div>

        <div class="md-list">
            <ul>
                <li @click="getDocumentById(value.mdContent as string); activeList = index; activeDocId = value.id; activeDocInfo = value"
                    v-for="(value, index) in userMarkdownList" class="markdown-list"
                    :class="{ 'list-active': activeList === index }">
                    {{ value.title }}
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
    transition: all 100ms;
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

    .md-list,
    .manage-box {
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
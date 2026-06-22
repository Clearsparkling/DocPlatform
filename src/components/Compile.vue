<script lang='ts' setup name='Compile'>
import { onMounted, ref, reactive } from 'vue';
import { MdEditor } from 'md-editor-v3';
import type { Themes } from 'md-editor-v3';
import "md-editor-v3/lib/style.css"
import { useUserStore } from '@/stores/userStore';
import request from '@/utils/request';
import VersionHistory from './VersionHistory.vue';

const userStroe = useUserStore()

const compileText = ref()

export interface DocInfo {
    converted: boolean,
    createdAt: string,
    filePath: string,
    fileSize: number,
    fileType: string,
    id: number,
    mdContent: string,
    originalName: string,
    title: string,
    updatedAt: string
}

const state = reactive<{
    text: string;
    theme: Themes;
}>({
    text: '',
    theme: 'dark',
});

const DocInfo = ref<DocInfo>()

// 版本历史
const showVersionHistory = ref(false)

onMounted(async () => {
    await request.get(`/documents/${userStroe.compileDocId}`).then((res) => {
        DocInfo.value = res.data.data
        compileText.value = res.data.data.mdContent
    })
})

const onSave = async (v: string) => {
    await request.put(`/documents/${userStroe.compileDocId}`, {
        title: DocInfo.value?.title,
        content: v
    }).then(() => {
        saveSucceed()
    })
}


import { ElNotification } from 'element-plus'
const saveSucceed = () => {
    ElNotification({
        title: '提示',
        message: '保存成功',
        type: 'success'
    })
}

// 版本回滚后刷新文档内容
const handleRollback = async () => {
    await request.get(`/documents/${userStroe.compileDocId}`).then((res) => {
        DocInfo.value = res.data.data
        compileText.value = res.data.data.mdContent
    })
}


</script>

<template>
    <div class="centen">
        <div class="editor-toolbar">
            <el-button size="small" @click="showVersionHistory = true">
                <svg t="1776408444924" class="toolbar-icon" viewBox="0 0 1024 1024" version="1.1"
                    xmlns="http://www.w3.org/2000/svg" width="14" height="14">
                    <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z" fill="currentColor"/>
                    <path d="M512 304c-8.8 0-16 7.2-16 16v224c0 8.8 7.2 16 16 16h160c8.8 0 16-7.2 16-16s-7.2-16-16-16H528V320c0-8.8-7.2-16-16-16z" fill="currentColor"/>
                </svg>
                版本历史
            </el-button>
        </div>
        <MdEditor :theme="state.theme" class="mdeditor" @on-save="onSave" v-model="compileText" />

        <!-- 版本历史弹窗 -->
        <VersionHistory
            v-if="DocInfo"
            :document-id="DocInfo.id"
            :visible="showVersionHistory"
            @close="showVersionHistory = false"
            @rollback="handleRollback"
        />
    </div>
</template>

<style scoped>
.centen {
    width: min(95%, 1440px);
}

.editor-toolbar {
    display: flex;
    justify-content: flex-end;
    padding: 8px 0;
}

.editor-toolbar .el-button {
    background: #1a1a2e;
    border-color: #3B3440;
    color: azure;
}

.editor-toolbar .el-button:hover {
    border-color: #747bff;
    color: #747bff;
}

.toolbar-icon {
    margin-right: 4px;
    vertical-align: middle;
}

.toolbar-icon path {
    fill: currentColor;
}

.mdeditor {
    height: 80vh;
}
</style>

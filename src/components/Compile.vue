<script lang='ts' setup name='Compile'>
import { onMounted, ref, reactive } from 'vue';
import { MdEditor } from 'md-editor-v3';
import type { Themes } from 'md-editor-v3';
import "md-editor-v3/lib/style.css"
import { useUserStore } from '@/stores/userStore';
import request from '@/utils/request';

const userStroe = useUserStore()

const compileText = ref()

interface TyepScriptTest {
    name: string,
    age: number,
    token: string
}

interface TyepScriptArrayTest<TypeScriptTest> {
    add: (obj: TypeScriptTest) => void,
    get: () => TypeScriptTest
}


const TypeTest = (value : string):string => {
    return "Test"
}

    


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

onMounted(async () => {
    await request.get(`/documents/${userStroe.compileDocId}`).then((res) => {
        DocInfo.value = res.data.data
        compileText.value = res.data.data.mdContent
        console.log(DocInfo.value)
    })
})

const onSave = async (v: string, h: Promise<string>) => {
    await request.put(`/documents/${userStroe.compileDocId}`, {
        title: DocInfo.value?.title,
        mdContent: v
    }).then((res) => {
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


</script>

<template>
    <div class="centen">
        <MdEditor :theme="state.theme" class="mdeditor" @on-save="onSave" v-model="compileText" />
    </div>
</template>

<style scoped>
.centen {
    width: min(95%, 1440px);
}

.mdeditor {
    height: 80vh;
}
</style>
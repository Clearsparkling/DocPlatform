<script lang='ts' setup name='UpLoad'>
import { UploadFilled } from '@element-plus/icons-vue'
import request from '@/utils/request';

import type { UploadRequestOptions } from 'element-plus';
import { onMounted } from 'vue';


// markdown请求
const toUploadMarkdown = async (param: UploadRequestOptions) => {
    // 校验是否为markdown文件
    const fileType = param.file.name.slice(-3)
    if (fileType === ".md") {
        // file是只读的 所以我们自行创建一个新的file
        const originalFile = param.file;
        const newFile = new File([originalFile], originalFile.name, {
            type: "text/markdown", // 在这里设置你想要的 MIME 类型
            lastModified: originalFile.lastModified // 保持原始修改时间
        });

        // 自行new formdata
        const formdata = new FormData()
        formdata.append("file", newFile)

        await request.post("/documents/upload",formdata).then((res) => {
            console.log(res)
        }).catch((params) => {
            console.log(param)
        })
    }
}

// 其他需转换的文件的请求
const toUploadeatherDoc = async (param: UploadRequestOptions) => {
    const newFile = new File([param.file], param.file.name,{
        
    })

    const formdata = new FormData()
    formdata.append("file", param.file)

    await request.post("/documents/upload",formdata).then((res) => {
        console.log(res.data)
    })
}

onMounted(() => {
})
</script>

<template>
    <div class="centent">
        <div class="pointText MarkDownUpLoad">
            Markdown格式的文件在此处上传
        </div>

        <el-upload class="upload-demo" drag :http-request="toUploadMarkdown" multiple>
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">
                拖到此处上传或 <em>点击上传</em>
            </div>
            <template #tip>
                <div class="el-upload__tip">
                    格式为.md且文件大小小于20Mb
                </div>
            </template>
        </el-upload>

        <div class="pointText eatherDocUpLoad">
            .pdf/.docx/.pptx/.xlsx/.html/.jpg/.png格式的文件在此处上传
        </div>

        <el-upload class="upload-demo" drag :http-request="toUploadeatherDoc" multiple>
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">
                拖到此处上传或 <em>点击上传</em>
            </div>
            <template #tip>
                <div class="el-upload__tip">
                    格式需为上述格式
                </div>
            </template>
        </el-upload>
    </div>
</template>

<style scoped>
.centent {
    height: 100vh;
    width: min(95%, 1440px);
    border: 1px solid #3B3440;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.pointText{
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 25px;
    color: white;
    padding: 20px;
}
</style>
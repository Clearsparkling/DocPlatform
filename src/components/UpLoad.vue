<script lang='ts' setup name='UpLoad'>
import { UploadFilled } from '@element-plus/icons-vue'
import request from '@/utils/request';
import type { UploadRequestOptions } from 'element-plus';
import { ElNotification } from 'element-plus'
const successAlter = (title: string, messgae: string) => {
    ElNotification({
        title: title,
        message: messgae,
        type: 'success'
    })
}
const errorAlter = (title: string, messgae: string) => {
    ElNotification({
        title: title,
        message: messgae,
        type: 'error'
    })
}

const sustainType = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'java', 'py', 'js', 'html', 'css', 'json', 'xml', 'txt', 'jpg', 'jpeg', 'png', 'gif', 'webp']

// markdown请求
const toUpload = async (param: UploadRequestOptions) => {

    const lastIndex = param.file.name.lastIndexOf('.')
    const fileType = lastIndex === -1 ? "" : param.file.name.slice(lastIndex + 1);

    console.log(fileType)

    // 校验是否为markdown文件
    if (fileType == "md") {
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
            successAlter('上传成功', `${res.data.data.title} 已成功上传`)
        }).catch((error) => {
            errorAlter('错误', '上传失败')
        })
    } else if(sustainType.includes(fileType)){
        const formdata = new FormData()
        formdata.append("file", param.file)

        await request.post("/documents/upload", formdata).then((res) => {
            successAlter('上传成功', `${res.data.data.title} 已成功上传并转换为Markdown`)
        }).catch((error) => {
            errorAlter('错误', '上传失败')
        })
    } else {
        errorAlter('错误','上传的文件不支持格式转换')
    }
}


</script>

<template>
    <div class="centent">
        <div class="pointText MarkDownUpLoad">
            Markdown格式的文件在此处上传
        </div>

        <el-upload class="upload-demo" drag :http-request="toUpload" multiple :show-file-list="false">
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">
                拖到此处上传或 <em>点击上传</em>
            </div>
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
    padding: 30px 20px;
    box-sizing: border-box;
    gap: 8px;
}

.pointText {
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 20px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.85);
    padding: 16px 20px;
    background: linear-gradient(135deg, rgba(116, 192, 252, 0.12) 0%, rgba(105, 219, 124, 0.08) 100%);
    border-radius: 12px;
    border: 1px solid rgba(116, 192, 252, 0.15);
    margin: 8px 0;
    transition: all 0.3s ease;
}

.pointText:hover {
    border-color: rgba(116, 192, 252, 0.3);
    background: linear-gradient(135deg, rgba(116, 192, 252, 0.18) 0%, rgba(105, 219, 124, 0.12) 100%);
}

.MarkDownUpLoad {
    background: linear-gradient(135deg, rgba(116, 192, 252, 0.1) 0%, rgba(116, 192, 252, 0.05) 100%);
}

.eatherDocUpLoad {
    background: linear-gradient(135deg, rgba(105, 219, 124, 0.1) 0%, rgba(105, 219, 124, 0.05) 100%);
}

.upload-demo {
    width: 100%;
    margin: 8px 0;
}

.upload-demo :deep(.el-upload-dragger) {
    background-color: rgba(22, 23, 29, 0.6);
    border: 2px dashed rgba(116, 192, 252, 0.35);
    border-radius: 14px;
    padding: 35px 25px;
    transition: all 0.3s ease;
}

.upload-demo :deep(.el-upload-dragger:hover) {
    border-color: #74c0fc;
    background-color: rgba(116, 192, 252, 0.06);
}

.upload-demo :deep(.el-icon--upload) {
    font-size: 42px;
    color: #74c0fc;
    margin-bottom: 12px;
}

.upload-demo :deep(.el-upload__text) {
    font-size: 15px;
    color: rgba(255, 255, 255, 0.75);
}

.upload-demo :deep(.el-upload__text em) {
    color: #74c0fc;
    font-style: normal;
    font-weight: 600;
}

.upload-demo :deep(.el-upload__tip) {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.4);
    margin-top: 10px;
}

@media (max-width: 768px) {
    .centent {
        padding: 20px 12px;
        gap: 4px;
    }

    .pointText {
        font-size: 16px;
        padding: 12px 16px;
    }

    .upload-demo :deep(.el-upload-dragger) {
        padding: 25px 15px;
    }

    .upload-demo :deep(.el-icon--upload) {
        font-size: 32px;
    }

    .upload-demo :deep(.el-upload__text) {
        font-size: 14px;
    }
}
</style>
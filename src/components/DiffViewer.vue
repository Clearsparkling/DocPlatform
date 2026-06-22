<script lang='ts' setup name='DiffViewer'>
import { ref, watch, onMounted } from 'vue'
import { html as diff2html } from 'diff2html'
import 'diff2html/bundles/css/diff2html.min.css'

const props = defineProps<{
    diffPatch: string | null
}>()

const diffHtml = ref('')
const viewMode = ref<'side-by-side' | 'line-by-line'>('line-by-line')

const renderDiff = () => {
    if (!props.diffPatch) {
        diffHtml.value = '<p class="no-diff">暂无差异信息</p>'
        return
    }

    // createPatch 已生成完整的 unified diff（含 --- / +++ 头），直接使用
    diffHtml.value = diff2html(props.diffPatch, {
        drawFileList: false,
        matching: 'lines',
        outputFormat: viewMode.value
    })
}

watch(() => props.diffPatch, renderDiff)
watch(viewMode, renderDiff)

onMounted(renderDiff)
</script>

<template>
    <div class="diff-viewer">
        <div class="diff-toolbar">
            <el-radio-group v-model="viewMode" size="small">
                <el-radio-button value="line-by-line">行内视图</el-radio-button>
                <el-radio-button value="side-by-side">并排视图</el-radio-button>
            </el-radio-group>
        </div>
        <div class="diff-content" v-html="diffHtml"></div>
    </div>
</template>

<style scoped>
.diff-viewer {
    width: 100%;
}

.diff-toolbar {
    margin-bottom: 12px;
    display: flex;
    justify-content: flex-end;
}

.diff-content {
    border: 1px solid #3B3440;
    border-radius: 6px;
    overflow: auto;
    max-height: 60vh;
}

.diff-content :deep(.d2h-wrapper) {
    font-size: 13px;
}

.diff-content :deep(.d2h-file-header) {
    display: none;
}

.no-diff {
    text-align: center;
    color: #888;
    padding: 40px;
}
</style>

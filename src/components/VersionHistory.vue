<script lang='ts' setup name='VersionHistory'>
import { ref, onMounted, watch } from 'vue'
import request from '@/utils/request'
import { ElMessageBox, ElNotification } from 'element-plus'
import DiffViewer from './DiffViewer.vue'

interface VersionTag {
    id: number
    versionId: number
    tagName: string
    createdAt: string
}

interface VersionItem {
    id: number
    documentId: number
    userId: number
    content: string
    commitMessage: string | null
    diffPatch: string | null
    versionNum: number
    createdAt: string
    tags?: VersionTag[]
}

const props = defineProps<{
    documentId: number
    visible: boolean
}>()

const emit = defineEmits<{
    (e: 'close'): void
    (e: 'rollback'): void
}>()

const versions = ref<VersionItem[]>([])
const selectedVersion = ref<VersionItem | null>(null)
const diffPatch = ref<string | null>(null)
const loading = ref(false)
const compareMode = ref(false)
const compareVersions = ref<{ v1: number | null; v2: number | null }>({ v1: null, v2: null })
const compareDiffPatch = ref<string | null>(null)

// 加载版本列表
const loadVersions = async () => {
    loading.value = true
    try {
        const res = await request.get(`/documents/${props.documentId}/versions`)
        if (res.data.success) {
            versions.value = res.data.data.versions
        }
    } catch (e) {
        console.error('加载版本列表失败', e)
    } finally {
        loading.value = false
    }
}

// 选中版本，加载 diff
const selectVersion = async (version: VersionItem) => {
    selectedVersion.value = version

    if (compareMode.value) {
        // 对比模式：选择两个版本
        if (!compareVersions.value.v1) {
            compareVersions.value.v1 = version.id
        } else if (!compareVersions.value.v2) {
            compareVersions.value.v2 = version.id
            // 加载对比 diff
            await loadCompareDiff()
        } else {
            // 重置选择
            compareVersions.value.v1 = version.id
            compareVersions.value.v2 = null
            compareDiffPatch.value = null
        }
        return
    }

    // 普通模式：加载单版本 diff
    try {
        const res = await request.get(`/documents/${props.documentId}/versions/${version.id}/diff`)
        if (res.data.success) {
            diffPatch.value = res.data.data.diffPatch
        }
    } catch (e) {
        console.error('加载版本 diff 失败', e)
    }
}

// 加载对比 diff
const loadCompareDiff = async () => {
    if (!compareVersions.value.v1 || !compareVersions.value.v2) return

    try {
        const res = await request.get(
            `/documents/${props.documentId}/versions/compare?v1=${compareVersions.value.v1}&v2=${compareVersions.value.v2}`
        )
        if (res.data.success) {
            compareDiffPatch.value = res.data.data.diffPatch
        }
    } catch (e) {
        console.error('对比版本失败', e)
    }
}

// 回滚到指定版本
const handleRollback = async (version: VersionItem) => {
    try {
        await ElMessageBox.confirm(
            `确定要回滚到版本 #${version.versionNum} 吗？此操作将创建一个新版本。`,
            '回滚确认',
            { confirmButtonText: '确定回滚', cancelButtonText: '取消', type: 'warning' }
        )

        const res = await request.post(`/documents/${props.documentId}/versions/${version.id}/rollback`)
        if (res.data.success) {
            ElNotification({ title: '提示', message: '回滚成功', type: 'success' })
            emit('rollback')
            await loadVersions()
        }
    } catch (e: any) {
        if (e !== 'cancel') {
            console.error('回滚失败', e)
            ElNotification({ title: '错误', message: '回滚失败', type: 'error' })
        }
    }
}

// 添加标签
const handleAddTag = async (version: VersionItem) => {
    try {
        const { value } = await ElMessageBox.prompt('请输入标签名称', '添加标签', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            inputPlaceholder: '如：v1.0、初始版本',
            inputValidator: (val) => val.trim() ? true : '标签名称不能为空'
        })

        const res = await request.post(`/documents/${props.documentId}/versions/${version.id}/tag`, {
            tagName: value.trim()
        })

        if (res.data.success) {
            ElNotification({ title: '提示', message: '标签添加成功', type: 'success' })
            await loadVersions()
        }
    } catch (e: any) {
        if (e !== 'cancel') {
            console.error('添加标签失败', e)
        }
    }
}

// 查看完整内容
const viewFullContent = (version: VersionItem) => {
    selectedVersion.value = version
    diffPatch.value = null
}

// 切换对比模式
const toggleCompareMode = () => {
    compareMode.value = !compareMode.value
    compareVersions.value = { v1: null, v2: null }
    compareDiffPatch.value = null
}

// 格式化时间
const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN')
}

watch(() => props.visible, (val) => {
    if (val) loadVersions()
})

onMounted(() => {
    if (props.visible) loadVersions()
})
</script>

<template>
    <el-dialog
        :model-value="visible"
        title="版本历史"
        width="85%"
        @close="emit('close')"
        class="version-history-dialog"
    >
        <div class="version-history">
            <!-- 左侧版本列表 -->
            <div class="version-list">
                <div class="version-list-header">
                    <span>版本记录</span>
                    <el-button size="small" :type="compareMode ? 'primary' : 'default'" @click="toggleCompareMode">
                        {{ compareMode ? '退出对比' : '版本对比' }}
                    </el-button>
                </div>

                <div v-if="compareMode" class="compare-hint">
                    <span v-if="!compareVersions.v1">请点击选择第一个版本</span>
                    <span v-else-if="!compareVersions.v2">请点击选择第二个版本</span>
                    <span v-else>已选择版本 #{{ versions.find(v => v.id === compareVersions.v1)?.versionNum }} 和 #{{ versions.find(v => v.id === compareVersions.v2)?.versionNum }}</span>
                </div>

                <el-scrollbar height="500px">
                    <el-timeline>
                        <el-timeline-item
                            v-for="version in versions"
                            :key="version.id"
                            :timestamp="formatTime(version.createdAt)"
                            placement="top"
                            :class="{
                                'timeline-active': selectedVersion?.id === version.id,
                                'compare-selected': version.id === compareVersions.v1 || version.id === compareVersions.v2
                            }"
                        >
                            <div class="version-item" @click="selectVersion(version)">
                                <div class="version-header">
                                    <span class="version-num">#{{ version.versionNum }}</span>
                                    <div class="version-tags">
                                        <el-tag
                                            v-for="tag in version.tags"
                                            :key="tag.id"
                                            size="small"
                                            type="success"
                                        >
                                            {{ tag.tagName }}
                                        </el-tag>
                                    </div>
                                </div>
                                <div class="version-message">
                                    {{ version.commitMessage || '无说明' }}
                                </div>
                                <div class="version-actions">
                                    <el-button size="small" text @click.stop="viewFullContent(version)">
                                        查看
                                    </el-button>
                                    <el-button size="small" text @click.stop="handleAddTag(version)">
                                        打标签
                                    </el-button>
                                    <el-button
                                        size="small"
                                        text
                                        type="warning"
                                        @click.stop="handleRollback(version)"
                                    >
                                        回滚
                                    </el-button>
                                </div>
                            </div>
                        </el-timeline-item>
                    </el-timeline>
                </el-scrollbar>
            </div>

            <!-- 右侧 diff 展示 -->
            <div class="version-detail">
                <div v-if="!selectedVersion" class="detail-placeholder">
                    <el-empty description="请选择一个版本查看" />
                </div>
                <div v-else-if="compareMode && compareDiffPatch" class="detail-content">
                    <h4>版本对比结果</h4>
                    <DiffViewer :diff-patch="compareDiffPatch" />
                </div>
                <div v-else-if="!compareMode && diffPatch" class="detail-content">
                    <h4>与上一版本的差异</h4>
                    <DiffViewer :diff-patch="diffPatch" />
                </div>
                <div v-else-if="selectedVersion && !compareMode" class="detail-content">
                    <h4>版本 #{{ selectedVersion.versionNum }} 完整内容</h4>
                    <el-scrollbar height="450px">
                        <pre class="full-content">{{ selectedVersion.content }}</pre>
                    </el-scrollbar>
                </div>
                <div v-else-if="compareMode && !compareDiffPatch" class="detail-placeholder">
                    <el-empty description="请选择两个版本进行对比" />
                </div>
            </div>
        </div>
    </el-dialog>
</template>

<style scoped>
.version-history {
    display: flex;
    gap: 20px;
    min-height: 500px;
}

.version-list {
    width: 320px;
    min-width: 320px;
    border-right: 1px solid #3B3440;
    padding-right: 16px;
}

.version-list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    font-weight: 600;
    font-size: 15px;
}

.compare-hint {
    background: #747bff22;
    color: #747bff;
    padding: 6px 10px;
    border-radius: 4px;
    font-size: 12px;
    margin-bottom: 12px;
}

.version-item {
    cursor: pointer;
    padding: 8px;
    border-radius: 6px;
    transition: background 200ms;
}

.version-item:hover {
    background: #ffffff0a;
}

.timeline-active .version-item {
    background: #747bff1a;
}

.compare-selected :deep(.el-timeline-item__wrapper) {
    border-left: 3px solid #747bff;
    padding-left: 8px;
}

.version-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
}

.version-num {
    font-weight: 600;
    color: #747bff;
    font-size: 14px;
}

.version-tags {
    display: flex;
    gap: 4px;
}

.version-message {
    font-size: 13px;
    color: #aaa;
    margin-bottom: 8px;
    line-height: 1.4;
}

.version-actions {
    display: flex;
    gap: 4px;
}

.version-detail {
    flex: 1;
    overflow: hidden;
}

.detail-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
}

.detail-content h4 {
    margin: 0 0 12px;
    font-size: 14px;
    color: #ccc;
}

.full-content {
    font-family: 'Courier New', monospace;
    font-size: 13px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-all;
    padding: 16px;
    background: #0d1117;
    border-radius: 6px;
    border: 1px solid #3B3440;
    color: #e6e6e6;
}
</style>

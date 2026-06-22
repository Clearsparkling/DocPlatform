<script lang='ts' setup name='SearchResults'>
interface SearchResultItem {
    id: number
    title: string
    filename: string
    originalType: string
    createdAt: string
    snippet: string
}

const props = defineProps<{
    results: SearchResultItem[]
    activeDocId?: number
}>()

const emit = defineEmits<{
    (e: 'select', docId: number): void
}>()

const handleClick = (docId: number) => {
    emit('select', docId)
}
</script>

<template>
    <div class="search-results">
        <div
            v-for="item in results"
            :key="item.id"
            class="search-result-item"
            :class="{ 'result-active': activeDocId === item.id }"
            @click="handleClick(item.id)"
        >
            <div class="result-title">
                <span class="file-type-tag">{{ item.originalType || 'md' }}</span>
                {{ item.title }}
            </div>
            <div class="result-snippet" v-html="item.snippet"></div>
        </div>
    </div>
</template>

<style scoped>
.search-results {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.search-result-item {
    padding: 8px 10px;
    border-radius: 5px;
    cursor: pointer;
    transition: all 300ms;
}

.search-result-item:hover {
    background-color: #0c0c0f;
    color: #747bff;
}

.result-active {
    color: #747bff;
    background-color: #0c0c0f;
}

.result-title {
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 6px;
}

.file-type-tag {
    font-size: 10px;
    padding: 1px 4px;
    border-radius: 3px;
    background-color: #3B3440;
    color: #aaa;
    text-transform: uppercase;
}

.result-snippet {
    font-size: 12px;
    color: #888;
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
}

.result-snippet :deep(mark) {
    background-color: #747bff33;
    color: #747bff;
    padding: 0 2px;
    border-radius: 2px;
}
</style>

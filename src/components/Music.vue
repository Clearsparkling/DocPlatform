<script lang='ts' setup name='Music'>
import { computed, onMounted, ref, useTemplateRef } from "vue"
import music_ljj from "../svg/林俊杰 - 达尔文 (Live).mp3"
import data from "@/utils/data"

interface lrc {
    time: number,
    lyrics: string
}

// 将数据按行切片后，将值存放到数组对象内
const parseLRC = (): Array<lrc> => {
    const LRCList: Array<string> = data.split("[")
    let result: Array<lrc> = []
    LRCList.forEach(element => {
        let timeStr = element.split("]")[0] ?? '0'
        let time = parseTime(timeStr)
        let lyrics = element.split("]")[1]?.trimEnd() ?? ''
        if (time !== null) {
            result.push({ time, lyrics })
        }
    })
    return result
}

/**
 * 将数据中的分时转换为秒
 * @param timeStr 时间字符串 00:00.00
 * @returns 
 */
const parseTime = (timeStr: string): number | null => {
    const [min, sec] = timeStr.split(":").map(Number)
    if (min === undefined || sec === undefined) {
        return null
    }
    return (min * 60 + sec)
}

// 存放切片好的LRC文件
const LRC = parseLRC()

const musicNowTime = ref(0)

const audio = useTemplateRef<HTMLAudioElement>("audio")

const handle = (): number => {
    // 获取当前audio组件播放的当前时间转换到秒
    // const aduioElement = document.querySelector("audio")
    if (audio.value instanceof HTMLAudioElement) {
        musicNowTime.value = audio.value.currentTime
    }
    for (let i = 0; i < LRC.length; i++) {
        if (musicNowTime.value < LRC[i]!.time) {
            return i - 1
        }
    }
    return LRC.length - 1
}

const activeIndex = ref()

const containerElement = useTemplateRef<HTMLDivElement>("container")
const containerHeight = ref()

const lrclistElement = useTemplateRef<HTMLUListElement>("lrclist")
const lrcliElement = ref()
let liHeight = ref()

const lrcListTanslate = computed(() => {
    lrcliElement.value = document.querySelector(".lrcli")
    if (lrcliElement.value instanceof HTMLElement) {
        liHeight.value = lrcliElement.value.clientHeight
    }
    if (containerElement.value instanceof HTMLElement) {
        return (activeIndex.value * liHeight.value + liHeight.value / 2 - containerHeight.value / 2) * -1
    }
})

onMounted(() => {
    if (containerElement.value instanceof HTMLElement) {
        containerHeight.value = containerElement.value.clientHeight
    }
    if (audio.value) {
        audio.value.addEventListener("timeupdate", () => {
            activeIndex.value = handle()
            if (lrclistElement.value instanceof HTMLElement) {
                lrclistElement.value.style.transform = `translateY(${lrcListTanslate.value}px)`
            }
        }
        )
    }

})
</script>

<template>
    <div class="body">
        <audio ref="audio" controls :src=music_ljj></audio>

        <div ref="container" class="container">
            <ul ref="lrclist" class="lrc-list">
                <li class="lrcli cross-refs" v-for="(value, index) in LRC" :key="index" :class="{ active: activeIndex === index }">
                    {{
                        value.lyrics
                    }}</li>
            </ul>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.body {
    height: 100vh;
    background-color: black;
    color: #666;
    text-align: center;
}

.container {
    height: 600px;
    overflow: hidden;

    ul {
        transition: transform 0.4s ease;

        li {
            height: 50px;
            line-height: 50px;
            font-size: 1.5rem;
            transition: transform 0.6s ease;
        }
    }

    .active {
        transform: scale(1.7);
        color: white;
    }
}
</style>
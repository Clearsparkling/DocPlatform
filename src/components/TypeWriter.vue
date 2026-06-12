<script lang='ts' setup name='TypeWriter'>
import { onMounted, onBeforeUnmount, ref, watch, computed } from 'vue';
import type { T } from 'vue-router/dist/index-BzEKChPW.js'

const string = '1'

interface Props {
  texts?: string[]
  typeSpeed?: number
  deleteSpeed?: number
  pauseTime?: number
  loop?: boolean
  cursor?: string
}

const props = withDefaults(defineProps<Props>(), {
  texts: () => ['冷水，我想听你说话！', '为什么不理我', '我很想你！'],
  typeSpeed: 100,
  deleteSpeed: 50,
  pauseTime: 2000,
  loop: true,
  cursor: '|',
})

const emit = defineEmits<{
  type: [text: string]
  delete: [text: string]
  complete: [text: string]
  allComplete: []
}>()

const displayText = ref('')
const isDeleting = ref(false)
const currentIndex = ref(0)
const isVisible = ref(false)

let typeTimer: ReturnType<typeof setTimeout> | null = null

const currentText = () => props.texts[currentIndex.value] || ''


const type = () => {
  isVisible.value = true
  const fullText = currentText()

  if (!isDeleting.value) {
    // 正在打字
    displayText.value = fullText.substring(0, displayText.value.length + 1)
    emit('type', displayText.value)

    if (displayText.value === fullText) {
      // 打完字，等待后开始删除
      if (props.loop || currentIndex.value < props.texts.length - 1) {
        typeTimer = setTimeout(() => {
          isDeleting.value = true
          type()
        }, props.pauseTime)
      } else {
        emit('complete', fullText)
        emit('allComplete')
      }
      return
    }
  } else {
    // 正在删除
    displayText.value = fullText.substring(0, displayText.value.length - 1)
    emit('delete', displayText.value)

    if (displayText.value === '') {
      // 删完了，切换到下一条文本
      isDeleting.value = false
      currentIndex.value = (currentIndex.value + 1) % props.texts.length
      emit('complete', fullText)
    }
  }

  const speed = isDeleting.value ? props.deleteSpeed : props.typeSpeed
  // 添加随机波动，更自然
  const variance = Math.floor(Math.random() * 50) - 25
  typeTimer = setTimeout(type, Math.max(50, speed + variance))
}

onMounted(() => {
  type()
})

onBeforeUnmount(() => {
  if (typeTimer) clearTimeout(typeTimer)
})

watch(() => props.texts, () => {
  currentIndex.value = 0
  isDeleting.value = false
  displayText.value = ''
  if (typeTimer) clearTimeout(typeTimer)
  type()
})
</script>

<template>
  <div class="typewriter-wrapper ">
    <div class="typewriter-container cross-refs">
      <span class="typewriter-text">{{ displayText }}</span>
      <span class="typewriter-cursor" :class="{ blink: !isDeleting }">{{ cursor }}</span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&display=swap');

.typewriter-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100vh;
}

.typewriter-container {
  display: inline-flex;
  align-items: center;
  font-family: 'Nunito', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
  letter-spacing: 0.5px;
}

.typewriter-text {
  white-space: pre;
}

.typewriter-cursor {
  display: inline-block;
  color: #29a6ff;
  font-weight: bold;
  margin-left: 2px;
  animation: none;
  font-size: 2rem;

  &.blink {
    animation: blink 0.7s infinite;
  }
}

@keyframes blink {

  0%,
  50% {
    opacity: 1;
  }

  51%,
  100% {
    opacity: 0;
  }
}
</style>

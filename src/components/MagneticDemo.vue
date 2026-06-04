<script lang='ts' setup name='MagneticDemo'>
import { onBeforeUnmount, onMounted, onUnmounted, ref } from 'vue';

// ref自动获取pointer光标dom
const pointerRef = ref<HTMLElement | null>(null);

// pointer光标效果移动函数
const onMouseMove = (me: MouseEvent) => {
    if (pointerRef.value instanceof HTMLElement) {
        let x = me.clientX;
        let y = me.clientY;
        if (pointerRefTarget.value) {
            const rect = pointerRefTarget.value.getBoundingClientRect()
            const centerX = rect.left + rect.width / 2
            const centerY = rect.top + rect.height / 2
            x = centerX + (x - centerX) * 0.05
            y = centerY + (y - centerY) * 0.05
        }
        pointerRef.value.style.transform = `translate(${x}px,${y}px)`;
    }
}

// 存储每个元素对应的处理函数
const cleanups: Array<() => void> = [];

// 当前触发元素
const pointerRefTarget = ref<HTMLElement | null>(null)

const pointerRefsChange = () => {

    // 获取全部需要触发的元素
    const pointerRefs = document.querySelectorAll('.pointerRefs');

    // 鼠标移出触发元素触发函数
    const mouseLeave = () => {
        if (pointerRef.value instanceof HTMLElement) {
            pointerRef.value.style.setProperty('--width', '4rem');
            pointerRef.value.style.setProperty('--height', '4rem');
            // 清空当前触发的元素
            pointerRefTarget.value = null
        }
    }

    // 计算并更改pointer的宽高
    if (pointerRefs) {
        pointerRefs.forEach((e: Element) => {
            const handler = () => {
                // 将当前触发的元素的Dom对象赋给pointerRefTarget
                pointerRefTarget.value = e as HTMLElement;
                // 获取元素当前位置
                const rect = e.getBoundingClientRect();
                if (pointerRef.value instanceof HTMLElement) {
                    pointerRef.value.style.setProperty('--width', rect.width + innerWidth / 50 + 'px')
                    pointerRef.value.style.setProperty('--height', rect.height + innerHeight / 50 + 'px')
                }
            }
            e.addEventListener('mouseenter', handler)
            e.addEventListener('mouseleave', mouseLeave)

            cleanups.push(() => {
                e.removeEventListener('mouseenter', handler)
                e.removeEventListener('mouseleave', mouseLeave)
            })
        })
    }

}

onMounted(() => {
    window.addEventListener('mousemove', onMouseMove)
    pointerRefsChange()
})

onBeforeUnmount(() => {
    cleanups.forEach(fn => fn())
    cleanups.length = 0
})

onUnmounted(() => {
    window.removeEventListener('mousemove', onMouseMove)
})





</script>

<template>

    <!-- Pointer -->
    <div class="pointer" ref="pointerRef">
        <div></div>
        <div></div>
        <div></div>
        <div></div>
    </div>


    <!-- Pointer End -->

    <div class="cententbox">
        <div class="test pointerRefs">MagneticTest</div>
        <div class="name pointerRefs">ClearSparkling</div>
        <div class="url pointerRefs">https://github.com/Clearsparkling</div>

        <div class="box pointerRefs">

        </div>
    </div>



</template>

<style lang="scss" scoped>

.pointer {
    --width: 4rem;
    --height: 4rem;
    position: fixed;
    width: var(--width);
    height: var(--height);
    top: calc(var(--height) / -2);
    left: calc(var(--width) / -2);
    transition:
        transform 0.2s ease-out,
        width 0.2s ease-out,
        height 0.2s ease-out,
        left 0.2s ease-out,
        top 0.2s ease-out;
    pointer-events: none;

    div {
        position: absolute;
        width: 1rem;
        height: 1rem;
        border-width: 0.3rem;
        border-color: #29a6ff;
    }

    div:nth-child(1) {
        top: 0;
        left: 0;
        border-top-style: solid;
        border-left-style: solid;
    }

    div:nth-child(2) {
        top: 0;
        right: 0;
        border-top-style: solid;
        border-right-style: solid;
    }

    div:nth-child(3) {
        bottom: 0;
        left: 0;
        border-bottom-style: solid;
        border-left-style: solid;
    }

    div:nth-child(4) {
        bottom: 0;
        right: 0;
        border-bottom-style: solid;
        border-right-style: solid;
    }

}

.cententbox {
    height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 20px;

    div {
        font-size: 40px;
        display: flex;
        margin: 0 auto;
    }

    .box {
        height: 300px;
        width: 300px;
        background-color: black;
    }
}
</style>
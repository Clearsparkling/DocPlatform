<script lang='ts' setup name='Cross'>
import { onBeforeUnmount, onMounted, onUnmounted, ref, useTemplateRef } from 'vue';

// 获取十字标的Element
const pointElement = useTemplateRef<HTMLElement>('point')

// 指针坐标
const cursorX = ref('0000')
const cursorY = ref('0000')

/**
 * 获取指针位置并设置十字标指针的位置偏移行·
 * @param me MouseEvent
 */
const omMouseMove = (me: MouseEvent) => {
    if (pointElement.value instanceof HTMLElement) {
        pointElement.value.style.display = 'block'
        let x = me.clientX
        let y = me.clientY
        cursorX.value = me.clientX.toString().padStart(4, '0')
        cursorY.value = me.clientY.toString().padStart(4, '0')
        if (corssRefsTarget.value) {
            const rect = corssRefsTarget.value.getBoundingClientRect()
            const centerX = rect.left + rect.width / 2
            const centerY = rect.top + rect.height / 2
            x = centerX + (x - centerX) * 0.05
            y = centerY + (y - centerY) * 0.05
        }

        pointElement.value.style.transform = `translate(${x}px,${y}px)`

    }
}

/**
 * 当前触发的元素DOM
 */
const corssRefsTarget = ref<HTMLElement | null>(null)

// 存储所有创建的监听的remove方法
const crossRemoveListenerList: Array<() => void> = []

/**
 * 给所有需要触发的元素添加鼠标移入&移出的监听器
 */
const CrossRefsChange = () => {

    // 获取全部需要触发的DOM Element
    let crossRefs = document.querySelectorAll('.cross-refs')
    /**
     * 鼠标移开触发元素还原样式
     */
    const PointeElementLeave = () => {
        if (pointElement.value) {
            pointElement.value.style.setProperty('--wight', 0 + 'rem')
            pointElement.value.style.setProperty('--height', 0 + 'rem')
        }

        corssRefsTarget.value = null
    }

    if (crossRefs) {
        crossRefs.forEach((element) => {

            /**
             * 给触发元素添加鼠标移入样式
             */
            const handle = () => {
                // 添加当前触发元素
                if (element instanceof HTMLElement) {
                    corssRefsTarget.value = element
                }

                const rect = element.getBoundingClientRect()
                if (pointElement.value) {
                    pointElement.value.style.setProperty('--wight', rect.width + innerWidth / 50 + 'px')
                    pointElement.value.style.setProperty('--height', rect.height + innerHeight / 50 + 'px')
                }

            }


            element.addEventListener('mouseenter', handle)
            element.addEventListener('mouseleave', PointeElementLeave)

            crossRemoveListenerList.push(() => {
                element.removeEventListener('mouseenter', handle)
                element.removeEventListener('mouseleave', PointeElementLeave)
            })

        });
    }

}


/**
 * 指针离开视口后触发
 * @param me MouseEvent
 */
const onMouseLeave = (me: MouseEvent) => {
    if (pointElement.value instanceof HTMLElement) {
        pointElement.value.style.display = 'none'
    }
}

onMounted(() => {
    // 监听指针在视口内移动
    window.addEventListener('mousemove', omMouseMove)

    // 监听指针离开视口
    document.addEventListener('pointerleave', onMouseLeave)

    CrossRefsChange()
})

onBeforeUnmount(() => {
    // 组件卸载清空所有监听器
    crossRemoveListenerList.forEach(fn => fn())
    crossRemoveListenerList.length = 0
})
</script>

<template>
    <div ref="point" class="corss">
        <div class="left-top"></div>
        <div class="left-bottom"></div>
        <div class="right-top"></div>
        <div class="right-bottom"></div>



        <div class="row"></div>
        <div class="rowMax"></div>
        <div class="column"></div>
        <div class="columnMax"></div>
    </div>

    <div class="locator">
        <div class="cursorx">CursorX:{{ cursorX }}</div>
        <div class="cursory">CursorY:{{ cursorY }}</div>
    </div>
</template>

<style lang="scss" scoped>
.corss {
    // 内容盒宽高
    --wight: 0rem;
    --height: 0rem;
    // 长线宽度
    --rowheight: 0.15rem;
    --columnwidth: 0.15rem;
    // 长线背景颜色
    --maxBackgroudColor: rgba(0, 0, 0, 0.346);

    // 十字宽度
    --line: 1.5rem;

    position: fixed;
    height: var(--height);
    width: var(--wight);
    top: calc(var(--height) / -2);
    left: calc(var(--wight) / -2);
    pointer-events: none;
    transition:
        transform 0.2s ease-out,
        width 0.2s ease-out,
        height 0.2s ease-out,
        left 0.2s ease-out,
        top 0.2s ease-out;

    div {
        position: absolute;
        height: var(--line);
        width: var(--line);
    }

    .left-top {
        top: calc(-1 * (var(--line) + var(--rowheight) / 2));
        left: calc(-1 * (var(--line) + var(--rowheight) / 2));
        border-bottom: var(--rowheight) solid black;
        border-right: var(--rowheight) solid black;

    }

    .left-bottom {
        bottom: calc(-1 * (var(--line) + var(--rowheight) / 2));
        left: calc(-1 * (var(--line) + var(--rowheight) / 2));
        border-right: var(--rowheight) solid black;
        border-top: var(--rowheight) solid black;
    }

    .right-top {
        top: calc(-1 * (var(--line) + var(--rowheight) / 2));
        right: calc(-1 * (var(--line) + var(--rowheight) / 2));
        border-left: var(--rowheight) solid black;
        border-bottom: var(--rowheight) solid black;
    }

    .right-bottom {
        bottom: calc(-1 * (var(--line) + var(--rowheight) / 2));
        right: calc(-1 * (var(--line) + var(--rowheight) / 2));
        border-left: var(--rowheight) solid black;
        border-top: var(--rowheight) solid black;
    }

    .rowMax,
    .columnMax {
        position: absolute;
        background-color: var(--maxBackgroudColor);
    }

    .rowMax {
        height: calc(var(--rowheight) / 3);
        width: 300vw;
        top: calc(50% - (var(--rowheight) / 2 - var(--rowheight) / 3));
        left: -150vw;
    }

    .columnMax {
        height: 300vh;
        width: calc(var(--columnwidth) / 3);
        left: calc(50% - (var(--columnwidth) / 2 - var(--columnwidth) / 3));
        top: -150vh;
    }
}

.locator {
    position: fixed;
    top: 20px;
    right: 20px;
}
</style>
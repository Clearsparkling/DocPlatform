<script lang='ts' setup name='Closure'>

const cleanup = new FinalizationRegistry((key) => {
    // console.log("清理", key)
})

function fn() {
    const a = 1
    function fun() {
        return a
    }
    fun()
}

fn()

function createFoo() {
    const doms = Array.from({ length: 10000 }, () => {
        return document.createElement("div")
    })
    cleanup.register(doms, "doms")

    function bar() {
        return doms;
    }

    function foo() {

    }

    return bar
}

let foo: Function | null = createFoo()

foo()

foo = null
</script>

<template>

<div class="listitem">
    <div>1</div>
    <div>2</div>
    <div>3</div>
    <div>4</div>
    <div>5</div>
</div>

</template>

<style lang="scss" scoped>
.listitem{
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}
.listitem div{
    display: list-item;
    list-style-type: disc;
}
</style>
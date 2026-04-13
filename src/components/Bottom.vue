<script lang='ts' setup name='Bottom'>

</script>

<template>
    <div class="bottom-box">
        <a href="https://beian.miit.gov.cn">IPC备案号：</a>
        <a href="https://beian.miit.gov.cn">赣ICP备2025079186号-1</a>
    </div>
</template>

<style scoped>
.bottom-box {
    width: min(95%, 1440px);
    height: 100px;
    border: 1px solid #3B3440;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 14px;
}
.bottom-box a{
    color: white;
    transition: all 500ms;
}
.bottom-box a:hover{
    color: rgb(179, 154, 255);
}
</style>
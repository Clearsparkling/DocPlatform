<script lang='ts' setup name='Nav'>
const aboutUrl = [
    {
        name: "MarkItDown",
        url: "https://github.com/microsoft/markitdown"
    },
    {
        name: "GitHub",
        url: ""
    }
]
</script>

<template>
    <nav>
        <div class="centent-box">

            <div class="left">
                <div class="logo"></div>
                <div class="drop-down">
                    <button class="url resetButton">
                        相关链接
                    </button>
                    <ul class="about-url-box">
                        <div class="margin-box">
                            <a v-for="(value, index) in aboutUrl" :key="index" :href="value.url">
                                <li>{{ value.name }}</li>
                            </a>
                        </div>
                    </ul>
                </div>
            </div>


            <div class="right">
                <a class="login resetButton" href="/login">
                    登录
                </a>
            </div>
        </div>

    </nav>

</template>

<style scoped>
nav {
    width: 100%;
    display: flex;
    justify-content: center;
}

nav .centent-box {
    width: min(95%, 1440px);
    height: 80px;
    border: 1px solid #3B3440;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

nav .resetButton {
    height: 80px;
    width: 100px;
    display: flex;
    justify-content: center;
    align-items: center;
    border: none;
    background-color: rgba(0, 0, 0, 0);
    color: white;
    font-size: 16px;
    transition: all 0.3s ease;
}

nav .resetButton:hover {
    color: rgb(179, 154, 255);
}

/* 下拉框盒 */
.drop-down {
    position: relative;
}

.about-url-box {
    position: absolute;
    background-color: #16171D;
    border: 1px solid #3B3440;
    border-radius: 5px;
    top: 70px;
    display: none;
}

.margin-box{
    margin: 10px;
}

.about-url-box a {
    display: block;
    height: 35px;
    width: 90px;
    padding-left: 10px;
    display: flex;
    justify-content: left;
    align-items: center;
    font-size: 13px;
    border-radius: 5px;
    color: white;
    transition: all 0.3s ease;
}

.about-url-box a:hover {
    background-color: #1E2129;
    color: rgb(179, 154, 255);
}

.url:hover + .about-url-box,
.about-url-box:hover{
    display: block;
}
</style>
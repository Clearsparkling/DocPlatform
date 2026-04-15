

# Vue3 Document

## 组件传参

### Props

#### 使用V-Bind将参数绑定到子组件

``` vue
//Father.vue

<script>
    import { ref,reactive } from 'vue'
    import Son from './Son.vue'
    
    
    const title = reactive({
        name:"父亲",
        password:"123456"
    })
    
    const value = ref()
</script>

<template>
	
	//动态绑定：
	//在绑定一个对象时，必须使用v-bind绑定
	<Son v-bind="title">
   </Son>

	//在绑定一个参数时候，可以直接使用 ":" 绑定
	<Son :value="value">
   </Son>

	//静态绑定：
	<Son value="This is a Prop">
   </Son>

</template>
```

``` vue
Son.vue


<script>
    
    
    //使用defineProps解构传递的Props
    //使用此方法解构Props不会丢失响应式
	const props = defineProps({
        name:String,
        password:String
    })
    
    
    //使用此方法解构Props在Vue3.5版本之前会丢失响应式
    //在Vue3.5版本之后，使用此方法解构Props不会丢失响应式
    const {name,password} = defineProps({
        name:String,
        password:String
    })
    
   
    const props = defineProps({
        name:{
            type:String,
            // 默认值
            default:"Value",
            // 是否必须
            required: true，
            // 用于验证是否合法
            validator：(value) => {
        		return value >= 0;
		     }
        }
    })
    
 

</script>
```

[Vue3.5++响应式Props解构](https://cn.vuejs.org/guide/components/props.html#reactive-props-destructure)

#### Props单向数据流

**Props/Emits在传递给组件后，都是只读的，接受数据的组件无法更改发送组件内的数据，只不过导致此问题的原因不同**

Props接收数据时，本身是双向响应式的，但Vue的响应式系统防止数据混乱，所以在Props中添加了一层readonly。

### Emits

#### 使用defineEmits()向父组件传递数据

```vue
//Father.vue
<script lang='ts' setup name='Father'>
    let sonValue = ref(0)

    const addFun = (num: number) => {
    	sonValue.value = num
	 }
	
    
    // 创建方法 在子组件发送数据更新通知后 将子组件的新数据赋值给父组件的变量
	 const decreFun = (num: number) => {
     	sonValue.value = num
	 }
     
     
     const upDateSonValue = (num: number) => {
         sonValue.value = num
     }
</script>


<template>

	<div class="sonValue">{{ sonValue }}</div>
	
	//接收到子组件的通知后 调用方法更新子组件传递过来的数据
	<Son v-bind="title" @add="addFun" @decre="decreFun" @sonValue=""/>

</template>

```

```vue
//Son.vue
<script lang='ts' setup name='Son'>
    const emits = defineEmits(['add', 'decre','sonValue'])
    
    const num = ref(0)

	 const emitAdd = () => {
    	 num.value++
    	 emits('add',num.value)
	 }

	 const emitDecre = () => {
    	 num.value--
         
         //emits向父组件发送通知
    	 emits('decre',num.value)
	 }
     
     
     //也可以直接使用watchEffect()监听需要传递给父组件的变量 然后调用emits
     watchEffect(() => {
         emits('sonValue',num.value)
     })

    
</script>

<template>

	<div class="computer">
        <button @click="emitAdd">Add</button>
        <button @click="emitDecre">Decrease</button>
    </div>

</template>

```

#### Emits单向数据流

**Props/Emits在传递给组件后，都是只读的，接受数据的组件无法更改发送组件内的数据，只不过导致此问题的原因不同**

Emits向父组件传递数据也是单项数据流，父组件拿到后依旧是只读的，但本质上父组件拿到的并不是子组件上的变量，子组件在调用emits后向父组件发送一个通知，父组件在收到通知后调用方法，将子组件传递的值赋给父组件中声明的变量。

## 依赖注入/组件传参

### Provide

``` vue
//Ancestor
<script setup>
	import { provide } from	'vue'
	let value = ref(0)
    
    provide('name',value)
    //provide('name'==> 注入名,value ==> 值)
    
</script>
```

### Inject

``` vue
//Posterity
<script setup>
	import { inject } from 'vue'
	
	const name = inject('name')
	//const name = inject('name' ==> 注入名)
	//const name = inject('name' ==> 注入名,defualt ==> 默认值)
    
</script>
```

### Provide/Inject 双向数据流

**Provide/Inject本质上是引用的同一个ref/reactive对象，所以在调用组件内更改该值时会直接更改依赖提供者的数据**

Vue官方文档是如此解释的

[如果提供的值是一个 ref，注入进来的会是该 ref 对象，而**不会**自动解包为其内部的值。这使得注入方组件能够通过 ref 对象保持了和供给方的响应性链接。](https://cn.vuejs.org/guide/components/provide-inject.html)

### 配合响应式数据使用

如上所说，Provide/Inject双向数据流会造成**依赖提供者**和**依赖注入者**都能更改依赖提供者提供的变量的值，为防止后期维护困难、数据更改时无法溯源，我们应当尽可能保证**对任何响应式状态的更改都保持在依赖提供者的组件中**。

```vue
<script setup>
import { provide, ref } from 'vue'

const location = ref('North Pole')

function updateLocation() {
  location.value = 'South Pole'
}

provide('location', {
  location,
  updateLocation
})
</script>
```



## Axios

### Axios二次封装



``` typescript
import axios from 'axios';

const request = axios.create({
    baseURL : import.meta.env.VITE_API_URL
    // 此为在.env配置文件中创建的VITE_API_URL变量
})

export default request;
```



### Axios调用后在then中拿到的对象为Promise对象



``` typescript
request({
    method:"GET",
    url:"/front/ad/getAdList",
}).then((res) => {
    console.log(res)
    //拿到的res为Promise对象
})
// axios本身为异步函数，返回Promise对象
// 可以直接这样拿到服务器返回的值 //返回的仍为Promise对象
// 更推荐此种写法 以免在避免了Promise地狱之后 迎来then地狱
let res = await request({
    method:"GET",
    url:""
})

```



## Vite Proxy



### 在vite.config.ts中配置Proxy



```typescript
server:{
    proxy:{
        //需要代理的路径
        "/front" ：{
            //将访问这个路径的请求代理到目标地址
            //可以为字符串URL 也可以为变量
            target : loadEnv("",process.cwd()).VITE_API_URL,
            changeOrigin : true,
        }
    }
}
```


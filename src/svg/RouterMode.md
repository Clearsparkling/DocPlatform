### RouterMode

#### History/HTML5模式:

``` javascript
import { createRouter ,createWebHistory } from 'vue-router'
import ComponentValue from './path'

const router = createRouter({
    history:createWebHistory(),
    routes:[
        {
            path:'/value',
            // 被导入的组件
            component:ComponentValue
            // 可选项
            children:[
            //
            ]
        }
    ]
})
```

##### 在此模式下 服务器端未配置时 路由可正常使用 但在有路由路径时刷新页面会跳转到404 只需要在服务器端配置即可解决

``` javascript
location / {
  try_files $uri $uri/ /index.html;
}
```

添加到Nginx的配置文件的Server内即可
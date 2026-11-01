# Dawn 前端

Vue3与Element Plus后台组件包，提供布局、主题、系统页面、鉴权、权限指令、文件上传和实时客户端。业务项目通过页面注册扩展后台，也可完整替换默认仪表盘。

## 创建前端项目

需要 Node20.19+ 和 pnpm。在自己的空目录中添加依赖：

```sh
mkdir my-admin-ui
cd my-admin-ui
pnpm init
pnpm add @dawnim/admin vue vue-router pinia element-plus vue-i18n
pnpm add -D vite@^7 @vitejs/plugin-vue@^6 typescript@~5.6 vue-tsc@~2.1
```

在 `package.json` 设置 `"type": "module"`，添加命令：

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc --noEmit && vite build"
  }
}
```

创建 `index.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>管理后台</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

创建 `src/main.ts`：

```ts
import { createAdmin } from '@dawnim/admin'
import '@dawnim/admin/style.css'

createAdmin({
  title: '管理后台',
  apiBase: '/admin'
}).mount('#app')
```

创建 `vite.config.ts`，共享运行时依赖并代理后端服务：

```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: { dedupe: ['vue', 'vue-router', 'pinia', 'element-plus', 'vue-i18n'] },
  server: {
    proxy: {
      '/admin': 'http://127.0.0.1:5123',
      '/ws': { target: 'ws://127.0.0.1:8851', ws: true, rewrite: () => '/' }
    }
  }
})
```

创建 `tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "lib": ["ES2022", "DOM"],
    "types": ["vite/client"]
  },
  "include": ["src/**/*.ts", "src/**/*.vue"]
}
```

启动后端，再执行 `pnpm dev`。生产执行 `pnpm build`，将 `dist` 部署到同源地址并代理 `/admin/`、`/ws`。

## 公共接口

| 接口            | 用途                                              |
| --------------- | ------------------------------------------------- |
| createAdmin     | 注册路由、布局、主题和权限指令                    |
| Dashboard       | 默认工作台，可在业务页面中组合或完整替换          |
| CrudPage        | 列表、搜索、编辑、删除、CSV导入导出；支持业务插槽 |
| Upload          | 普通上传、分片上传、摘要预检和文件复用            |
| request         | Bearer认证、refresh轮转、错误响应和文件下载       |
| connectRealtime | 连接票据、断线恢复、顺序处理和消息确认            |
| v-permission    | 按稳定权限key控制按钮显示                         |

`pages` 先于内置页面解析。创建自己的组件后，登记页面路径；`/dashboard/console` 会完整替换默认仪表盘：

```ts
createAdmin({
  pages: {
    '/dashboard/console': () => import('./views/Dashboard.vue'),
    '/orders': () => import('./views/Orders.vue')
  }
}).mount('#app')
```

业务菜单中的组件路径与注册路径一致，页面按访问需要加载。

中英文随界面语言切换。语言key使用中文原文，例如 `t('您于{v0}执行了{v1}', { v0: time, v1: action })`，译文保留相同的命名占位符。固定提示直接以中文原文为key，缺少译文时仍填入占位符。动态字段保留按技术标识组织的zh/en映射，不改变接口字段名。业务语言包可通过 `messages: { zh, en }` 注册；生成页面会自动加载自己的字段映射。

默认 Logo 与浏览器图标随主题色和明暗模式变化。使用自己的品牌时，传入 `logo`、`favicon` 图片地址。

后台“参数设置 → 站点配置”保存后会更新站点名称和Logo，登录页显示版权与备案信息。`title`、`logo`是启动时的初始值，随后以站点配置为准；`favicon`仍由前端指定。

## 顶栏扩展

通过组件在默认工具区前后放置业务功能，或替换整个右侧区域。组件可以使用 Vue Router、`useI18n()` 和公共 `request`，并接收当前管理员的 `user`、程序时区 `timezone` 和服务器与浏览器的毫秒时间差 `serverTimeOffset`。

```ts
import HeaderTools from './components/HeaderTools.vue'

createAdmin({
  header: { before: HeaderTools }
}).mount('#app')
```

`header.before` 放在搜索前，`header.after` 放在头像后；`header.right` 替换整个右侧区域，适合自行安排全部工具。组件负责自己的尺寸和窄屏布局，在卸载时释放定时器与监听器。

## 业务列表

`CrudPage`沿用内置列表页的搜索栏、表格工具栏、分页、编辑弹窗与删除确认。字段通过`columns`定义，独立API通过`api`传入：

```vue
<template>
  <CrudPage permission="app.products" :api="api" :columns="columns" :search="['name']" />
</template>
<script setup lang="ts">
  import { CrudPage } from '@dawnim/admin'
  import api, { columns } from './api'
</script>
```

代码生成提供引用模式和源码模式。引用模式生成API、字段定义与页面入口；源码模式额外生成列表、搜索栏和编辑弹窗源码，方便直接调整。两者使用同一套界面和交互，并生成zh/en字段语言包。点击下载或生成到项目后可先编辑各文件；编辑器按文件名加载语法高亮，支持行号、缩进、撤销和亮暗主题，切换文件保留编辑内容与撤销记录。需要迁移文件时在弹窗顶部勾选“生成表迁移”，接入方式见生成目录中的说明。

个人中心沿用原版布局与编辑交互，左侧实时预览资料，使用仪表盘下的隐藏路由`/dashboard/user-center`，从头像菜单进入。缓存页面在Key规则旁说明是否纳入顶栏“清理缓存”；`Clearable`只控制该按钮的清理范围，页面所有已注册缓存均可按权限手动删除。批量清理和单项删除直接执行。登录验证码在亮色模式完全不透明，暗色模式使用27%不透明度。

源码页面可导入`ArtTable`、`ArtTableHeader`、`DawnSearchBar`、`DawnButton`、`useTable`、`useAdmin`和`useAuth`，继续使用统一的主题、请求与权限。

## 图表与统计

`ArtBarChart`、`ArtLineChart`、`ArtCountTo`、`ArtSvgIcon`可在业务页面中直接导入，复用主题和统计展示样式。页面数据通过公共`request`请求自己的API。

## 鉴权与文件

菜单来自后端。权限指令负责界面显示，写入、下载和外链访问由服务端再次校验。`custom.*` 链接通过后端launch，代码定义的可信链接使用其原地址。

请求默认使用Bearer，不携带跨域Cookie，支持服务端配置任意来源。部署到同源地址时，iframe与下载可使用登录Cookie。需要跨域凭证的独立调用可显式设置 `withCredentials` 并配置服务端白名单。

上传前计算MD5和SHA-256并检查是否已有可复用文件，上传后服务端复核内容。接口时间值为Unix毫秒整数。

## 开发与更新

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm lint
npm pack --pack-destination /tmp
```

`src/index.ts` 与 `types/index.d.ts` 保持一致。修改组件、请求或菜单转换后，用真实打包产物验证业务工程的类型和构建。

升级时固定依赖版本、同步锁文件，重新构建业务工程。业务页面保留在自己的项目中。

## 发布

版本标签触发检查、npm发布和GitHub Release，标签须与`package.json`版本一致。npm可信发布绑定`dawnim/dawn-admin`的`build.yml`，允许`npm publish`。

```sh
npm version patch -m "chore: release v%s"
git push origin main --follow-tags
```

## 鸣谢

感谢 [SaiAdmin](https://github.com/saithink/saiadmin6.x)、Art Design Pro及相关开源项目提供布局与组件基础。

## 许可

采用[MIT许可证](LICENSE)，分发时保留版权声明。

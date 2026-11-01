# 前端库开发规范

本库维护通用布局、系统页面、公共组件、鉴权请求和实时客户端。业务页面由使用方注册。

## 目录

- src/index.ts、types/index.d.ts：公开入口与类型，同步维护。
- src/views/system、src/views/safeguard：系统页面和各自的modules。
- src/dawn：公共CRUD、上传和运行配置。
- src/utils/http、src/api/auth.ts：请求、凭证轮转和菜单转换。
- src/router/core/ComponentLoader.ts：先解析使用方pages，再解析内置页面，支持完整覆盖仪表盘。

## 实现

系统页面保留原版布局、搜索栏、树表、弹窗和操作交互，接入真实接口；禁止用通用CRUD替代现成页面。用户指定原版源码时直接复用，仅适配接口、字段和语言，保留实时预览等原有交互，不自行重做布局或复制状态。代码内置菜单在同一树表显示，隐藏修改和删除操作。

使用Vue3的script setup和Element Plus，复用已有组件。简单交互直接写，不为单次调用创建hook或包装层。不保留旧接口别名、旧存储格式迁移或多格式自动识别；调用方同步调整。保持LICENSE中的版权信息。

请求使用统一request；refresh并发共享一个promise。Bearer请求默认withCredentials=false，支持任意来源CORS；同源iframe与下载可使用Cookie。凭证、密码和密钥不写日志。

v-permission控制显隐，接口授权由服务端执行。菜单key和权限key保持稳定；custom.*链接通过后端launch，代码定义链接使用其可信地址。

上传先计算MD5和SHA-256预检，再由服务端复核。接口时间为Unix毫秒整数。公共API和样式支持真实压缩包安装，不依赖源码别名。

## 检查

```sh
pnpm test
pnpm build
pnpm lint
npm pack --pack-destination /tmp
```

改类型、鉴权、菜单或公共组件后，使用独立业务工程安装打包产物并构建。界面验收说明实际操作范围。

## 文档

只说明本库功能、API、配置和升级，业务工程用通用名称。来源集中在README鸣谢。文档与代码同步，去掉临时状态和历史过程叙述。依赖和生成产物不直接修改；提交与发布按用户指令执行。

界面和接口提示使用语言key；按请求读取locale，禁止用全局SetLocale处理并发请求。

## 语言与文案

固定文案的语言key使用中文原文，其他语言包使用相同key。动态字段按技术标识读取显示名，保留按模块组织的zh/en字段映射；接口字段名不翻译。缺少译文时使用key并渲染占位符。固定界面、错误和通知文案必须使用语言包；修改中文措辞时同步修改调用处、key和所有译文，不保留旧key别名。中文尽量不加中间空格，句末不加标点；命令、路径、代码保留必要空格。

动态内容通过占位符传入，禁止拼接后翻译。前端使用命名占位符，例如`t('您于{v0}执行了{v1}', { v0: time, v1: action })`；后端保留格式占位符并按请求locale翻译。各语言占位符名称、数量和类型保持一致，翻译可调整命名参数顺序。业务语言包按模块组织，生成页面自动加载本模块语言包，通用文案使用公共语言包。

## 命名

Go导出标识使用PascalCase，缩写保留ID、IP、HTTP、URL等标准大写；Go文件使用snake_case。前端变量和函数使用camelCase，组件名使用PascalCase。数据库列、HTTP/WS请求与响应字段统一使用小写snake_case，例如id、user_id、created_at；界面中的ID、IP、PID仍使用标准大写。第三方结构在接口边界适配，不向调用方暴露Go字段名，也不保留大小写两套字段或兼容别名；框架原生配置与公开组件参数遵循各自契约。

字段语言包固定使用fields.<模块>.<接口字段名>，zh/en使用相同层级和相同snake_case字段，与接口逐字一致。禁止同时定义ID/id、Host/host、JobName/job_name等同义映射；新增或改名时同步接口、页面、生成模板及语言包。菜单和权限的稳定key不因风格调整改名。

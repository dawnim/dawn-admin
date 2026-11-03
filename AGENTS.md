# 前端库开发规范

本库维护通用布局、系统页面、公共组件、鉴权请求和实时客户端。业务页面由使用方注册。

管理员聊天的界面、会话状态与实时客户端由dawn-admin完整提供，通过createAdmin加载；业务工程只接入扩展，业务实时示例独立于内置聊天。

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

若修改 README.md 则dawn-server、dawn-admin、dawn-simple下的README.md同步更新为同样内容

全部教程集中维护在dawn-simple/docs，修改公开接口时同步教程。

文档面向使用者，直接说明已实现功能、核心逻辑和用法。文字简短准确，示例使用通用业务名称；复杂流程使用GitHub支持的Mermaid基础流程图或时序图，并验证语法。文档内部使用相对链接，跨仓库和源码链接使用GitHub地址。来源集中到README鸣谢。依赖和生成产物由工具生成；提交与发布按用户指令执行。

界面和接口提示使用语言key；按请求读取locale，禁止用全局SetLocale处理并发请求。

## 语言与文案

固定界面、错误和通知文案通过翻译函数使用中文原文key。中文直接回退原文，zh语言包只保存fields等技术标识的中文显示映射；英文及其他语言包以中文原文key定义译文。接口字段名保持原样。缺少译文时使用key并渲染占位符；修改中文措辞时同步调用处、key和各语言译文。中文尽量不加中间空格，句末不加标点；命令、路径、代码保留必要空格。

动态内容通过占位符传入，禁止拼接后翻译。前端使用命名占位符，例如`t('您于{v0}执行了{v1}', { v0: time, v1: action })`；后端保留格式占位符并按请求locale翻译。各语言占位符名称、数量和类型保持一致，翻译可调整命名参数顺序。业务语言包按模块组织，生成页面自动加载本模块语言包，通用文案使用公共语言包。

## 命名

Go导出标识使用PascalCase，缩写保留ID、IP、HTTP、URL等标准大写；Go文件使用snake_case。前端变量和函数使用camelCase，组件名使用PascalCase。数据库列、HTTP/WS请求与响应字段统一使用小写snake_case，例如id、user_id、created_at；界面中的ID、IP、PID仍使用标准大写。第三方结构在接口边界适配，不向调用方暴露Go字段名，也不保留大小写两套字段或兼容别名；框架原生配置与公开组件参数遵循各自契约。

字段语言包固定使用fields.<模块>.<接口字段名>，zh/en使用相同层级和相同snake_case字段，与接口逐字一致。禁止同时定义ID/id、Host/host、JobName/job_name等同义映射；新增或改名时同步接口、页面、生成模板及语言包。菜单和权限的稳定key不因风格调整改名。

## REST接口

HTTP接口以复数资源和方法表达操作：GET集合/详情，POST新增，PATCH局部修改，DELETE删除；PUT完整替换资源或密码、权限等子资源；普通CRUD同时支持PATCH和PUT。路径小写，多词用连字符；JSON字段与查询参数使用snake_case。所有资源直接位于/admin下，不添加system/safeguard/tool/business等技术分组；层级只表达真实资源关系。权限key保持稳定。

批量删除使用DELETE集合?ids=1,2，一次请求、一份事务；必须提供明确ID，不允许整集合删除。写入只接受公开字段，主键、审计与归属字段由服务端维护。PATCH未提交的字段保持原值；PUT必须提供必填字段，省略的可选字段恢复模型默认值或零值。两者均正常写入0、false、空字符串；null只允许可空字段。

列表参数为page、page_size、sort_by、sort_order，默认1/20，不设置每页条数上限。排序使用白名单并追加主键保证稳定；计数、列表、详情、写入和导出使用一致的数据范围。普通列表返回{data:[],meta:{page,page_size,total}}，树返回{data:[]}，Redis使用明确游标。禁止前端伪造总数、固定第一页或静默截断数据。

成功使用HTTP状态：查询/修改200，新增201并设置Location，删除204无正文；详情/新增/修改返回{data:...}，错误返回{message,errors?}。前端只在统一request层解包，不能依赖业务code或兼容多套响应。分页越界需重新取有效页的数据。

CSV导出是GET集合的text/csv表示，沿用当前筛选但忽略分页；导入使用POST集合/imports和multipart的file字段，模板为GET集合/import-template。导入事务验证全部行，不忽略错误；文件响应不套JSON。

前端模块API统一list/get/create/update/replace/remove/removeMany，update(id,input)使用PATCH，replace(id,input)使用PUT，组件通过API调用。生成器的引用模式与源码模式遵循同一协议、字段、权限、导入导出和校验规则；同时维护公开类型、模板与文档。源代码和安装包都需编译与实际CRUD验证。

import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import App from './App.vue'
import { initStore } from './store'
import { initRouter } from './router'
import language from './locales'
import { setupGlobDirectives } from './directives'
import { setupErrorHandle } from './utils/sys/error-handle'
import { dawnConfig, type Options } from './dawn/config'
import AppConfig from './config'
import './assets/styles/core/tailwind.css'
import './assets/styles/index.scss'

export { default as ArtTable } from './components/core/tables/art-table/index.vue'
export { default as ArtTableHeader } from './components/core/tables/art-table-header/index.vue'
export { default as DawnSearchBar } from './components/dawn/dawn-search-bar/index.vue'
export { default as DawnButton } from './components/dawn/dawn-button/index.vue'
export { default as DawnImport } from './components/dawn/dawn-import/index.vue'
export { default as DawnExport } from './components/dawn/dawn-export/index.vue'
export { useTable } from './hooks/core/useTable'
export { useAdmin } from './composables/useAdmin'
export { useAuth } from './hooks/core/useAuth'
export { dateLabel } from './dawn/types'
export type { Column, CrudApi, PageData } from './dawn/types'
export { default as request } from './utils/http'
export { default as ArtBarChart } from './components/core/charts/art-bar-chart/index.vue'
export { default as ArtLineChart } from './components/core/charts/art-line-chart/index.vue'
export { default as ArtCountTo } from './components/core/text-effect/art-count-to/index.vue'
export { default as ArtSvgIcon } from './components/core/base/art-svg-icon/index.vue'
export { default as Dashboard } from './views/dashboard/console/index.vue'
export { default as CrudPage } from './dawn/CrudPage.vue'
export { default as Upload } from './dawn/Upload.vue'
export { connectRealtime } from './dawn/realtime'
export type { Options }

/** 创建后台时自动装配全部系统页面, 使用项目只传业务页面. */
export function createAdmin(options: Options = {}) {
  Object.assign(dawnConfig, options)
  for (const [locale, messages] of Object.entries(options.messages || {})) {
    language.global.mergeLocaleMessage(locale, messages)
  }
  AppConfig.systemInfo.name = dawnConfig.title
  document.title = dawnConfig.title
  const app = createApp(App)
  initStore(app)
  initRouter(app)
  app.use(ElementPlus)
  app.use(language)
  setupGlobDirectives(app)
  setupErrorHandle(app)
  return app
}

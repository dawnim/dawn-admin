import { h } from 'vue'
import { dawnConfig } from '@/dawn/config'

export class ComponentLoader {
  private modules: Record<string, () => Promise<any>>

  constructor() {
    this.modules = import.meta.glob('../../views/**/*.vue')
  }

  load(componentPath: string): () => Promise<any> {
    if (!componentPath) {
      return this.createEmptyComponent()
    }

    const module = this.resolveModule(componentPath)

    if (!module) {
      console.error(`[ComponentLoader] Missing component: ${componentPath}`)
      return this.createErrorComponent(componentPath)
    }

    return module
  }

  loadLayout(): () => Promise<any> {
    return () => import('@/views/index/index.vue')
  }

  loadIframe(): () => Promise<any> {
    return () => import('@/views/outside/Iframe.vue')
  }

  private createEmptyComponent(): () => Promise<any> {
    return () =>
      Promise.resolve({
        render() {
          return h('div', {})
        }
      })
  }

  private createErrorComponent(componentPath: string): () => Promise<any> {
    return () =>
      Promise.resolve({
        render() {
          return h('div', { class: 'route-error' }, `Component not found: ${componentPath}`)
        }
      })
  }

  private resolveModule(componentPath: string): (() => Promise<any>) | undefined {
    if (dawnConfig.pages[componentPath]) return dawnConfig.pages[componentPath]
    const fullPath = `../../views${componentPath}.vue`
    const fullPathWithIndex = `../../views${componentPath}/index.vue`
    return this.modules[fullPath] || this.modules[fullPathWithIndex]
  }
}

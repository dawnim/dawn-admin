import type { App } from 'vue'
import { setupHighlightDirective } from './business/highlight'
import { setupRippleDirective } from './business/ripple'
import { setupRolesDirective } from './core/roles'
import { setupPermissionDirective } from './dawn/permission'

export function setupGlobDirectives(app: App) {
  setupRolesDirective(app) // 角色权限指令
  setupHighlightDirective(app) // 高亮指令
  setupRippleDirective(app) // 水波纹指令
  setupPermissionDirective(app) // 权限指令
}

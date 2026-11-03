/**
 * v-permission="'app.orders.create'"
 * @author sai
 */
import { useAuth } from '@/hooks/core/useAuth'
import type { App, Directive, DirectiveBinding } from 'vue'

function checkPermission(el: HTMLElement, binding: DirectiveBinding<string>): void {
  if (!useAuth().hasAuth(binding.value)) el.remove()
}

const permission: Directive = { mounted: checkPermission, updated: checkPermission }
export function setupPermissionDirective(app: App): void {
  app.directive('permission', permission)
}

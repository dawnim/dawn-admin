/**
 * 后端菜单转换为前端路由。
 * @author Art Design Pro Team
 */
import type { AppRouteRecord } from '@/types/router'
import { fetchGetMenuList } from '@/api/auth'

export class MenuProcessor {
  async getMenuList(): Promise<AppRouteRecord[]> {
    return this.normalizeMenuPaths(await fetchGetMenuList())
  }

  validateMenuList(menuList: AppRouteRecord[]): boolean {
    return Array.isArray(menuList) && menuList.length > 0
  }

  private normalizeMenuPaths(menus: AppRouteRecord[], parent = ''): AppRouteRecord[] {
    return menus.map((item) => {
      const path =
        item.path.startsWith('/') || /^https?:/.test(item.path)
          ? item.path
          : `${parent.replace(/\/$/, '')}/${item.path}`
      const children = item.children?.length
        ? this.normalizeMenuPaths(item.children, path)
        : item.children
      return {
        ...item,
        path,
        children,
        redirect: item.redirect || this.resolveDefaultRedirect(children)
      }
    })
  }

  private resolveDefaultRedirect(children?: AppRouteRecord[]): string | undefined {
    for (const child of children || []) {
      if (
        child.path &&
        child.path !== '/' &&
        !child.meta?.link &&
        !child.meta?.isIframe &&
        child.component
      ) {
        return child.path
      }
      const redirect = this.resolveDefaultRedirect(child.children)
      if (redirect) return redirect
    }
  }
}

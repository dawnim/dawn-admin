import request from '@/utils/http'
import { $t as t } from '@/locales'
import { createResourceApi, toTree, filterTree } from '../resource'
export default {
  ...createResourceApi('/roles'),
  accessRole: () => request.get<Api.Common.ApiData[]>({ url: '/roles/options' }),
  async menuByRole({ id }: { id: number }) {
    const data = await request.get<{
      keys: string[]
      permissions: Api.Common.ApiData[]
      menus: Api.Common.ApiData[]
      custom: Api.Common.ApiData[]
    }>({ url: `/roles/${id}/permissions` })
    const menus = [...data.menus, ...data.custom]
      .filter((m) => m.type !== 3)
      .sort((a, b) => (a.sort || 0) - (b.sort || 0))
    const menuKeys = new Set(menus.map((m) => m.key))
    // 分组与真实权限使用不同节点，回显菜单访问权限时不会选中全部按钮。
    const rows = menus.map((m) => ({
      id: `menu:${m.key}`,
      parent_id: m.parent_key ? `menu:${m.parent_key}` : 0,
      name: m.title,
      type: m.type,
      grantable: false
    }))
    for (const p of data.permissions) {
      rows.push({
        id: p.key,
        parent_id: menuKeys.has(p.key)
          ? `menu:${p.key}`
          : menuKeys.has(p.parent_key)
            ? `menu:${p.parent_key}`
            : p.parent_key || 0,
        name: menuKeys.has(p.key) ? t('查看') : p.title,
        type: 3,
        grantable: true
      })
    }
    return { keys: data.keys, menus: filterTree(toTree(rows), (row) => row.grantable) }
  },
  menuPermission: ({ id, menu_ids }: { id: number; menu_ids: string[] }) =>
    request.put({ url: `/roles/${id}/permissions`, data: { keys: menu_ids } })
}

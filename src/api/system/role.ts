import request from '@/utils/http'
import { resource, toTree } from '../resource'
export default {
  ...resource('/system/roles'),
  async accessRole() {
    const data = await request.get<{ roles: Api.Common.ApiData[] }>({ url: '/system/user-options' })
    return data.roles
  },
  async menuByRole({ id }: { id: number }) {
    const data = await request.get<{
      keys: string[]
      permissions: Api.Common.ApiData[]
      menus: Api.Common.ApiData[]
      custom: Api.Common.ApiData[]
    }>({ url: `/system/roles/${id}/permissions` })
    const allowed = new Set(data.permissions.map((p) => p.key))
    const rows = [...data.menus, ...data.custom]
      .sort((a, b) => (a.sort || 0) - (b.sort || 0))
      .map((m) => ({
        id: m.key,
        parent_id: m.parent_key || 0,
        name: m.title,
        type: m.type,
        grantable: allowed.has(m.key)
      }))
    const keys = new Set(rows.map((row) => row.id))
    for (const p of data.permissions) {
      if (!keys.has(p.key))
        rows.push({
          id: p.key,
          parent_id: p.parent_key || 0,
          name: p.title,
          type: 3,
          grantable: true
        })
    }
    return { keys: data.keys, menus: toTree(rows) }
  },
  menuPermission: ({ id, menu_ids }: { id: number; menu_ids: string[] }) =>
    request.put({ url: `/system/roles/${id}/permissions`, data: { keys: menu_ids } })
}

import request from '@/utils/http'
import { toTree, filterTree } from '../resource'

function menuRow(m: Api.Common.ApiData, builtin: boolean): Api.Common.ApiData {
  return {
    ...m,
    id: builtin ? m.key : m.id,
    parent_id: m.parent_key || 0,
    name: m.title,
    code: m.key,
    slug: m.type === 3 ? m.key : '',
    path: m.path || '',
    component: m.component || '',
    link_url: m.url || '',
    builtin,
    is_iframe: m.mode === 'iframe' ? 1 : 2,
    is_hidden: m.hidden ? 1 : 2,
    is_keep_alive: m.keep_alive ? 1 : 2,
    is_fixed_tab: m.fixed_tab ? 1 : 2,
    is_full_page: m.full_page ? 1 : 2
  }
}
function menuData(form: Record<string, any>) {
  return {
    ...form,
    key: form.type === 3 ? form.slug : form.code,
    title: form.name,
    parent_key: form.parent_id === '0' ? '' : form.parent_id || '',
    url: form.link_url,
    mode: form.is_iframe === 1 ? 'iframe' : 'new_tab',
    hidden: form.is_hidden === 1,
    keep_alive: form.is_keep_alive === 1,
    fixed_tab: form.is_fixed_tab === 1,
    full_page: form.is_full_page === 1
  }
}
export default {
  async list(params: Record<string, any> = {}) {
    const data = await request.get<{
      menus: Api.Common.ApiData[]
      custom: Api.Common.ApiData[]
      permissions: Record<string, Api.Common.ApiData>
    }>({ url: '/system/menus/definitions' })
    const rows = [
      ...data.menus.map((m) => menuRow(m, true)),
      ...Object.values(data.permissions).map((p) => menuRow({ ...p, type: 3, status: 1 }, true)),
      ...data.custom.map((m) => menuRow(m, false))
    ]
    // 上级关联始终使用稳定Key，数据库ID只用于更新和删除。
    const ids = new Map(rows.map((row) => [row.key, row.id]))
    for (const row of rows) row.parent_id = ids.get(row.parent_key) || 0
    rows.sort((a, b) => (a.sort || 0) - (b.sort || 0))
    return filterTree(
      toTree(rows),
      (row) =>
        (!params.name || row.name.includes(params.name)) &&
        (!params.path || row.path.includes(params.path)) &&
        (!params.status || row.status === params.status)
    )
  },
  save: (form: Record<string, any>) => request.post({ url: '/system/menus', data: menuData(form) }),
  update: (form: Record<string, any>) =>
    request.put({ url: `/system/menus/${form.id}`, data: menuData(form) }),
  delete: ({ ids }: { ids: number[] }) =>
    Promise.all(ids.map((id) => request.del({ url: `/system/menus/${id}` }))),
  available: (key: string, id?: number) =>
    request.get<{ available: boolean }>({ url: '/system/menus/available', params: { key, id } })
}

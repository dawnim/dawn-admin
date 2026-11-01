import request from '@/utils/http'
const resources: Record<string, string> = {
  admin_users: 'users',
  admin_roles: 'roles',
  admin_departments: 'departments',
  admin_posts: 'posts',
  admin_attachments: 'attachments',
  admin_categories: 'categories',
  admin_menus: 'menus'
}
export default {
  async list(params: Record<string, any> = {}) {
    const rows = await request.get<Api.Common.ApiData[]>({ url: '/database/table-info' })
    const data = rows
      .filter((row) => !params.name || row.name.includes(params.name))
      .map((row) => ({ ...row, resource: resources[row.name] }))
    return { data, total: data.length, current_page: 1, per_page: data.length }
  },
  async getDetailed(params: Record<string, any>) {
    const rows = await request.get<Api.Common.ApiData[]>({ url: '/database/columns', params })
    return rows.map((c) => ({
      column_name: c.name,
      column_type: c.type,
      column_key: c.primary ? 'PRIMARY' : '',
      column_default: c.default,
      column_comment: c.comment
    }))
  },
  async getRecycle({ table }: { table: string }) {
    const data = await request.get<Api.Common.ApiData[]>({
      url: '/database/recycle',
      params: { resource: resources[table] }
    })
    return { data, total: data.length, current_page: 1, per_page: data.length }
  },
  recovery: ({ table, ids }: { table: string; ids: number[] }) =>
    Promise.all(
      ids.map((id) =>
        request.post({
          url: `/database/recycle/${id}/restore`,
          params: { resource: resources[table] }
        })
      )
    ),
  optimize: ({ tables }: { tables: string[] }) =>
    Promise.all(
      tables.map((table) =>
        request.post({ url: '/database/maintain', data: { table, action: 'optimize' } })
      )
    ),
  fragment: ({ tables }: { tables: string[] }) =>
    Promise.all(
      tables.map((table) =>
        request.post({ url: '/database/maintain', data: { table, action: 'analyze' } })
      )
    )
}

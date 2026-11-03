import type { AxiosRequestConfig } from 'axios'
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
  async list(params: Record<string, any> = {}, config?: AxiosRequestConfig) {
    const page = await request.get<Api.Common.ApiPage>({ ...config, url: '/tables', params })
    return { ...page, data: page.data.map((row) => ({ ...row, resource: resources[row.name] })) }
  },
  async getDetailed({ table }: { table: string }) {
    const rows = await request.get<Api.Common.ApiData[]>({
      url: `/tables/${encodeURIComponent(table)}/columns`
    })
    return rows.map((column) => ({
      column_name: column.name,
      column_type: column.type,
      column_key: column.key,
      column_default: column.default,
      column_comment: column.comment
    }))
  },
  getRecycle: ({ table, ...params }: Record<string, any>, config?: AxiosRequestConfig) =>
    request.get<Api.Common.ApiPage>({
      ...config,
      url: '/recycle-bin',
      params: { ...params, resource: resources[table] }
    }),
  recovery: ({ table, ids }: { table: string; ids: number[] }) =>
    request.post<void>({
      url: '/recycle-bin/restorations',
      data: { resource: resources[table], ids }
    }),
  optimize: ({ tables }: { tables: string[] }) =>
    Promise.all(
      tables.map((table) =>
        request.post({ url: '/table-maintenance-runs', data: { table, action: 'analyze' } })
      )
    ),
  fragment: ({ tables }: { tables: string[] }) =>
    Promise.all(
      tables.map((table) =>
        request.post({ url: '/table-maintenance-runs', data: { table, action: 'optimize' } })
      )
    )
}

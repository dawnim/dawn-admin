import request from '@/utils/http'
import type { AxiosRequestConfig } from 'axios'
import type { CrudApi, ListQuery, PageData } from '@/dawn/types'

const writable = (data: Record<string, any>) =>
  Object.fromEntries(
    Object.entries(data).filter(
      ([key]) => !['id', 'created_at', 'updated_at', 'deleted_at'].includes(key)
    )
  )

/** 复用资源集合地址，写入时剔除主键与审计时间。 */
export function createResourceApi<
  T extends Record<string, any> = Record<string, any>,
  Create = Partial<T>,
  Update = Partial<Create>,
  Query extends ListQuery = ListQuery
>(path: string): CrudApi<T, Create, Update, Query> {
  return {
    list: (params: Query = {} as Query, config?: AxiosRequestConfig) =>
      request.get<PageData<T>>({ ...config, url: path, params }),
    get: (id) => request.get<T>({ url: `${path}/${id}` }),
    create: (input) => request.post<T>({ url: path, data: writable(input as Record<string, any>) }),
    update: (id, input) =>
      request.patch<T>({ url: `${path}/${id}`, data: writable(input as Record<string, any>) }),
    replace: (id, input) =>
      request.put<T>({ url: `${path}/${id}`, data: writable(input as Record<string, any>) }),
    remove: (id) => request.del<void>({ url: `${path}/${id}` }),
    removeMany: (ids) => request.del<void>({ url: path, params: { ids: ids.join(',') } })
  }
}

export function toTree(
  rows: Api.Common.ApiData[],
  parent: number | string = 0
): Api.Common.ApiData[] {
  return rows
    .filter((row) => row.parent_id === parent)
    .map((row) => ({
      ...row,
      label: row.name,
      value: row.id,
      children: toTree(rows, row.id)
    }))
}

export function filterTree(
  rows: Api.Common.ApiData[],
  matches: (row: Api.Common.ApiData) => boolean
): Api.Common.ApiData[] {
  return rows
    .map((row) => ({ ...row, children: filterTree(row.children, matches) }))
    .filter((row) => matches(row) || row.children.length)
}

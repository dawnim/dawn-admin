import request from '@/utils/http'

// 系统页面共用的列表、编辑与删除接口。
export function resource(path: string) {
  return {
    list: (params: Record<string, any> = {}) =>
      request.get<Api.Common.ApiPage>({ url: path, params }),
    read: (id: string | number) => request.get<Api.Common.ApiData>({ url: `${path}/${id}` }),
    save: (data: Record<string, any>) => request.post({ url: path, data }),
    update: (data: Record<string, any>) => request.put({ url: `${path}/${data.id}`, data }),
    delete: ({ ids }: { ids: (string | number)[] }) =>
      Promise.all(ids.map((id) => request.del({ url: `${path}/${id}` })))
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

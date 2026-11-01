import request from '@/utils/http'
import { $t as t } from '@/locales'
import { resource, toTree, filterTree } from '../resource'
export default {
  ...resource('/system/departments'),
  async list(params: Record<string, any> = {}) {
    const rows = await request.get<Api.Common.ApiData[]>({ url: '/system/departments' })
    return filterTree(
      toTree(rows),
      (row) =>
        (!params.name || row.name.includes(params.name)) &&
        (!params.phone || row.phone?.includes(params.phone)) &&
        (!params.status || row.status === params.status)
    )
  },
  async accessDept() {
    const data = await request.get<{ departments: Api.Common.ApiData[] }>({
      url: '/system/user-options'
    })
    return [
      {
        id: 0,
        value: 0,
        label: t('全部部门'),
        name: t('全部部门'),
        children: toTree(data.departments)
      }
    ]
  }
}

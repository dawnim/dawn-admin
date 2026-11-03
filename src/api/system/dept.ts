import type { AxiosRequestConfig } from 'axios'
import request from '@/utils/http'
import { $t as t } from '@/locales'
import { createResourceApi, toTree, filterTree } from '../resource'
export default {
  ...createResourceApi('/departments'),
  async list(params: Record<string, any> = {}, config?: AxiosRequestConfig) {
    const rows = await request.get<Api.Common.ApiData[]>({ ...config, url: '/departments' })
    return filterTree(
      toTree(rows),
      (row) =>
        (!params.name || row.name.includes(params.name)) &&
        (!params.phone || row.phone?.includes(params.phone)) &&
        (!params.status || row.status === params.status)
    )
  },
  async accessDept(managed = false) {
    const data = await request.get<Api.Common.ApiData[]>({
      url: '/departments/options',
      params: { managed }
    })
    return [
      {
        id: 0,
        value: 0,
        label: t('全部部门'),
        name: t('全部部门'),
        children: toTree(data)
      }
    ]
  }
}

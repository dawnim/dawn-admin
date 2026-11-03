import type { AxiosRequestConfig } from 'axios'
import request from '@/utils/http'
import { createResourceApi } from '../resource'
export default {
  ...createResourceApi('/attachments'),
  async list(params: Record<string, any> = {}, config?: AxiosRequestConfig) {
    const data = await request.get<Api.Common.ApiPage>({
      ...config,
      url: '/attachments',
      params: { ...params, name: params.origin_name }
    })
    return {
      ...data,
      data: data.data.map((row) => ({
        ...row,
        origin_name: row.name,
        mime_type: row.mime,
        size_info: `${(row.size / 1024).toFixed(1)} KB`
      }))
    }
  },
  update: (id: string | number, data: Record<string, any>) =>
    request.patch({
      url: `/attachments/${id}`,
      data: { name: data.origin_name, category_id: data.category_id }
    }),
  move: ({ ids, category_id }: { ids: number[]; category_id: number }) =>
    request.patch({ url: '/attachments', params: { ids: ids.join(',') }, data: { category_id } })
}

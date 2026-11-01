import request from '@/utils/http'
import { resource } from '../resource'
export default {
  ...resource('/attachments'),
  async list(params: Record<string, any> = {}) {
    const data = await request.get<Api.Common.ApiPage>({
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
  update: (data: Record<string, any>) =>
    request.put({
      url: `/attachments/${data.id}`,
      data: { name: data.origin_name, category_id: data.category_id }
    }),
  move: (data: Record<string, any>) => request.post({ url: '/attachments/move', data })
}

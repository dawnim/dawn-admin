import request from '@/utils/http'
import { resource } from '../resource'
export default {
  ...resource('/system/users'),
  async changePassword({ id, password }: { id: number; password: string }) {
    const data = await request.get<Api.Common.ApiData>({ url: `/system/users/${id}` })
    return request.put({
      url: `/system/users/${id}`,
      data: {
        ...data,
        password,
        role_ids: data.role_list.map((r: any) => r.id),
        post_ids: data.post_list.map((p: any) => p.id)
      }
    })
  },
  sessions: () => request.get<Api.Common.ApiData[]>({ url: '/system/sessions' }),
  revoke: (id: string) => request.del({ url: `/system/sessions/${id}` })
}

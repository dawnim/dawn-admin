import type { AxiosRequestConfig } from 'axios'
import request from '@/utils/http'
import { createResourceApi } from '../resource'
export default {
  ...createResourceApi('/users'),
  async changePassword({ id, password }: { id: number; password: string }) {
    return request.put({ url: `/users/${id}/password`, data: { password } })
  },
  setDashboard: (id: number, dashboard: string) =>
    request.put({ url: `/users/${id}/dashboard`, data: { dashboard } }),
  clearCache: (id: number) => request.del({ url: `/users/${id}/cache` }),
  sessions: (params: Record<string, any> = {}, config?: AxiosRequestConfig) =>
    request.get<Api.Common.ApiPage>({ ...config, url: '/sessions', params }),
  revoke: (id: string) => request.del({ url: `/sessions/${id}` })
}

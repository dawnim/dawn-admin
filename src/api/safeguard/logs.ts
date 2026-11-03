import type { AxiosRequestConfig } from 'axios'
import request from '@/utils/http'
import { createResourceApi } from '../resource'

// 三类日志共用字段、分页和删除协议。
export function logApi(kind: 'login' | 'operation' | 'email') {
  const { remove, removeMany } = createResourceApi('/logs')
  return {
    remove,
    removeMany,
    list: ({ created_at, ...params }: Record<string, any>, config?: AxiosRequestConfig) =>
      request.get<Api.Common.ApiPage>({
        ...config,
        url: '/logs',
        params: {
          ...params,
          kind,
          start: created_at?.[0] ? new Date(created_at[0]).getTime() : undefined,
          end: created_at?.[1] ? new Date(created_at[1]).getTime() : undefined
        }
      })
  }
}

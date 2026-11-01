import request from '@/utils/http'
import { resource } from '../resource'
export default {
  ...resource('/system/logs'),
  list: (params: Record<string, any>) =>
    request.get<Api.Common.ApiPage>({
      url: '/system/logs',
      params: {
        ...params,
        path: params.router,
        method: params.service_name,
        start: params.created_at?.[0]
          ? new Date(params.created_at[0]).getTime()
          : params.login_time?.[0]
            ? new Date(params.login_time[0]).getTime()
            : undefined,
        end: params.created_at?.[1]
          ? new Date(params.created_at[1]).getTime()
          : params.login_time?.[1]
            ? new Date(params.login_time[1]).getTime()
            : undefined,
        kind: 'login'
      }
    })
}

import request from '@/utils/http'
import { resource } from '../resource'
export default {
  ...resource('/system/logs'),
  list: (params: Record<string, any>) =>
    request.get<Api.Common.ApiPage>({
      url: '/system/logs',
      params: {
        ...params,
        sender: params.from,
        recipient: params.email,
        path: params.router,
        method: params.service_name,
        start: params.create_time?.[0]
          ? new Date(params.create_time[0]).getTime()
          : params.login_time?.[0]
            ? new Date(params.login_time[0]).getTime()
            : undefined,
        end: params.create_time?.[1]
          ? new Date(params.create_time[1]).getTime()
          : params.login_time?.[1]
            ? new Date(params.login_time[1]).getTime()
            : undefined,
        kind: 'email'
      }
    })
}

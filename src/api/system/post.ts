import request from '@/utils/http'
import { createResourceApi } from '../resource'
export default {
  ...createResourceApi('/posts'),
  accessPost: () => request.get<Api.Common.ApiData[]>({ url: '/posts/options' })
}

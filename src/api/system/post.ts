import request from '@/utils/http'
import { resource } from '../resource'
export default {
  ...resource('/system/posts'),
  async accessPost() {
    const data = await request.get<{ posts: Api.Common.ApiData[] }>({ url: '/system/user-options' })
    return data.posts
  }
}

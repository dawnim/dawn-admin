import request from '@/utils/http'
import { $t as t } from '@/locales'
import { resource, toTree } from '../resource'
export default {
  ...resource('/attachments/categories'),
  async list() {
    const rows = await request.get<Api.Common.ApiData[]>({
      url: '/attachments/categories',
      params: { orderField: 'sort', orderType: 'asc' }
    })
    return [
      {
        id: 0,
        value: 0,
        label: t('全部附件'),
        name: t('全部附件'),
        children: toTree(rows)
      }
    ]
  }
}

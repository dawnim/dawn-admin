import request from '@/utils/http'
import { upload } from './upload'
import categoryApi from './safeguard/category'
import attachmentApi from './safeguard/attachment'
import type { AppRouteRecord } from '@/types/router'
import type { Menu } from '@/dawn/types'
import { dawnConfig } from '@/dawn/config'

export const fetchCaptcha = () => request.get<Api.Auth.CaptchaResponse>({ url: '/auth/captcha' })
export const fetchLogin = (data: Api.Auth.LoginParams) =>
  request.post<Api.Auth.LoginResponse>({ url: '/auth/login', data })
export const fetchLogout = (token: string) =>
  request.post({
    url: '/auth/logout',
    headers: { Authorization: `Bearer ${token}` },
    showErrorMessage: false
  })
export const fetchGetUserInfo = () => request.get<Api.Auth.UserInfo>({ url: '/auth/me' })
export const updateUserInfo = (data: Record<string, unknown>) =>
  request.put({ url: '/auth/profile', data })
export const modifyPassword = (data: Record<string, unknown>) =>
  request.put({
    url: '/auth/password',
    data: { old_password: data.oldPassword, password: data.newPassword }
  })
export const fetchGetLogin = (params: Record<string, unknown>) =>
  request.get<Api.Common.ApiPage>({ url: '/system/logs', params: { ...params, kind: 'login' } })
export const fetchGetOperate = (params: Record<string, unknown>) =>
  request.get<Api.Common.ApiPage>({ url: '/system/logs', params: { ...params, kind: 'operation' } })
// 固定选项来自实体, 没有字典管理表或字典CRUD.
export const fetchGetDictList = () => request.get<Api.Auth.DictData>({ url: '/auth/options' })
export async function fetchGetMenuList(): Promise<AppRouteRecord[]> {
  const menus = await request.get<Menu[]>({ url: '/menus' })
  const convert = (rows: Menu[]): AppRouteRecord[] =>
    rows.map((m) => ({
      name: m.key,
      path: m.path,
      component: m.component || '/index/index',
      meta: {
        title: m.title,
        icon: m.icon,
        link: m.url
          ? m.key.startsWith('custom.')
            ? `${dawnConfig.apiBase}/links/${m.key}/launch`
            : m.url
          : undefined,
        isIframe: m.mode === 'iframe',
        isHide: m.hidden,
        keepAlive: m.keep_alive,
        fixedTab: m.fixed_tab,
        isFullPage: m.full_page,
        menuKey: m.key
      },
      ...(m.children?.length ? { children: convert(m.children) } : {})
    }))
  return convert(menus)
}
export const uploadImage = (params: FormData) =>
  upload(params.get('file') as File, Number(params.get('category_id') || 0))
export const uploadFile = uploadImage
export const getResourceCategory = () => categoryApi.list()
export const getResourceList = (params: Record<string, unknown>) => attachmentApi.list(params)
export const getUserList = (params: Record<string, unknown>) =>
  request.get<Api.Common.ApiPage>({ url: '/system/users', params })

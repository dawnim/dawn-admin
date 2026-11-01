/**
 * HTTP 请求封装模块
 * 基于 Axios 封装的 HTTP 请求工具，提供统一的请求/响应处理
 *
 * ## 主要功能
 *
 * - 请求/响应拦截器（自动添加 Token、统一错误处理）
 * - 401 未授权自动登出（带防抖机制）
 * - 访问凭证过期后轮转并重试一次
 * - 统一的成功/错误消息提示
 * - 支持 GET/POST/PUT/DELETE 等常用方法
 *
 * @module utils/http
 * @author Art Design Pro Team
 */

import { dawnConfig } from '@/dawn/config'
import axios, { AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { useUserStore } from '@/store/modules/user'
import { ApiStatus } from './status'
import { HttpError, handleError, showError, showSuccess } from './error'
import { $t } from '@/locales'
import { BaseResponse } from '@/types'

/** 请求配置常量 */
const REQUEST_TIMEOUT = 15000
const LOGOUT_DELAY = 500
const UNAUTHORIZED_DEBOUNCE_TIME = 3000

/** 401防抖状态 */
let isUnauthorizedErrorShown = false
let refreshing: Promise<string> | null = null

function refreshSession(): Promise<string> {
  const user = useUserStore()
  const rotate = async () => {
    // 等待其他标签页的轮转完成后，直接使用已经落盘的新凭证。
    if (typeof localStorage !== 'undefined') {
      const saved = JSON.parse(localStorage.getItem('admin:user') || '{}')
      if (saved.refreshToken && saved.refreshToken !== user.refreshToken) {
        user.setToken(
          saved.accessToken,
          saved.refreshToken,
          (saved.tokenExpiresAt - Date.now()) / 1000
        )
        return saved.accessToken as string
      }
    }
    const { data } = await axios.post(
      `${dawnConfig.apiBase}/auth/refresh`,
      { refresh_token: user.refreshToken },
      {
        timeout: REQUEST_TIMEOUT,
        withCredentials: false,
        headers: { 'Accept-Language': user.language }
      }
    )
    user.setToken(data.data.access_token, data.data.refresh_token, data.data.expires_in)
    return data.data.access_token as string
  }
  refreshing ||= (
    globalThis.navigator?.locks
      ? navigator.locks.request(`admin:refresh:${dawnConfig.apiBase}`, rotate)
      : rotate()
  ).finally(() => {
    refreshing = null
  })
  return refreshing
}

/** 扩展 AxiosRequestConfig */
interface ExtendedAxiosRequestConfig extends AxiosRequestConfig {
  showErrorMessage?: boolean
  showSuccessMessage?: boolean
}

/** Axios实例 */
const axiosInstance = axios.create({
  timeout: REQUEST_TIMEOUT,
  baseURL: dawnConfig.apiBase,
  withCredentials: false
})

/** 请求拦截器 */
axiosInstance.interceptors.request.use(
  async (request: InternalAxiosRequestConfig) => {
    request.baseURL = dawnConfig.apiBase
    const user = useUserStore()
    if (
      user.refreshToken &&
      user.tokenExpiresAt &&
      user.tokenExpiresAt - Date.now() < 5 * 60_000 &&
      !request.url?.startsWith('/auth/')
    )
      await refreshSession()
    const { accessToken, language } = user
    request.headers.set('Accept-Language', language)
    if (accessToken && !request.headers.has('Authorization')) {
      request.headers.set('Authorization', `Bearer ${accessToken}`)
    }

    return request
  },
  (error) => {
    showError(new HttpError($t('请求配置错误'), ApiStatus.error))
    throw error
  }
)

/** 响应拦截器 */
axiosInstance.interceptors.response.use(
  (response: AxiosResponse<BaseResponse>) => {
    if (response.config.responseType === 'blob') return response
    const { code, message } = response.data
    if (code === ApiStatus.success) return response
    if (code === ApiStatus.unauthorized) handleUnauthorizedError(message)
    throw new HttpError(message || $t('请求失败'), code)
  },
  async (error) => {
    const user = useUserStore(),
      config = error.config
    if (
      error.response?.status === 401 &&
      config &&
      !config._dawnRetry &&
      user.refreshToken &&
      !['/auth/login', '/auth/logout', '/auth/refresh', '/auth/captcha'].some((path) =>
        config.url?.endsWith(path)
      )
    ) {
      config._dawnRetry = true
      try {
        const used = config.headers.Authorization
        config.headers.Authorization =
          used !== `Bearer ${user.accessToken}`
            ? `Bearer ${user.accessToken}`
            : `Bearer ${await refreshSession()}`
        return axiosInstance.request(config)
      } catch (refreshError) {
        if (axios.isAxiosError(refreshError) && refreshError.response?.status === 401)
          handleUnauthorizedError()
        if (axios.isAxiosError(refreshError)) return handleError(refreshError)
        throw refreshError
      }
    }
    if (error.response?.status === 401) handleUnauthorizedError()
    return handleError(error)
  }
)

/** 并发401只提示和退出一次。 */
function handleUnauthorizedError(message?: string): never {
  const error = new HttpError(message || $t('未授权访问，请重新登录'), ApiStatus.unauthorized)
  if (!isUnauthorizedErrorShown) {
    isUnauthorizedErrorShown = true
    setTimeout(() => useUserStore().logOut(), LOGOUT_DELAY)
    setTimeout(() => {
      isUnauthorizedErrorShown = false
    }, UNAUTHORIZED_DEBOUNCE_TIME)
    showError(error, true)
  }
  throw error
}

/** 请求函数 */
async function request<T = any>(config: ExtendedAxiosRequestConfig): Promise<T> {
  try {
    const res = await axiosInstance.request<BaseResponse<T>>(config)

    // 显示成功消息
    if (config.showSuccessMessage && res.data.message) {
      showSuccess(res.data.message)
    }

    if (config.responseType === 'blob') return res.data as T

    return res.data.data as T
  } catch (error) {
    if (error instanceof HttpError && error.code !== ApiStatus.unauthorized) {
      const showMsg = config.showErrorMessage !== false
      showError(error, showMsg)
    }
    throw error
  }
}

/** API方法集合 */
const api = {
  get<T>(config: ExtendedAxiosRequestConfig) {
    return request<T>({ ...config, method: 'GET' })
  },
  post<T>(config: ExtendedAxiosRequestConfig) {
    return request<T>({ ...config, method: 'POST' })
  },
  put<T>(config: ExtendedAxiosRequestConfig) {
    return request<T>({ ...config, method: 'PUT' })
  },
  del<T>(config: ExtendedAxiosRequestConfig) {
    return request<T>({ ...config, method: 'DELETE' })
  },
  request<T>(config: ExtendedAxiosRequestConfig) {
    return request<T>(config)
  }
}

export default api

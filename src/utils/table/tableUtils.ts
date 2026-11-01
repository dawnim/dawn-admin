/** 表格响应、分页、防抖和错误处理。
 * @author Art Design Pro Team
 */

import type { ApiResponse } from './tableCache'

// 请求参数基础接口，扩展分页参数
export interface BaseRequestParams extends Api.Common.PaginationParams {
  [key: string]: unknown
}

// 错误处理接口
export interface TableError {
  code: string
  message: string
  details?: unknown
}

/** 对应服务端分页响应；树形列表直接返回数组。 */
export const defaultResponseAdapter = <T>(response: unknown): ApiResponse<T> => {
  if (Array.isArray(response)) return { records: response, total: response.length }
  const page = response as { data: T[]; total: number; current_page: number; per_page: number }
  return { records: page.data, total: page.total, current: page.current_page, size: page.per_page }
}

export const extractTableData = <T>(response: ApiResponse<T>): T[] => response.records

/**
 * 根据API响应更新分页信息
 */
export const updatePaginationFromResponse = <T>(
  pagination: Api.Common.PaginationParams,
  response: ApiResponse<T>
): void => {
  pagination.total = response.total ?? pagination.total ?? 0

  if (response.current !== undefined) {
    pagination.current = response.current
  }

  const maxPage = Math.max(1, Math.ceil(pagination.total / (pagination.size || 1)))
  if (pagination.current > maxPage) {
    pagination.current = maxPage
  }
}

/**
 * 创建智能防抖函数 - 支持取消和立即执行
 */
export const createSmartDebounce = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  delay: number
): T & { cancel: () => void; flush: () => Promise<any> } => {
  let timeoutId: NodeJS.Timeout | null = null
  let lastArgs: Parameters<T> | null = null
  let lastResolve: ((value: any) => void) | null = null
  let lastReject: ((reason: any) => void) | null = null

  const debouncedFn = (...args: Parameters<T>): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (timeoutId) clearTimeout(timeoutId)
      lastArgs = args
      lastResolve = resolve
      lastReject = reject
      timeoutId = setTimeout(async () => {
        try {
          const result = await fn(...args)
          resolve(result)
        } catch (error) {
          reject(error)
        } finally {
          timeoutId = null
          lastArgs = null
          lastResolve = null
          lastReject = null
        }
      }, delay)
    })
  }

  debouncedFn.cancel = () => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = null
    lastArgs = null
    lastResolve = null
    lastReject = null
  }

  debouncedFn.flush = async () => {
    if (timeoutId && lastArgs && lastResolve && lastReject) {
      clearTimeout(timeoutId)
      timeoutId = null
      const args = lastArgs
      const resolve = lastResolve
      const reject = lastReject
      lastArgs = null
      lastResolve = null
      lastReject = null
      try {
        const result = await fn(...args)
        resolve(result)
        return result
      } catch (error) {
        reject(error)
        throw error
      }
    }
    return Promise.resolve()
  }

  return debouncedFn as any
}

/**
 * 生成错误处理函数
 */
export const createErrorHandler = (
  onError?: (error: TableError) => void,
  enableLog: boolean = false
) => {
  const logger = {
    error: (message: string, ...args: any[]) => {
      if (enableLog) console.error(`[useTable] ${message}`, ...args)
    }
  }

  return (err: unknown, context: string): TableError => {
    const tableError: TableError = {
      code: 'UNKNOWN_ERROR',
      message: '未知错误',
      details: err
    }

    if (err instanceof Error) {
      tableError.message = err.message
      tableError.code = err.name
    } else if (typeof err === 'string') {
      tableError.message = err
    }

    logger.error(`${context}:`, err)
    onError?.(tableError)
    return tableError
  }
}

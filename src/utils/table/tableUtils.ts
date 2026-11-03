/** 表格响应、分页和错误处理。
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
  const page = response as { data: T[]; meta: { total: number; page: number; page_size: number } }
  return {
    records: page.data,
    total: page.meta.total,
    current: page.meta.page,
    size: page.meta.page_size
  }
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

  if (response.size !== undefined) pagination.size = response.size
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

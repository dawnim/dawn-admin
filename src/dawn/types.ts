import type { AxiosRequestConfig } from 'axios'
export interface Menu {
  type: 1 | 2 | 3 | 4
  key: string
  parent_key: string
  title: string
  path: string
  component?: string
  permission?: string
  icon?: string
  url?: string
  mode?: string
  keep_alive?: boolean
  fixed_tab?: boolean
  full_page?: boolean
  hidden?: boolean
  children?: Menu[]
}

export interface Column {
  prop: string
  label: string
  type?: 'text' | 'number' | 'password' | 'select' | 'date' | 'boolean' | 'textarea'
  /** 字典同时用于筛选、编辑和列表标签；未指定时使用原字段类型。 */
  dict?: string
  dictValueType?: 'number' | 'string'
  nullable?: boolean
  options?: { label: string; value: string | number }[]
  keep_alive?: boolean
  fixed_tab?: boolean
  full_page?: boolean
  hidden?: boolean
  readonly?: boolean
  required?: boolean
  maxlength?: number
  immutable?: boolean
  /** 指定后由 CrudPage 的同名 form 插槽渲染该字段控件。 */
  formSlot?: string
}

export function dateLabel(value: number) {
  return value ? new Date(value).toLocaleString() : ''
}

/** 列表请求使用snake_case，page从1开始，page_size不设固定上限。 */
export interface ListQuery {
  page?: number
  page_size?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  [key: string]: unknown
}
/** 保留服务端的真实记录、页码、每页条数和筛选总数。 */
export interface PageData<T = Record<string, any>> {
  data: T[]
  meta: { page: number; page_size: number; total: number }
}
/** update局部修改，replace完整替换，removeMany一次提交全部ID。 */
export interface CrudApi<
  T extends Record<string, any> = Record<string, any>,
  Create = Partial<T>,
  Update = Partial<Create>,
  Query extends ListQuery = ListQuery
> {
  list: (query?: Query, config?: AxiosRequestConfig) => Promise<PageData<T>>
  get: (id: string | number) => Promise<T>
  create: (input: Create) => Promise<T>
  update: (id: string | number, input: Update) => Promise<T>
  replace: (id: string | number, input: Create) => Promise<T>
  remove: (id: string | number) => Promise<void>
  removeMany: (ids: (string | number)[]) => Promise<void>
}
/** CSV导入结果，按实际处理的数据行计数。 */
export interface ImportResult {
  count: number
  updated: number
}

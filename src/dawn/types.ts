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
  options?: { label: string; value: string | number }[]
  keep_alive?: boolean
  fixed_tab?: boolean
  full_page?: boolean
  hidden?: boolean
  readonly?: boolean
  required?: boolean
  maxlength?: number
  immutable?: boolean
}

export function dateLabel(value: number) {
  return value ? new Date(value).toLocaleString() : ''
}

export interface PageData<T = Record<string, any>> {
  data: T[]
  total: number
  current_page: number
  per_page: number
}
export interface CrudApi {
  list: (params: Record<string, any>) => Promise<PageData>
  read: (id: string | number) => Promise<Record<string, any>>
  save: (data: Record<string, any>) => Promise<unknown>
  update: (data: Record<string, any>) => Promise<unknown>
  delete: (params: { ids: (string | number)[] }) => Promise<unknown>
}

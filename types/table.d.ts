import type { Ref, ComputedRef, DefineComponent } from 'vue'
import type { TableProps } from 'element-plus'
export interface Column {
  prop: string
  label: string
  type?: 'text' | 'number' | 'password' | 'select' | 'date' | 'boolean' | 'textarea'
  options?: { label: string; value: string | number }[]
  maxlength?: number
  hidden?: boolean
  readonly?: boolean
  required?: boolean
  immutable?: boolean
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
export interface TableColumn<T = Record<string, any>> {
  prop?: string
  label?: string
  type?: 'selection' | 'expand' | 'index' | 'globalIndex'
  width?: string | number
  minWidth?: string | number
  fixed?: boolean | 'left' | 'right'
  sortable?: boolean
  visible?: boolean
  useSlot?: boolean
  formatter?: (row: T) => unknown
  [key: string]: any
}
export interface Pagination {
  current: number
  size: number
  total: number
}
export const ArtTable: DefineComponent<
  Partial<TableProps<Record<string, any>>> & {
    columns?: TableColumn[]
    pagination?: Readonly<Pagination>
    loading?: boolean
  }
>
export const ArtTableHeader: DefineComponent<{
  columns?: TableColumn[]
  loading?: boolean
  layout?: string
  showSearchBar?: boolean
}>
export const DawnSearchBar: DefineComponent<{
  modelValue?: Record<string, any>
  showExpand?: boolean
  labelWidth?: string
  gutter?: number
}>
export const DawnButton: DefineComponent<{
  type?: 'primary' | 'secondary' | 'error' | 'info' | 'success'
  icon?: string
  toolTip?: string
}>
export const DawnImport: DefineComponent<{
  downloadUrl: string
  uploadUrl: string
  accept?: string
}>
export const DawnExport: DefineComponent<{ url: string; method?: string; fileName?: string }>
export function useAuth(): { hasAuth: (key: string) => boolean }
export function dateLabel(value: number): string
export function useAdmin(): {
  dialogType: Ref<string>
  dialogVisible: Ref<boolean>
  dialogData: Ref<Record<string, any>>
  selectedRows: Ref<Record<string, any>[]>
  showDialog: (type: string, row?: Record<string, any>) => void
  hideDialog: () => void
  handleSelectionChange: (rows: Record<string, any>[]) => void
  deleteRow: (
    row: Record<string, any>,
    apiFn: (params: any) => Promise<any>,
    callback?: () => void
  ) => void
  deleteSelectedRows: (apiFn: (params: any) => Promise<any>, callback?: () => void) => void
}
export function useTable<T = Record<string, any>>(config: {
  core: {
    apiFn: (params: any) => Promise<PageData<T>>
    columnsFactory: () => TableColumn<T>[]
    apiParams?: Record<string, any>
    immediate?: boolean
  }
  hooks?: {
    resetFormCallback?: () => void
    onSuccess?: (data: T[], response: any) => void
    onError?: (error: any) => void
  }
  performance?: { enableCache?: boolean; cacheTime?: number; debounceTime?: number }
}): {
  data: Ref<T[]>
  loading: Readonly<Ref<boolean>>
  columns: ComputedRef<TableColumn<T>[]>
  columnChecks: Ref<TableColumn<T>[]>
  searchParams: Record<string, any>
  pagination: Readonly<Pagination>
  getData: (params?: any) => Promise<any>
  resetSearchParams: () => void
  refreshData: () => Promise<any>
  refreshCreate: () => Promise<any>
  refreshUpdate: () => Promise<any>
  refreshRemove: () => Promise<any>
  handleSortChange: (sort: { prop: string; order: string | null }) => void
  handleSizeChange: (size: number) => void
  handleCurrentChange: (page: number) => void
}

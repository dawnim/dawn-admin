import type { AxiosRequestConfig } from 'axios'
import type { Ref, ComputedRef, DefineComponent } from 'vue'
import type { TableProps } from 'element-plus'
export interface Column {
  prop: string
  label: string
  type?: 'text' | 'number' | 'password' | 'select' | 'date' | 'boolean' | 'textarea'
  /** 字典同时用于筛选、编辑和列表标签；未指定时使用原字段类型。 */
  dict?: string
  dictValueType?: 'number' | 'string'
  nullable?: boolean
  options?: { label: string; value: string | number }[]
  maxlength?: number
  hidden?: boolean
  readonly?: boolean
  required?: boolean
  immutable?: boolean
  /** 指定后由 CrudPage 的同名 form 插槽渲染该字段控件。 */
  formSlot?: string
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
    columns?: TableColumn<any>[]
    pagination?: Readonly<Pagination>
    loading?: boolean
  }
>
export const ArtTableHeader: DefineComponent<{
  columns?: TableColumn<any>[]
  loading?: boolean
  layout?: string
  showSearchBar?: boolean
}>
export const DawnSearchBar: DefineComponent<{
  modelValue?: Record<string, any>
  showExpand?: boolean
  defaultExpanded?: boolean
  labelWidth?: string
  labelPosition?: 'left' | 'right' | 'top'
  gutter?: number
  showReset?: boolean
  showSearch?: boolean
  disabledSearch?: boolean
  onExpand?: (expanded: boolean) => void
  onReset?: () => void
  onSearch?: () => void
}>
export const DawnSelect: DefineComponent<{
  dict: string
  modelValue?: string | number | Array<string | number>
  valueType?: 'number' | 'string'
  placeholder?: string
  disabled?: boolean
  clearable?: boolean
  filterable?: boolean
  multiple?: boolean
  collapseTags?: boolean
  collapseTagsTooltip?: boolean
}>
export const DawnRadio: DefineComponent<{
  dict: string
  modelValue?: string | number
  valueType?: 'number' | 'string'
  type?: 'radio' | 'button' | 'border'
  disabled?: boolean
  size?: 'large' | 'default' | 'small'
  fill?: string
  textColor?: string
  allowNull?: boolean
  nullValue?: string | number
  nullLabel?: string
}>
export const DawnDict: DefineComponent<{
  dict: string
  value: string | number | string[] | number[]
  render?: string
  size?: 'large' | 'default' | 'small'
  round?: boolean
}>
export const DawnButton: DefineComponent<{
  type?: 'primary' | 'secondary' | 'error' | 'info' | 'success'
  icon?: string
  toolTip?: string
}>
/** CSV导入结果，按实际处理的数据行计数。 */
export interface ImportResult {
  count: number
  updated: number
}
export const DawnImport: DefineComponent<{
  title?: string
  width?: string | number
  downloadUrl?: string
  uploadUrl?: string
  accept?: string
  tip?: string
  onSuccess?: (result: ImportResult) => void
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
    apiFn: (params: any, config?: AxiosRequestConfig) => Promise<PageData<T>>
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
  getDataDebounced: (params?: any) => Promise<any>
  cancelRequest: () => void
  resetSearchParams: () => void
  refreshData: () => Promise<any>
  refreshCreate: () => Promise<any>
  refreshUpdate: () => Promise<any>
  refreshRemove: () => Promise<any>
  handleSortChange: (sort: { prop: string; order: string | null }) => void
  handleSizeChange: (size: number) => void
  handleCurrentChange: (page: number) => void
}

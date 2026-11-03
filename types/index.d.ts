import type { App, Component, DefineComponent } from 'vue'
import type { AxiosRequestConfig } from 'axios'

export interface Options {
  apiBase?: string
  wsURL?: string
  title?: string
  logo?: string
  favicon?: string
  header?: { before?: Component; after?: Component; right?: Component }
  messages?: Record<string, Record<string, unknown>>
  pages?: Record<string, () => Promise<{ default: Component } | Component>>
}
export type { Column, CrudApi, PageData, ListQuery } from './table'
export * from './table'
import type { Column, CrudApi, ListQuery } from './table'
export interface RequestConfig extends AxiosRequestConfig {
  /** 保留第三方接口的原始响应结构。 */
  rawResponse?: boolean
  showErrorMessage?: boolean
  showSuccessMessage?: boolean
}
export const request: {
  get<T = unknown>(config: RequestConfig): Promise<T>
  post<T = unknown>(config: RequestConfig): Promise<T>
  patch<T = unknown>(config: RequestConfig): Promise<T>
  put<T = unknown>(config: RequestConfig): Promise<T>
  del<T = unknown>(config: RequestConfig): Promise<T>
  request<T = unknown>(config: RequestConfig): Promise<T>
}
export function createAdmin(options?: Options): App
export const CrudPage: DefineComponent<{
  resource?: string
  api?: CrudApi<any, any, any>
  permission?: string
  columns: Column[]
  search?: string[]
  defaults?: Record<string, unknown>
  editable?: boolean
  exportable?: boolean
  importable?: boolean
  onChange?: () => void
}>
export const Upload: DefineComponent<{ categoryId?: number }>
export interface RealtimeMessage<T = unknown> {
  type: string
  id?: string
  channel?: string
  data?: T
  request_id?: string
}
export type RealtimeHandler = (message: RealtimeMessage) => Promise<void> | void
export const realtime: {
  status: Readonly<import('vue').Ref<'closed' | 'connecting' | 'ready'>>
  on(type: string, handler: RealtimeHandler): () => void
  send(message: Record<string, unknown>): void
  request<T = unknown>(type: string, data?: unknown, timeout?: number): Promise<T>
  subscribe(channel: string): void
  unsubscribe(channel: string): void
}
export function openChat(user?: {
  id: number
  username: string
  realname?: string
  avatar?: string
}): void

export const Dashboard: DefineComponent
export const StatisticsDashboard: DefineComponent
export const WorkDashboard: DefineComponent

export interface ChartProps {
  height?: string
  loading?: boolean
  isEmpty?: boolean
  colors?: string[]
  data: number[] | { name: string; data: number[] }[]
  xAxisData?: string[]
  showAxisLabel?: boolean
  showAxisLine?: boolean
  showSplitLine?: boolean
  showTooltip?: boolean
  showLegend?: boolean
  legendPosition?: 'bottom' | 'top' | 'left' | 'right'
}
export const ArtBarChart: DefineComponent<
  ChartProps & { barWidth?: string | number; stack?: boolean; borderRadius?: number | number[] }
>
export const ArtLineChart: DefineComponent<
  ChartProps & {
    lineWidth?: number
    showAreaColor?: boolean
    smooth?: boolean
    symbol?: 'circle' | 'rect' | 'roundRect' | 'triangle' | 'diamond' | 'pin' | 'arrow' | 'none'
    symbolSize?: number
    animationDelay?: number
  }
>
export const ArtCountTo: DefineComponent<{
  target: number
  duration?: number
  autoStart?: boolean
  decimals?: number
  decimal?: string
  separator?: string
  prefix?: string
  suffix?: string
  disabled?: boolean
}>
export const ArtSvgIcon: DefineComponent<{ icon?: string }>

export function createResourceApi<
  T extends Record<string, any> = Record<string, any>,
  Create = Partial<T>,
  Update = Partial<Create>,
  Query extends ListQuery = ListQuery
>(path: string): import('./table').CrudApi<T, Create, Update, Query>

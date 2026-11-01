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
export type { Column, CrudApi, PageData } from './table'
export * from './table'
import type { Column, CrudApi } from './table'
export interface RequestConfig extends AxiosRequestConfig {
  showErrorMessage?: boolean
  showSuccessMessage?: boolean
}
export const request: {
  get<T = unknown>(config: RequestConfig): Promise<T>
  post<T = unknown>(config: RequestConfig): Promise<T>
  put<T = unknown>(config: RequestConfig): Promise<T>
  del<T = unknown>(config: RequestConfig): Promise<T>
  request<T = unknown>(config: RequestConfig): Promise<T>
}
export function createAdmin(options?: Options): App
export const CrudPage: DefineComponent<{
  resource?: string
  api?: CrudApi
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
export function connectRealtime(
  onMessage: (message: {
    type: string
    id?: string
    channel?: string
    data?: unknown
    request_id?: string
  }) => Promise<void> | void
): { send(message: Record<string, unknown>): void; close(): void }

export const Dashboard: import('vue').DefineComponent

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

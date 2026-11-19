import type { App, Component, DefineComponent } from 'vue'
import type { AxiosRequestConfig } from 'axios'

export interface Options {
  apiBase?: string
  wsURL?: string
  title?: string
  logo?: string
  favicon?: string
  header?: { before?: Component; after?: Component; right?: Component }
  support?: { customerInfo?: Component }
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
  actionWidth?: number
  formWidth?: string | number
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

export function renderChatMarkdown(text: string): string
export function renderMarkdown(text: string): string
export function enhanceMarkdown(root: HTMLElement): void
export type EditorView = 'write' | 'live' | 'preview'
export type EditorFormat = 'moment' | 'post'
export interface MentionItem { label: string; value: string }
export interface EditorConfig { hidden?: string[] }
export interface EditorImage { id: string | number; url: string; name?: string }
export type ImageTarget = 'body' | 'gallery' | 'choose'
export interface EditorImageLibrary {
  list: (keyword?: string) => Promise<EditorImage[]>
  refresh?: () => void
}
export interface EditorImageUploader {
  fingerprint?: (file: File) => Promise<{ md5?: string; sha256?: string }>
  check?: (files: File[], prints: { md5?: string; sha256?: string }[]) => Promise<(EditorImage | null)[]>
  upload: (files: File[], prints: { md5?: string; sha256?: string }[]) => Promise<EditorImage[]>
  toMarkdown?: (image: EditorImage, name: string) => string
}
export interface EditorTool {
  key: string
  title: string | [string, string]
  icon?: string
  where?: 'toolbar' | 'attachments' | 'both'
  onClick: (ctx: { editor: MarkdownEditor; anchor: HTMLElement }) => void
}
export interface EditorOptions {
  render: (text: string) => string
  enhance?: (root: HTMLElement) => void
  upload?: (files: File[], insert: (text: string) => void) => void
  mentions?: (query: string) => Promise<MentionItem[]>
  config?: () => EditorConfig
  previewImage?: (src: string) => void
  onChange?: (text: string) => void
  onSaveDraft?: () => void
  locale?: 'zh' | 'en'
  value?: string
  format?: EditorFormat
  maxLength?: number
  /** 后台管理场景：动态格式也保留完整工具栏与预览。 */
  alwaysFull?: boolean
  imageLibrary?: EditorImageLibrary
  imageUploader?: EditorImageUploader
  imageTarget?: ImageTarget
  onImagesChange?: (ids: (string | number)[]) => void
  maxImages?: number
  customTools?: EditorTool[]
  attachmentHost?: HTMLElement
}
export interface MarkdownEditor {
  getValue(): string
  setValue(text: string): void
  insertText(text: string): void
  setOptions(options: Partial<Pick<EditorOptions, 'format' | 'maxLength' | 'locale' | 'config' | 'render' | 'alwaysFull' | 'imageTarget' | 'maxImages'>>): void
  focus(): void
  getImages(): (string | number)[]
  setImages(images: EditorImage[]): void
  openImageLibrary(anchor?: HTMLElement): void
  destroy(): void
}
export function createMarkdownEditor(root: HTMLElement, options: EditorOptions): MarkdownEditor
export function editorTemplate(locale?: 'zh' | 'en'): string
export function renderEditorIcons(root: ParentNode): void

export function createResourceApi<
  T extends Record<string, any> = Record<string, any>,
  Create = Partial<T>,
  Update = Partial<Create>,
  Query extends ListQuery = ListQuery
>(
  path: string,
  writeConfig?: AxiosRequestConfig
): import('./table').CrudApi<T, Create, Update, Query>

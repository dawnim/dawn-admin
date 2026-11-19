export type EditorView = 'write' | 'live' | 'preview'

export interface MentionItem {
  label: string
  value: string
}

export interface EditorConfig {
  hidden?: string[]
}

/** Image with a URL suitable for the default Markdown insertion. */
export interface EditorImage {
  id: string | number
  url: string
  name?: string
}
export interface EditorImageLibrary {
  list: (keyword?: string) => Promise<EditorImage[]>
  refresh?: () => void
}
export interface EditorImageUploader {
  /** 摘要由业务定（官网 md5+sha256 秒传），内核不算也不假设。 */
  fingerprint?: (file: File) => Promise<{ md5?: string; sha256?: string }>
  /** 秒传检查，与 files 一一对应；不提供则全部走 upload。 */
  check?: (
    files: File[],
    prints: { md5?: string; sha256?: string }[]
  ) => Promise<(EditorImage | null)[]>
  upload: (files: File[], prints: { md5?: string; sha256?: string }[]) => Promise<EditorImage[]>
  toMarkdown?: (image: EditorImage, name: string) => string
}
/** Toolbar extension supplied by the application. */
export interface EditorTool {
  key: string
  title: string | [string, string]
  icon?: string
  onClick: (ctx: { editor: MarkdownEditor; anchor: HTMLElement }) => void
}

export interface EditorOptions {
  /** Markdown 渲染规则（业务方言）。 */
  render: (text: string) => string
  /** 预览渲染后的 DOM 增强。 */
  enhance?: (root: HTMLElement) => void
  /** @ 候选查询。 */
  mentions?: (query: string) => Promise<MentionItem[]>
  /** 后台配置：需要隐藏的工具栏项。 */
  config?: () => EditorConfig
  /** 预览里点击图片。 */
  previewImage?: (src: string) => void
  /** 正文变化。 */
  onChange?: (text: string) => void
  /** Cmd/Ctrl+S 保存草稿。 */
  onSaveDraft?: () => void
  locale?: 'zh' | 'en'
  placeholder?: string
  value?: string
  compact?: boolean
  maxLength?: number
  imageLibrary?: EditorImageLibrary
  imageUploader?: EditorImageUploader
  pasteImages?: boolean
  mediaMarkup?: (url: string, type: 'audio' | 'video' | 'iframe') => string
  customTools?: EditorTool[]
}

export interface MarkdownEditor {
  getValue(): string
  setValue(text: string): void
  insertText(text: string | ((selected: string) => string)): void
  setOptions(options: Partial<Omit<EditorOptions, 'value'>>): void
  focus(): void
  destroy(): void
}
export function createMarkdownEditor(root: HTMLElement, options: EditorOptions): MarkdownEditor
export function editorTemplate(locale?: 'zh' | 'en'): string
export function renderEditorIcons(root: ParentNode): void
export function renderMarkdown(text: string): string
export function enhanceMarkdown(root: HTMLElement): void

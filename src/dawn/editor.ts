/**
 * 框架提供的完整 Markdown 编辑器：自带 Rhex 原版皮肤（DOM 模板 + CSS + 图标）、
 * 17 项工具栏、三视图、行号、选区浮动条、表格网格、弹层、@ 候选、快捷键与全屏。
 *
 * 官网已有同款静态 DOM 时直接接管，后台用 editorTemplate() 生成同款皮肤。
 * 表情数据内置（emoji-data.ts），不依赖后台配置；只有真正需要业务参与的能力
 * 通过 options 注入：render / upload / mentions / config / previewImage /
 * onChange / onSaveDraft。
 */

import { EMOJI_GROUPS, EMOJI_NAMES } from './emoji-data'

export type EditorView = 'write' | 'live' | 'preview'
export type EditorFormat = 'moment' | 'post'

export interface MentionItem {
  label: string
  value: string
}

export interface EditorConfig {
  hidden?: string[]
}

/** 已经入库的图片。url 只用于展示；保存时只用 id，绝不把 url 再上传一次。 */
export interface EditorImage {
  id: string | number
  url: string
  name?: string
}
export type ImageTarget = 'body' | 'gallery' | 'choose'
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
/** 自定义工具按钮：可放工具栏、下方附件区或两处都放。 */
export interface EditorTool {
  key: string
  title: string | [string, string]
  icon?: string
  where?: 'toolbar' | 'attachments' | 'both'
  onClick: (ctx: { editor: MarkdownEditor; anchor: HTMLElement }) => void
}

export interface EditorOptions {
  /** Markdown 渲染规则（业务方言）。 */
  render: (text: string) => string
  /** 预览渲染后的 DOM 增强。 */
  enhance?: (root: HTMLElement) => void
  /** 图片上传：业务自行上传，用 insert 把标记插回选区。 */
  upload?: (files: File[], insert: (text: string) => void) => void
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
  value?: string
  format?: EditorFormat
  maxLength?: number
  /** 后台管理场景：动态格式也保留完整工具栏与预览（官网保持 Rhex 1:1 行为）。 */
  alwaysFull?: boolean
  /** 以下图片能力全部可选：一个都不接时，图片按钮仍是旧版「直接选文件」。 */
  imageLibrary?: EditorImageLibrary
  imageUploader?: EditorImageUploader
  /** 图片落点：body=插正文，gallery=仅进下方附件区，choose=浮层里二选一。 */
  imageTarget?: ImageTarget
  onImagesChange?: (ids: (string | number)[]) => void
  maxImages?: number
  customTools?: EditorTool[]
  /** 附件区宿主；同一页面有多个编辑器时必须各自指定，否则会抢同一个容器。 */
  attachmentHost?: HTMLElement
}

export interface MarkdownEditor {
  getValue(): string
  setValue(text: string): void
  insertText(text: string): void
  setOptions(
    options: Partial<
      Pick<
        EditorOptions,
        | 'format'
        | 'maxLength'
        | 'locale'
        | 'config'
        | 'render'
        | 'alwaysFull'
        | 'imageTarget'
        | 'maxImages'
      >
    >
  ): void
  focus(): void
  /** 本文已引用的图片 id（正文 + 附件区，去重）。 */
  getImages(): (string | number)[]
  /** 编辑已有内容时回填附件区（不会重新上传）。 */
  setImages(images: EditorImage[]): void
  openImageLibrary(anchor?: HTMLElement): void
  destroy(): void
}

const ICONS: Record<string, string> = {
  underline: '<path d="M6 5v5a6 6 0 0 0 12 0V5M5 20h14"/>',
  strike: '<path d="M6 6c1-2 4-2 6-1 2 1 5 0 6-1M4 12h16M7 18c2 2 5 2 7 1 2-1 3-1 4-1"/>',
  highlight: '<path d="m7 14 6-6 4 4-6 6H7v-4ZM5 20h14"/>',
  code: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/>',
  quote: '<path d="M7 17H4v-4a4 4 0 0 1 4-4v3H7v5Zm10 0h-3v-4a4 4 0 0 1 4-4v3h-1v5Z"/>',
  spoiler:
    '<path d="M3 12s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6Z"/><circle cx="12" cy="12" r="2"/><path d="m4 4 16 16"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
  link: '<path d="m10 13 4-4m-7 6-1 1a4 4 0 0 0 6 6l4-4a4 4 0 0 0 0-6m1-3 1-1a4 4 0 0 0-6-6L8 6a4 4 0 0 0 0 6"/>',
  table: '<rect x="4" y="5" width="16" height="14" rx="1"/><path d="M4 10h16M10 5v14"/>',
  divider: '<path d="M4 12h16"/><path d="M8 8h8M8 16h8"/>',
  align: '<path d="M5 6h14M5 10h10M5 14h14M5 18h10"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3"/>',
  smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14s1 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
  image:
    '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4m0 3h.01"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>'
}

/** 全屏 / 退出全屏：四角展开与收起，替换原来的 ↗ 文本箭头（官网静态 DOM 也会被接管）。 */
// 进入/退出必须是两套一眼能分辨的图形：进入是四角向外扩张，退出是
// 「四角向内收 + 中间一个小窗口框」。之前两个 path 只是同一四角 L 形的反向
// 绘制，肉眼看几乎一样，用户分不清当前状态。
const FULLSCREEN_ICONS = {
  enter:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3H5a2 2 0 0 0-2 2v4M15 3h4a2 2 0 0 1 2 2v4M9 21H5a2 2 0 0 1-2-2v-4M15 21h4a2 2 0 0 0 2-2v-4"/></svg>',
  exit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M4 8V5a1 1 0 0 1 1-1h3M20 8V5a1 1 0 0 0-1-1h-3M4 16v3a1 1 0 0 0 1 1h3M20 16v3a1 1 0 0 1-1 1h-3"/></svg>'
}

const TEXT: Record<string, [string, string]> = {
  正文: ['正文', 'Write'],
  实时预览: ['实时预览', 'Live preview'],
  预览: ['预览', 'Preview'],
  一级标题: ['一级标题', 'Heading 1'],
  二级标题: ['二级标题', 'Heading 2'],
  三级标题: ['三级标题', 'Heading 3'],
  行内代码: ['行内代码', 'Inline code'],
  代码块: ['代码块', 'Code block'],
  无序列表: ['无序列表', 'Bullet list'],
  星号列表: ['星号列表', 'Star list'],
  有序列表: ['有序列表', 'Numbered list'],
  待办列表: ['待办列表', 'Task list'],
  左对齐: ['左对齐', 'Align left'],
  居中: ['居中', 'Align center'],
  右对齐: ['右对齐', 'Align right'],
  可折叠剧透: ['可折叠剧透', 'Collapsible spoiler'],
  点击遮罩: ['点击遮罩', 'Click to reveal'],
  插入链接: ['插入链接', 'Insert link'],
  链接文字: ['链接文字', 'Link text'],
  链接地址: ['链接地址', 'Link URL'],
  链接说明: ['填写链接文本和链接地址。', 'Fill in the link text and URL.'],
  链接建议: [
    '建议输入完整链接，例如 https://example.com',
    'Prefer a full URL, e.g. https://example.com'
  ],
  插入表格: ['插入表格', 'Insert table'],
  表格尺寸提示: [
    '选择表格尺寸，点击即可插入对应行列的表格。',
    'Choose a size, then click to insert a table.'
  ],
  直接点击目标尺寸: ['直接点击目标尺寸即可插入表格。', 'Click a cell to insert the table.'],
  插入媒体: ['插入媒体', 'Insert media'],
  填写音频或视频地址: ['填写音频或视频地址', 'Enter an audio or video URL'],
  媒体地址: ['媒体地址', 'Media URL'],
  媒体说明: [
    '粘贴视频或音频地址，编辑器会插入可解析媒体标记。',
    'Paste a video or audio URL to insert a media marker.'
  ],
  媒体提示空: [
    '粘贴视频或音频地址，将插入可解析媒体标记。',
    'Paste a video or audio URL to insert a media marker.'
  ],
  媒体提示视频: [
    '已识别为视频地址，将按 video 标签渲染',
    'Detected a video URL; will render as <video>'
  ],
  媒体提示音频: [
    '已识别为音频地址，将按 audio 标签渲染',
    'Detected an audio URL; will render as <audio>'
  ],
  媒体提示站点: [
    '已识别为站点媒体链接，将按 iframe 渲染',
    'Detected an embed URL; will render as iframe'
  ],
  媒体提示兜底: [
    '无法判断直链格式，将按 iframe 渲染',
    'Unknown direct link format; will render as iframe'
  ],
  媒体提示无效: ['请输入有效的媒体地址', 'Enter a valid media URL'],
  插入剧透: ['插入剧透', 'Insert spoiler'],
  选择剧透样式: ['选择剧透样式', 'Choose a spoiler style'],
  剧透说明: [
    '选择折叠剧透块，或原位点击显示的遮罩内容。',
    'Choose a collapsible spoiler block or an inline click-to-reveal mask.'
  ],
  可折叠剧透说明: ['插入 :::spoiler 标题 ... ::: 结构。', 'Inserts :::spoiler Title ... :::'],
  点击遮罩说明: [
    '插入 !!内容!!，默认遮住文字，点击后原位显示。',
    'Inserts !!text!!, hidden until clicked.'
  ],
  选择表情: ['选择表情', 'Choose an emoji'],
  Markdown帮助: ['Markdown 帮助', 'Markdown help'],
  取消: ['取消', 'Cancel'],
  插入: ['插入', 'Insert'],
  我的图片: ['我的图片', 'My images'],
  上传: ['上传', 'Upload'],
  搜索图片: ['搜索图片', 'Search images'],
  图片说明: ['选一张已上传的图，或上传新图', 'Pick an uploaded image or add a new one'],
  暂无图片: ['还没有上传过图片', 'No uploaded images yet'],
  图片加载失败: ['图片加载失败', 'Could not load images'],
  重试: ['重试', 'Retry'],
  点击或拖入图片: ['点击选择、拖入或粘贴图片', 'Click, drop or paste images'],
  图片数量上限: ['图片数量已达上限', 'Image limit reached'],
  仅图片: ['仅支持 JPG / PNG / GIF / WebP 图片', 'Only JPG / PNG / GIF / WebP images'],
  插正文: ['插入正文', 'Insert into text'],
  加入附件: ['仅加入下方', 'Add to gallery'],
  正在上传: ['上传中…', 'Uploading…'],
  上传失败: ['上传失败', 'Upload failed'],
  移除: ['移除', 'Remove'],
  关闭: ['关闭', 'Close'],
  复制: ['复制', 'Copy'],
  已复制: ['已复制', 'Copied'],
  文本: ['文本', 'text'],
  代码: ['代码', 'code'],
  高亮内容: ['高亮内容', 'highlighted text'],
  链接文字占位: ['链接文字', 'Link'],
  剧透提示: ['剧透提示', 'Spoiler'],
  这里填写需要折叠显示的内容: ['这里填写需要折叠显示的内容', 'Hidden content'],
  这里填写需要点击显示的内容: ['这里填写需要点击显示的内容', 'Click to reveal'],
  列: ['列 ', 'Col '],
  内容: ['内容 ', 'Item '],
  退出全屏: ['退出全屏', 'Exit fullscreen'],
  进入全屏: ['进入全屏', 'Fullscreen'],
  标题层级: ['标题层级', 'Heading'],
  加粗: ['加粗', 'Bold'],
  下划线: ['下划线', 'Underline'],
  删除线: ['删除线', 'Strike'],
  高亮: ['高亮', 'Highlight'],
  代码格式: ['代码格式', 'Code'],
  引用: ['引用', 'Quote'],
  剧透: ['剧透', 'Spoiler'],
  列表格式: ['列表格式', 'List'],
  分割线: ['分割线', 'Divider'],
  内容对齐: ['内容对齐', 'Alignment'],
  表情: ['表情', 'Emoji'],
  添加图片: ['添加图片', 'Add image'],
  最近使用: ['最近使用', 'Recently used'],
  暂无最近使用的表情: ['暂无最近使用的表情', 'No recent emoji yet'],
  关闭表情面板: ['关闭表情面板', 'Close emoji picker'],
  笑脸与人像: ['笑脸与人像', 'Smileys & People'],
  动物与自然: ['动物与自然', 'Animals & Nature'],
  食物与饮品: ['食物与饮品', 'Food & Drink'],
  活动: ['活动', 'Activities'],
  旅行与地点: ['旅行与地点', 'Travel & Places'],
  物品: ['物品', 'Objects'],
  符号: ['符号', 'Symbols'],
  旗帜: ['旗帜', 'Flags']
}

const TOOL_KEYS = [
  'heading',
  'bold',
  'underline',
  'strike',
  'highlight',
  'code',
  'quote',
  'spoiler',
  'list',
  'link',
  'table',
  'divider',
  'alignment',
  'media',
  'emoji',
  'image',
  'help'
]

/** 原版 Rhex 里这四项是锚定工具栏按钮的浮层（不是模态弹窗），help 才是模态。 */
const PANEL_NAMES = ['link', 'table', 'media', 'spoiler', 'image'] as const
type PanelName = (typeof PANEL_NAMES)[number]
const PANEL_WIDTH: Record<PanelName, number> = {
  link: 320,
  table: 292,
  media: 320,
  spoiler: 300,
  image: 360
}
const PANEL_TOOL_KEYS = [...PANEL_NAMES, 'emoji'] as string[]
let editorSeq = 0

const TIPS: Record<string, [string, string, string]> = {
  标题层级: [
    '⌘/Ctrl+1-6',
    '快速切换标题等级或恢复正文',
    'Switch heading level or restore body text'
  ],
  加粗: ['⌘/Ctrl+B', '将选中文本加粗', 'Bold the selected text'],
  下划线: ['⌘/Ctrl+U', '插入下划线格式', 'Insert underline formatting'],
  删除线: ['⌘/Ctrl+Shift+5', '插入删除线格式', 'Insert strike formatting'],
  高亮: ['⌘/Ctrl+Shift+H', '插入高亮格式', 'Insert highlight formatting'],
  代码格式: ['⌘/Ctrl+Shift+`', '选择行内代码或代码块', 'Choose inline code or a code block'],
  引用: ['⌘/Ctrl+Shift+Q', '将当前段落变为引用', 'Turn the current paragraph into a quote'],
  剧透: ['', '选择可折叠剧透或点击遮罩', 'Choose a collapsible spoiler or click mask'],
  列表格式: [
    '⌘/Ctrl+Shift+L/O',
    '选择无序、有序或待办列表',
    'Choose bullet, numbered or task lists'
  ],
  插入链接: ['⌘/Ctrl+K', '填写链接文字和地址', 'Fill in link text and URL'],
  插入表格: ['⌘/Ctrl+T', '选择表格行列后插入', 'Choose table size and insert it'],
  分割线: ['', '插入 Markdown 分割线', 'Insert a Markdown divider'],
  内容对齐: ['⌘/Ctrl+Alt+L', '选择左对齐、居中或右对齐', 'Choose left, center or right alignment'],
  插入媒体: ['', '插入音频或视频地址', 'Insert an audio or video URL'],
  表情: ['', '打开内置表情面板，按分组插入表情', 'Open the built-in emoji picker'],
  添加图片: ['⌘/Ctrl+Shift+I', '上传图片并插入正文', 'Upload and insert an image'],
  Markdown帮助: ['', '查看语法、快捷键和扩展说明', 'View syntax, shortcuts and extensions']
}

function helpSections(en: boolean): [string, string][] {
  return en
    ? [
        [
          'Shortcuts',
          '| Action | Shortcut |\n| --- | --- |\n| Bold / italic / underline | Cmd/Ctrl+B / I / U |\n| Strike / highlight | Cmd/Ctrl+Shift+5 / H |\n| Link / code block | Cmd/Ctrl+K / Shift+K |\n| Heading / body | Cmd/Ctrl+1-6 / 0 |\n| Quote / lists | Cmd/Ctrl+Shift+Q / L / O |\n| Inline code / table | Cmd/Ctrl+Shift+` / T |\n| Math / block math / center | Cmd/Ctrl+Alt+M / Shift+M / Alt+L |\n| Image / save draft | Cmd/Ctrl+Shift+I / S |\n| Continue list / indent | Enter / Tab / Shift+Tab |\n| Move table row | Alt+Up / Down |'
        ],
        [
          'Basic formatting',
          '- **Bold** `**text**`, *italic* `*text*`, ~~strike~~ `~~text~~`\n- ==highlight== `==text==`, ++inserted++ `++text++`\n- <u>underline</u> `<u>text</u>`, superscript `x^2^`, subscript `H~2~O`\n- Inline code `` `const value = 1` ``'
        ],
        [
          'Headings, lists and alignment',
          '```md\n# Heading 1\n## Heading 2\n\n- Bullet list\n1. Numbered list\n- [ ] Task\n- [x] Done\n\n<center>Centered</center>\n<p align="right">Right aligned</p>\n```\n\n`Enter` continues a list; `Tab` / `Shift+Tab` changes its level.'
        ],
        [
          'Code, math and diagrams',
          '````md\n```ts\nexport const sum = (a: number, b: number) => a + b\n```\n\nInline math $E = mc^2$ and block math:\n\n$$\n\\int_0^1 x^2 \\, dx\n$$\n\n```mermaid\ngraph TD\n  A[Start] --> B{Decision}\n```\n````'
        ],
        [
          'Callouts and spoilers',
          '```md\n:::info Reading tip\nSome context.\n:::\n\n:::warning Careful\nA risk note.\n:::\n\n:::spoiler Spoiler\nCollapsed content.\n:::\n\n!!Click to reveal!!\n```\n\n`tip`, `danger` and `success` are also available.'
        ],
        [
          'Links, images, tables and quotes',
          '```md\n> A quote\n\n[Link](https://example.com)\n![Image](attachment://123)\n\n| Col 1 | Col 2 |\n| --- | --- |\n| A | B |\n```\n\nImages use the Dawn upload endpoint; `Alt+Up/Down` moves a table row. Footnotes `text[^1]` and abbreviations `*[HTML]: HyperText Markup Language` work too.'
        ],
        [
          'Emoji, media and mentions',
          '- Click the smiley toolbar button to open the built-in picker: 1,900+ Unicode emoji in eight groups, plus recently used. Selecting one inserts the emoji itself and keeps the picker open for multiple picks.\n- Hand-written shortcodes `:smile:` still work, and custom shortcodes can be configured in the admin panel\n- Media markers `MEDIA::video::https://...`, `MEDIA::audio::https://...`, `MEDIA::iframe::https://...`\n- `@username` opens a suggestion panel and renders as a user link'
        ]
      ]
    : [
        [
          '快捷键总览',
          '| 功能 | 快捷键 |\n| --- | --- |\n| 加粗 / 斜体 / 下划线 | Cmd/Ctrl+B / I / U |\n| 删除线 / 高亮 | Cmd/Ctrl+Shift+5 / H |\n| 链接 / 代码块 | Cmd/Ctrl+K / Shift+K |\n| 标题 / 正文 | Cmd/Ctrl+1-6 / 0 |\n| 引用 / 列表 | Cmd/Ctrl+Shift+Q / L / O |\n| 行内代码 / 表格 | Cmd/Ctrl+Shift+` / T |\n| 公式 / 块公式 / 居中 | Cmd/Ctrl+Alt+M / Shift+M / Alt+L |\n| 图片 / 保存草稿 | Cmd/Ctrl+Shift+I / S |\n| 续写列表 / 调层级 | Enter / Tab / Shift+Tab |\n| 表格行上下移动 | Alt+↑ / ↓ |'
        ],
        [
          '基础文本格式',
          '- **加粗** `**文本**`、*斜体* `*文本*`、~~删除线~~ `~~文本~~`\n- ==高亮== `==文本==`、++插入++ `++文本++`\n- <u>下划线</u> `<u>文本</u>`、上标 `x^2^`、下标 `H~2~O`\n- 行内代码 `` `const value = 1` ``'
        ],
        [
          '标题、列表与对齐',
          '```md\n# 一级标题\n## 二级标题\n\n- 无序列表\n1. 有序列表\n- [ ] 待办任务\n- [x] 已完成\n\n<center>居中内容</center>\n<p align="right">右对齐</p>\n```\n\n`Enter` 续写列表，`Tab` / `Shift+Tab` 调整层级。'
        ],
        [
          '代码、公式与图表',
          '````md\n```ts\nexport const sum = (a: number, b: number) => a + b\n```\n\n行内公式 $E = mc^2$，块级公式：\n\n$$\n\\int_0^1 x^2 \\, dx\n$$\n\n```mermaid\ngraph TD\n  A[开始] --> B{判断}\n```\n````'
        ],
        [
          '提示块与剧透',
          '```md\n:::info 阅读提示\n这里是说明内容。\n:::\n\n:::warning 注意\n风险提示。\n:::\n\n:::spoiler 剧透提示\n默认折叠的内容。\n:::\n\n!!点击后显示!!\n```\n\n提示块还支持 `tip`、`danger`、`success`。'
        ],
        [
          '链接、图片、表格与引用',
          '```md\n> 这里是一段引用\n\n[链接](https://example.com)\n![图片](attachment://123)\n\n| 列 1 | 列 2 |\n| --- | --- |\n| 内容 A | 内容 B |\n```\n\n图片走 Dawn 统一上传接口；表格行内 `Alt+↑/↓` 可移动行。脚注 `文字[^1]` 与缩写 `*[HTML]: HyperText Markup Language` 同样可用。'
        ],
        [
          '表情、媒体与提及',
          '- 点击工具栏笑脸按钮打开内置表情面板：1900+ 个 Unicode 表情按 8 组分类，另有「最近使用」；点选直接插入表情字符，面板不关闭可连续插入\n- 手写短码 `:smile:` 仍有效，后台可配置自定义短码（兼容旧内容）\n- 媒体标记 `MEDIA::video::https://...`、`MEDIA::audio::https://...`、`MEDIA::iframe::https://...`\n- iframe 仅放行 Bilibili、网易云、YouTube、腾讯视频等站点\n- `@用户名` 会触发候选面板并渲染成用户链接'
        ]
      ]
}

/** 编辑器自带皮肤：与官网 index.html 的静态 DOM 结构完全一致。 */
export function editorTemplate(locale: 'zh' | 'en' = 'zh'): string {
  const L = (key: string) => TEXT[key]?.[locale === 'en' ? 1 : 0] ?? key
  const ic = (name: string) => `<span data-icon="${name}"></span>`
  const label = (key: string) => `<span data-label="${key}">${L(key)}</span>`
  return `
<div class="compose-editor-shell" data-editor-shell>
  <div class="editor-head" data-editor-tabs><div class="editor-tabs"><button type="button" class="active" data-editor-view="write">${L('正文')}</button><button type="button" data-editor-view="live">${L('实时预览')}</button><button type="button" data-editor-view="preview">${L('预览')}</button></div><span class="editor-length" data-editor-length>0 / 300</span><button class="editor-icon" type="button" data-editor-fullscreen data-title="进入全屏">${FULLSCREEN_ICONS.enter}</button></div>
  <div class="compose-editor" data-editor-body><div class="editor-lines" data-editor-lines aria-hidden="true"></div><textarea data-editor-input maxlength="300" required rows="6" spellcheck="false"></textarea><div class="markdown-body markdown-preview" data-editor-preview hidden></div><div class="editor-selection-bar" data-editor-selection hidden><button type="button" data-editor-command="bold"><b>B</b></button><button type="button" data-editor-command="italic"><i>I</i></button><button type="button" data-editor-command="underline"><u>U</u></button><button type="button" data-editor-command="highlight">H</button><button type="button" data-editor-command="code" data-value="inline">&lt;/&gt;</button></div><div class="editor-mention-panel" data-editor-mentions hidden></div></div>
  <div class="editor-toolbar" data-editor-toolbar>
    <div class="editor-tool-dropdown"><button type="button" class="editor-tool" data-editor-menu="heading" data-title="标题层级"><span class="editor-heading-label">H1</span><i>⌄</i></button><div class="editor-menu" data-editor-menu-panel="heading"><button type="button" data-editor-command="heading" data-value="1">H1 ${label('一级标题')}</button><button type="button" data-editor-command="heading" data-value="2">H2 ${label('二级标题')}</button><button type="button" data-editor-command="heading" data-value="3">H3 ${label('三级标题')}</button></div></div>
    <button type="button" class="editor-tool" data-editor-command="bold" data-title="加粗"><b>B</b></button>
    <button type="button" class="editor-tool" data-editor-command="underline" data-title="下划线">${ic('underline')}</button>
    <button type="button" class="editor-tool" data-editor-command="strike" data-title="删除线">${ic('strike')}</button>
    <button type="button" class="editor-tool" data-editor-command="highlight" data-title="高亮">${ic('highlight')}</button>
    <div class="editor-tool-dropdown"><button type="button" class="editor-tool" data-editor-menu="code" data-title="代码格式">${ic('code')}<i>⌄</i></button><div class="editor-menu" data-editor-menu-panel="code"><button type="button" data-editor-command="code" data-value="inline" data-label="行内代码">${L('行内代码')}</button><button type="button" data-editor-command="code" data-value="block" data-label="代码块">${L('代码块')}</button></div></div>
    <button type="button" class="editor-tool" data-editor-command="quote" data-title="引用">${ic('quote')}</button>
    <button type="button" class="editor-tool" data-editor-command="spoiler" data-title="剧透">${ic('spoiler')}</button>
    <div class="editor-tool-dropdown"><button type="button" class="editor-tool" data-editor-menu="list" data-title="列表格式">${ic('list')}<i>⌄</i></button><div class="editor-menu" data-editor-menu-panel="list"><button type="button" data-editor-command="list" data-value="unordered" data-label="无序列表">${L('无序列表')}</button><button type="button" data-editor-command="list" data-value="star" data-label="星号列表">${L('星号列表')}</button><button type="button" data-editor-command="list" data-value="ordered" data-label="有序列表">${L('有序列表')}</button><button type="button" data-editor-command="list" data-value="task" data-label="待办列表">${L('待办列表')}</button></div></div>
    <button type="button" class="editor-tool" data-editor-command="link" data-title="插入链接">${ic('link')}</button>
    <button type="button" class="editor-tool" data-editor-command="table" data-title="插入表格">${ic('table')}</button>
    <button type="button" class="editor-tool" data-editor-command="divider" data-title="分割线">${ic('divider')}</button>
    <div class="editor-tool-dropdown"><button type="button" class="editor-tool" data-editor-menu="align" data-title="内容对齐">${ic('align')}<i>⌄</i></button><div class="editor-menu" data-editor-menu-panel="align"><button type="button" data-editor-command="align" data-value="left" data-label="左对齐">${L('左对齐')}</button><button type="button" data-editor-command="align" data-value="center" data-label="居中">${L('居中')}</button><button type="button" data-editor-command="align" data-value="right" data-label="右对齐">${L('右对齐')}</button></div></div>
    <button type="button" class="editor-tool" data-editor-command="media" data-title="插入媒体">${ic('video')}</button>
    <button type="button" class="editor-tool" data-editor-command="emoji" data-title="表情">${ic('smile')}</button>
    <button type="button" class="editor-tool" data-editor-command="image" data-editor-image data-title="添加图片">${ic('image')}</button>
    <button type="button" class="editor-tool" data-editor-command="help" data-title="Markdown帮助">${ic('help')}</button>
  </div>
  <input class="editor-files" data-editor-files type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple hidden>
</div>
<dialog class="editor-help-dialog" data-editor-help><div class="dialog-head"><h2 data-label="Markdown帮助">${L('Markdown帮助')}</h2><button type="button" data-help-close data-title="关闭">${ic('close')}</button></div><div class="editor-help-content markdown-body" data-help-content></div></dialog>`
}

/**
 * 原版 Rhex 的 link/table/media/spoiler 是锚定按钮的浮层（FloatingEditorPanel），
 * 不是居中 modal：无遮罩、无右上角 ×，点按钮切换、点外部/ESC 关闭、同时只开一个。
 * 官网发帖框是原生 <dialog>，浮层必须挂进同一个 dialog 才不会被 top layer 压住；
 * 后台挂在 body 上，避免被 ElDialog 的 overflow 裁剪。DOM 由内核统一生成，
 * 官网与后台共用一份，静态 HTML 里不再放这四块。
 */
function panelMarkup(name: PanelName, locale: 'zh' | 'en'): string {
  const L = (key: string) => TEXT[key]?.[locale === 'en' ? 1 : 0] ?? key
  const head = (title: string, desc: string) =>
    `<div class="editor-popover-head"><strong data-label="${title}">${L(title)}</strong><small data-label="${desc}">${L(desc)}</small></div>`
  const actions = () =>
    `<div class="editor-panel-actions"><button type="button" data-panel-action="cancel" class="editor-popover-cancel" data-label="取消">${L('取消')}</button><button type="button" data-panel-action="default" class="primary" data-label="插入" disabled>${L('插入')}</button></div>`
  switch (name) {
    case 'link':
      return `${head('插入链接', '链接说明')}<div class="editor-popover-fields"><input id="editor-link-text" data-link-text type="text" placeholder="${L('链接文字')}" autocomplete="off"><input id="editor-link-url" data-link-url type="url" placeholder="https://example.com" autocomplete="off"></div><p class="editor-popover-hint" data-link-hint></p>${actions()}`
    case 'table':
      return `<div class="editor-popover-head"><strong data-label="插入表格">${L('插入表格')}</strong><small id="editor-table-hint" data-table-hint data-label="表格尺寸提示">${L('表格尺寸提示')}</small></div><div class="editor-table-grid" id="editor-table-grid" data-table-grid></div><div class="editor-panel-actions"><span class="editor-table-size"><span data-icon="table"></span><span id="editor-table-size" data-table-size data-label="直接点击目标尺寸">${L('直接点击目标尺寸')}</span></span><button type="button" data-panel-action="cancel" class="editor-popover-cancel" data-label="取消">${L('取消')}</button></div>`
    case 'media':
      return `${head('插入媒体', '媒体说明')}<div class="editor-popover-fields"><input id="editor-media-url" data-media-url type="url" placeholder="https://example.com/video.mp4" autocomplete="off"></div><p class="editor-popover-hint" data-media-hint data-label="媒体提示空">${L('媒体提示空')}</p>${actions()}`
    case 'spoiler':
      return `${head('插入剧透', '剧透说明')}<div class="editor-choice-list"><button type="button" data-editor-command="spoiler-block"><strong data-label="可折叠剧透">${L('可折叠剧透')}</strong><small data-label="可折叠剧透说明">${L('可折叠剧透说明')}</small></button><button type="button" data-editor-command="spoiler-mask"><strong data-label="点击遮罩">${L('点击遮罩')}</strong><small data-label="点击遮罩说明">${L('点击遮罩说明')}</small></button></div>`
    case 'image':
      return `${head('我的图片', '图片说明')}<div class="editor-image-toolbar"><input type="search" data-library-search placeholder="${L('搜索图片')}" autocomplete="off"><button type="button" class="editor-image-upload" data-library-upload data-label="上传">${L('上传')}</button></div><div class="editor-image-target" data-library-target hidden><button type="button" class="active" data-library-mode="body" data-label="插正文">${L('插正文')}</button><button type="button" data-library-mode="gallery" data-label="加入附件">${L('加入附件')}</button></div><div class="editor-image-grid" data-library-grid></div><p class="editor-popover-hint" data-library-hint></p>`
    default:
      return ''
  }
}

/** 把 [data-icon] 占位渲染成内置 SVG。 */
export function renderEditorIcons(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>('[data-icon]').forEach((node) => {
    if (node.querySelector('svg')) return
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    for (const [key, value] of Object.entries({
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '1.65',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'aria-hidden': 'true'
    }))
      svg.setAttribute(key, value)
    svg.innerHTML = ICONS[node.dataset.icon!] || ''
    node.replaceChildren(svg)
  })
}

export function createMarkdownEditor(root: HTMLElement, options: EditorOptions): MarkdownEditor {
  let opts: EditorOptions = { locale: 'zh', format: 'moment', maxLength: 300, ...options }
  const events = new AbortController()
  const on = (target: EventTarget | null, type: string, fn: (event: any) => void) =>
    target?.addEventListener(type, fn, { signal: events.signal })

  // 官网已有同款静态 DOM 时直接接管；后台用内置模板生成同款皮肤。
  const adopted =
    root.matches('.compose-editor-shell') || !!root.querySelector('.compose-editor-shell')
  if (!adopted) root.innerHTML = editorTemplate(opts.locale)
  renderEditorIcons(root)
  document.querySelectorAll<HTMLElement>('.editor-help-dialog').forEach(renderEditorIcons)
  root.classList.add('dawn-editor')

  // 兼容官网静态 DOM（固定 id）与内置模板（data-*），选择器一次覆盖两种宿主。
  const el = <T extends Element = HTMLElement>(selector: string): T =>
    (root.querySelector<T>(selector) || document.querySelector<T>(selector)) as T
  const shell = root.matches('.compose-editor-shell')
    ? root
    : el<HTMLElement>('.compose-editor-shell')
  const body = el<HTMLElement>('[data-editor-body], .compose-editor, #moment-editor')
  const input = el<HTMLTextAreaElement>('[data-editor-input], #moment-content')
  const lines = el<HTMLElement>('[data-editor-lines], .editor-lines, #moment-lines')
  const preview = el<HTMLElement>('[data-editor-preview], .markdown-preview, #moment-preview')
  const toolbar = el<HTMLElement>('[data-editor-toolbar], .editor-toolbar, #moment-toolbar')
  const tabs = el<HTMLElement>('[data-editor-tabs], .editor-head, #moment-editor-tabs')
  const length = el<HTMLElement>('[data-editor-length], .editor-length, #moment-length')
  const selectionBar = el<HTMLElement>(
    '[data-editor-selection], .editor-selection-bar, #editor-selection-bar'
  )
  const mentionPanel = el<HTMLElement>(
    '[data-editor-mentions], .editor-mention-panel, #editor-mention-panel'
  )
  const files = el<HTMLInputElement>('[data-editor-files], .editor-files, #moment-editor-files')
  const fullscreen = el<HTMLElement>('[data-editor-fullscreen], #moment-fullscreen')
  // 浮层宿主：官网在原生 <dialog> 内（top layer），后台挂 body 避免被 ElDialog 裁剪。
  const layer = (root.closest('dialog') || document.body) as HTMLElement
  const panelNodes = {} as Record<PanelName, HTMLElement>
  const instance = ++editorSeq
  for (const name of PANEL_NAMES) {
    const node = document.createElement('div')
    node.className = 'editor-panel editor-popover'
    node.id = instance === 1 ? `editor-${name}-dialog` : `editor-${name}-dialog-${instance}`
    node.dataset.editorPanel = name
    node.hidden = true
    node.innerHTML = panelMarkup(name, opts.locale || 'zh')
    layer.append(node)
    renderEditorIcons(node)
    panelNodes[name] = node
  }
  const panels = PANEL_NAMES.map((name) => panelNodes[name])
  if (selectionBar) layer.append(selectionBar)
  // help 是模态弹窗：动态模板用自己 root 内那份，官网静态 DOM 用唯一的固定 id。
  // 以前动态模板也写死同一个 id，多个编辑器实例会互相抢弹窗。
  const ownHelp = root.querySelector<HTMLDialogElement>('[data-editor-help]')
  if (ownHelp && !ownHelp.id) {
    // 后台只有一个实例时沿用固定 id；官网已有静态那份就顺延，保证 id 全局唯一。
    ownHelp.id = document.getElementById('editor-help-dialog')
      ? `editor-help-dialog-${instance}`
      : 'editor-help-dialog'
  }
  const helpDialog = (ownHelp ||
    document.getElementById('editor-help-dialog') ||
    document.querySelector<HTMLDialogElement>('.editor-help-dialog')) as HTMLDialogElement | null
  const grid = panelNodes.table.querySelector<HTMLElement>('[data-table-grid]')!
  const inPanel = (name: PanelName, selector: string) =>
    panelNodes[name].querySelector<HTMLElement>(selector)

  const t = (key: string) => TEXT[key]?.[opts.locale === 'en' ? 1 : 0] ?? key
  const config = () => opts.config?.() || {}
  // 官网按内容形式决定精简/完整；后台 alwaysFull 时两种格式都给完整编辑器。
  const isPost = () => opts.format === 'post' || !!opts.alwaysFull
  let view: EditorView = 'write'
  let selection = { start: 0, end: 0 }
  let mentionTimer: ReturnType<typeof setTimeout> | undefined
  let destroyed = false

  // ── 图片能力：provider 全可选；一个都不接时图片按钮仍是旧版「直接选文件」 ──
  type Attachment = {
    ref: number
    name: string
    url: string
    file?: File
    blob: boolean
    status: 'pending' | 'done' | 'error'
    target: 'body' | 'gallery'
    record?: EditorImage
  }
  const ACCEPTED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  const attachments: Attachment[] = []
  let refSeq = 0
  let panelAnchor: HTMLElement | null = null
  let libraryMode: 'body' | 'gallery' = 'body'
  const attachBar = (opts.attachmentHost ||
    Object.assign(document.createElement('div'), {
      className: 'editor-attachments'
    })) as HTMLElement
  attachBar.classList.add('editor-attachments')
  if (!attachBar.parentElement) shell.append(attachBar)
  const ownAttachBar = !opts.attachmentHost
  const imagePanel = () => panelNodes.image
  const enabledImages = () => !!(opts.imageLibrary || opts.imageUploader)
  const imageTarget = (): 'body' | 'gallery' =>
    opts.imageTarget === 'gallery'
      ? 'gallery'
      : opts.imageTarget === 'choose'
        ? libraryMode
        : 'body'
  const imageMarkdown = (image: EditorImage, name: string) =>
    (
      opts.imageUploader?.toMarkdown ||
      ((i, n) => `![${n || i.name || 'image'}](attachment://${i.id})`)
    )(image, name)
  const toolLabel = (tool: EditorTool) =>
    Array.isArray(tool.title) ? tool.title[opts.locale === 'en' ? 1 : 0] : tool.title

  function emitImages() {
    const ids = [
      ...new Set(
        attachments.filter((a) => a.status === 'done' && a.record).map((a) => String(a.record!.id))
      )
    ]
    opts.onImagesChange?.(ids.map((id) => (/^\d+$/.test(id) ? Number(id) : id)))
  }
  function renderCustomTools(where: 'toolbar' | 'attachments') {
    const host = where === 'toolbar' ? toolbar : attachBar
    host
      ?.querySelectorAll(`[data-editor-tool][data-editor-where="${where}"]`)
      .forEach((node) => node.remove())
    const hidden = config().hidden || []
    for (const tool of opts.customTools || []) {
      const place = tool.where || 'toolbar'
      if ((place !== where && place !== 'both') || hidden.includes(tool.key)) continue
      const button = document.createElement('button')
      button.type = 'button'
      button.className =
        where === 'toolbar' ? 'editor-tool editor-custom-tool' : 'editor-custom-tool'
      button.dataset.editorTool = tool.key
      button.dataset.editorWhere = where
      button.title = toolLabel(tool)
      button.ariaLabel = button.title
      button.innerHTML = tool.icon?.startsWith('<')
        ? tool.icon
        : `<span data-icon="${tool.icon || 'plus'}"></span>`
      renderEditorIcons(button)
      button.onclick = () => tool.onClick({ editor: api, anchor: button })
      host?.append(button)
    }
  }
  function renderAttachments() {
    attachBar.replaceChildren()
    for (const item of attachments) {
      const cell = document.createElement('div')
      cell.className = `editor-attachment ${item.status}`
      const image = document.createElement('img')
      image.src = item.url
      image.alt = item.name
      image.onclick = () => opts.previewImage?.(item.record?.url || item.url)
      const remove = document.createElement('button')
      remove.type = 'button'
      remove.className = 'editor-attachment-remove'
      remove.title = t('移除')
      remove.textContent = '×'
      remove.onclick = () => removeAttachment(item.ref)
      const label = document.createElement('small')
      label.textContent =
        item.status === 'pending'
          ? t('正在上传')
          : item.status === 'error'
            ? t('上传失败')
            : item.name
      cell.append(image, remove, label)
      attachBar.append(cell)
    }
    const add = document.createElement('button')
    add.type = 'button'
    add.className = 'editor-attachment-add'
    add.dataset.editorLibrary = '1'
    add.title = t('点击或拖入图片')
    add.textContent = '+'
    add.onclick = (event) => {
      event.stopPropagation()
      openImageLibrary(add)
    }
    attachBar.append(add)
    renderCustomTools('attachments')
    attachBar.hidden =
      !enabledImages() && !(opts.customTools || []).some((tool) => tool.where !== 'toolbar')
  }
  function removeAttachment(ref: number) {
    const index = attachments.findIndex((item) => item.ref === ref)
    if (index < 0) return
    const [item] = attachments.splice(index, 1)
    if (item.blob) URL.revokeObjectURL(item.url)
    if (item.record && item.target === 'body') {
      const marker = `attachment://${item.record.id}`
      input.value = input.value
        .split('\n')
        .filter((line) => !(line.includes('![') && line.includes(marker)))
        .join('\n')
      changed()
    }
    emitImages()
    renderAttachments()
  }
  function addFiles(list: File[]) {
    saveSelection()
    const limit = Math.max(0, (opts.maxImages ?? 9) - attachments.length)
    const picked = list.filter((file) => ACCEPTED.includes(file.type)).slice(0, limit)
    if (!picked.length) return
    const items: Attachment[] = picked.map((file) => ({
      ref: ++refSeq,
      name:
        file.name ||
        `Clipboard_Screenshot_${Date.now()}.${file.type === 'image/png' ? 'png' : 'jpg'}`,
      file,
      url: URL.createObjectURL(file),
      blob: true,
      status: 'pending',
      target: imageTarget()
    }))
    attachments.push(...items)
    renderAttachments()
    // 没接 uploader 时保持旧契约：业务自己决定何时上传、插什么文本。
    if (!opts.imageUploader) {
      opts.upload?.(
        items.map((item) => item.file!),
        (text) => insert(text)
      )
      return
    }
    void uploadItems(items, { ...selection })
  }
  async function uploadItems(items: Attachment[], saved: { start: number; end: number }) {
    const up = opts.imageUploader!
    try {
      const prints = []
      for (const item of items) prints.push(up.fingerprint ? await up.fingerprint(item.file!) : {})
      const hits = up.check
        ? await up.check(
            items.map((item) => item.file!),
            prints
          )
        : items.map(() => null)
      const missing = items.filter((_, index) => !hits[index])
      const fresh = missing.length
        ? await up.upload(
            missing.map((item) => item.file!),
            prints.filter((_, index) => !hits[index])
          )
        : []
      let cursor = 0
      items.forEach((item, index) => {
        const record = hits[index] || fresh[cursor++]
        if (!record) {
          item.status = 'error'
          return
        }
        if (item.blob) URL.revokeObjectURL(item.url)
        item.record = record
        item.url = record.url
        item.blob = false
        item.status = 'done'
      })
      const text = items
        .filter((item) => item.status === 'done' && item.target === 'body')
        .map((item) => imageMarkdown(item.record!, item.name))
        .join('\n')
      if (text) {
        selection = saved
        insert(text)
      }
      opts.imageLibrary?.refresh?.()
    } catch {
      items.forEach((item) => {
        item.status = 'error'
      })
    }
    emitImages()
    renderAttachments()
  }
  function pickLibraryImage(record: EditorImage, target: 'body' | 'gallery') {
    const item: Attachment = {
      ref: ++refSeq,
      name: record.name || '',
      url: record.url,
      status: 'done',
      target,
      record,
      blob: false
    }
    attachments.push(item)
    if (target === 'body') {
      saveSelection()
      insert(imageMarkdown(record, item.name))
    }
    emitImages()
    renderAttachments()
    closeFloatingPanels()
  }
  async function loadLibrary(keyword = '') {
    const grid = imagePanel().querySelector<HTMLElement>('[data-library-grid]')!
    const hint = imagePanel().querySelector<HTMLElement>('[data-library-hint]')!
    grid.replaceChildren()
    hint.textContent = ''
    if (!opts.imageLibrary) {
      hint.textContent = t('暂无图片')
      return
    }
    try {
      const rows = await opts.imageLibrary.list(keyword)
      if (!rows.length) {
        hint.textContent = t('暂无图片')
        return
      }
      for (const row of rows) {
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'editor-library-item'
        const image = document.createElement('img')
        image.src = row.url
        image.alt = row.name || ''
        button.title = row.name || ''
        button.append(image)
        button.onclick = () => pickLibraryImage(row, imageTarget())
        grid.append(button)
      }
    } catch {
      hint.textContent = t('图片加载失败')
    }
    // 网格是异步填充的，面板高度会变；不重新定位会盖住触发它的按钮。
    if (!imagePanel().hidden) positionPanel('image')
  }
  function openImageLibrary(anchor?: HTMLElement) {
    if (!enabledImages()) {
      files.click()
      return
    }
    panelAnchor = anchor || null
    openPanel('image')
  }
  /** 编辑已有内容时回填附件区：只有 id/url，没有 File，绝不触发上传。 */
  function setImages(images: EditorImage[]) {
    attachments.splice(
      0,
      attachments.length,
      ...images.map((image) => ({
        ref: ++refSeq,
        name: image.name || '',
        url: image.url,
        status: 'done' as const,
        target: 'gallery' as const,
        record: image,
        blob: false
      }))
    )
    renderAttachments()
    emitImages()
  }

  const api: MarkdownEditor = {
    getValue: () => input.value,
    setValue(text) {
      input.value = text || ''
      changed()
    },
    insertText(text) {
      insert(text)
    },
    setOptions(next) {
      opts = { ...opts, ...next }
      applyOptions()
    },
    focus: () => input.focus(),
    getImages: () => [
      ...new Set(
        attachments
          .filter((item) => item.status === 'done' && item.record)
          .map((item) => item.record!.id)
      )
    ],
    setImages,
    openImageLibrary,
    destroy() {
      if (destroyed) return
      destroyed = true
      clearTimeout(mentionTimer)
      closePanels()
      events.abort()
      panels.forEach((node) => node.remove())
      emojiPanel.remove()
      selectionBar?.remove()
      attachments.forEach((item) => {
        if (item.blob) URL.revokeObjectURL(item.url)
      })
      root.querySelectorAll('[data-editor-tool]').forEach((node) => node.remove())
      if (ownAttachBar) attachBar.remove()
      else attachBar.replaceChildren()
    }
  }

  input.value = opts.value || ''

  function saveSelection() {
    selection = { start: input.selectionStart, end: input.selectionEnd }
  }
  function state() {
    return { value: input.value, start: selection.start, end: selection.end }
  }
  function replace(
    transform: (selected: string, state: { value: string; start: number; end: number }) => string
  ) {
    const s = state()
    const next = transform(s.value.slice(s.start, s.end), s)
    input.value = `${s.value.slice(0, s.start)}${next}${s.value.slice(s.end)}`
    const cursor = s.start + next.length
    input.setSelectionRange(cursor, cursor)
    selection = { start: cursor, end: cursor }
    changed()
    input.focus()
  }
  const insert = (template: string | ((selected: string) => string)) =>
    replace((selected) => (typeof template === 'function' ? template(selected) : template))
  function selectLine() {
    const s = state()
    if (s.start !== s.end) return
    const start = s.value.lastIndexOf('\n', Math.max(0, s.start - 1)) + 1
    const end = s.value.indexOf('\n', s.start)
    selection = { start, end: end < 0 ? s.value.length : end }
  }
  function linePrefix(prefix: string) {
    selectLine()
    replace((selected) =>
      (selected || '')
        .split('\n')
        .map((line) => `${prefix}${line}`)
        .join('\n')
    )
  }
  function heading(level: number) {
    selectLine()
    replace((selected, s) => {
      const end = s.value.indexOf('\n', s.start)
      const current =
        selected ||
        s.value.slice(
          s.value.lastIndexOf('\n', Math.max(0, s.start - 1)) + 1,
          end < 0 ? s.value.length : end
        )
      return current
        .split('\n')
        .map(
          (line) => `${level ? `${'#'.repeat(level)} ` : ''}${line.replace(/^\s*#{1,6}\s*/, '')}`
        )
        .join('\n')
    })
    syncHeadingMenu()
  }
  function list(type: string) {
    if (type === 'ordered') {
      selectLine()
      replace((selected) =>
        (selected || '')
          .split('\n')
          .map((line, index) => `${index + 1}. ${line}`)
          .join('\n')
      )
      return
    }
    linePrefix(type === 'task' ? '- [ ] ' : type === 'star' ? '* ' : '- ')
  }
  function align(type: string) {
    selectLine()
    replace((selected) =>
      type === 'center'
        ? `<center>${selected || t('文本')}</center>`
        : `<p align="${type}">${selected || t('文本')}</p>`
    )
  }
  function buildTable(rows: number, columns: number) {
    const row = (prefix: string) =>
      `| ${Array.from({ length: columns }, (_, i) => `${prefix}${i + 1}`).join(' | ')} |`
    return `\n\n${[row(t('列')), `| ${Array(columns).fill('---').join(' | ')} |`, ...Array.from({ length: rows }, (_, i) => row(`${t('内容')}${i + 1}-`))].join('\n')}\n\n`
  }
  function syncLines() {
    lines.textContent = Array.from(
      { length: input.value.split('\n').length },
      (_, i) => i + 1
    ).join('\n')
    lines.scrollTop = input.scrollTop
  }
  function syncLength() {
    length.textContent = `${Array.from(input.value).length} / ${opts.maxLength || 0}`
  }
  /** 用隐藏镜像量出选区在视口里的位置，原版的选区浮动条是跟随文本而不是钉在左上角。 */
  function selectionRect() {
    const start = input.selectionStart
    const end = input.selectionEnd
    if (start >= end) return null
    const cs = getComputedStyle(input)
    const mirror = document.createElement('div')
    const keys = [
      'fontFamily',
      'fontSize',
      'fontWeight',
      'fontStyle',
      'lineHeight',
      'letterSpacing',
      'paddingTop',
      'paddingRight',
      'paddingBottom',
      'paddingLeft',
      'borderTopWidth',
      'borderLeftWidth',
      'boxSizing',
      'tabSize'
    ]
    keys.forEach((key) => ((mirror.style as any)[key] = (cs as any)[key] || ''))
    mirror.style.position = 'fixed'
    mirror.style.top = '0'
    mirror.style.left = '-99999px'
    mirror.style.visibility = 'hidden'
    mirror.style.whiteSpace = 'pre-wrap'
    mirror.style.overflowWrap = 'break-word'
    mirror.style.width = `${input.clientWidth || 320}px`
    mirror.textContent = input.value.slice(0, start)
    const marker = document.createElement('span')
    marker.textContent = input.value.slice(start, end) || '\u200b'
    mirror.append(marker)
    layer.append(mirror)
    const base = mirror.getBoundingClientRect()
    const rect = marker.getBoundingClientRect()
    const box = input.getBoundingClientRect()
    const result = {
      top: box.top + (rect.top - base.top) - input.scrollTop,
      bottom: box.top + (rect.bottom - base.top) - input.scrollTop,
      left: box.left + (rect.left - base.left) - input.scrollLeft,
      right: box.left + (rect.right - base.left) - input.scrollLeft
    }
    mirror.remove()
    return result
  }
  function syncSelectionBar() {
    if (!selectionBar) return
    const show = isPost() && input.selectionStart !== input.selectionEnd
    const rect = show ? selectionRect() : null
    selectionBar.hidden = !rect
    if (!rect) return
    const width = selectionBar.offsetWidth || 210
    const height = selectionBar.offsetHeight || 34
    const padding = 8
    const gap = 10
    const center = (rect.left + rect.right) / 2
    const maxLeft = Math.max(padding + width / 2, innerWidth - padding - width / 2)
    const left = Math.min(Math.max(center, padding + width / 2), maxLeft)
    const above = rect.top - height - gap > padding
    selectionBar.style.left = `${left}px`
    selectionBar.style.top = `${above ? rect.top - gap : rect.bottom + gap}px`
    selectionBar.style.transform = above ? 'translate(-50%, -100%)' : 'translate(-50%, 0)'
  }
  function syncHeadingMenu() {
    const s = state()
    const start = s.value.lastIndexOf('\n', Math.max(0, s.start - 1)) + 1
    const end = s.value.indexOf('\n', s.start)
    const line = s.value.slice(start, end < 0 ? s.value.length : end)
    const level = line.match(/^\s*(#{1,6})\s/)?.[1].length || 1
    const label = root.querySelector<HTMLElement>('.editor-heading-label')
    if (label) label.textContent = `H${Math.min(3, level)}`
    root
      .querySelectorAll<HTMLElement>('[data-editor-menu-panel="heading"] [data-value]')
      .forEach((b) => b.classList.toggle('active', Number(b.dataset.value) === Math.min(3, level)))
  }
  function renderPreview() {
    preview.innerHTML = opts.render(input.value)
    preview
      .querySelectorAll<HTMLElement>('[data-md-mask]')
      .forEach((mask) => (mask.onclick = () => mask.classList.toggle('revealed')))
    preview
      .querySelectorAll<HTMLImageElement>('img')
      .forEach((image) => (image.onclick = () => opts.previewImage?.(image.src)))
    opts.enhance?.(preview)
  }
  function changed() {
    syncLines()
    syncLength()
    syncSelectionBar()
    if (isPost()) renderPreview()
    opts.onChange?.(input.value)
  }
  function setView(next: EditorView) {
    view = next
    shell.classList.remove('view-write', 'view-live', 'view-preview')
    shell.classList.add(`view-${next}`)
    root
      .querySelectorAll<HTMLElement>('[data-editor-view]')
      .forEach((b) => b.classList.toggle('active', b.dataset.editorView === next))
    input.hidden = next === 'preview'
    preview.hidden = next === 'write' || !isPost()
    if (next !== 'write' && isPost()) renderPreview()
  }
  /** 统一处理全屏状态：类名、提示文案与图标一起切换，避免 ESC 退出后图标不还原。 */
  function setFullscreen(full: boolean) {
    shell.classList.toggle('fullscreen', full)
    if (!fullscreen) return
    const key = full ? '退出全屏' : '进入全屏'
    fullscreen.dataset.title = key
    fullscreen.title = t(key)
    fullscreen.ariaLabel = t(key)
    fullscreen.innerHTML = full ? FULLSCREEN_ICONS.exit : FULLSCREEN_ICONS.enter
  }
  function applyOptions() {
    shell.classList.toggle('post', isPost())
    body.classList.toggle('post', isPost())
    tabs.hidden = !isPost()
    toolbar.hidden = !isPost()
    // 切回「动态」精简模式时工具栏会消失，浮层失去锚点会被重定位到视口左上角；
    // 这里主动收起，避免留下一个脱离工具栏的悬空面板。
    if (!isPost()) {
      closeFloatingPanels()
      closeEmoji()
    }
    if (opts.maxLength) input.maxLength = opts.maxLength
    else input.removeAttribute('maxlength')
    const hidden = config().hidden || []
    toolbar.querySelectorAll<HTMLElement>('.editor-tool').forEach((button, index) => {
      button.hidden = hidden.includes(TOOL_KEYS[index] || '')
    })
    // 浮层挂在 root 外（官网在原生 dialog 内、后台在 body），语言包要一起覆盖。
    const scopes: ParentNode[] = [root, ...panels]
    scopes.forEach((scope) =>
      scope
        .querySelectorAll<HTMLElement>('[data-label]')
        .forEach((node) => (node.textContent = t(node.dataset.label!)))
    )
    root.querySelectorAll<HTMLElement>('[data-title]').forEach((node) => {
      const label = t(node.dataset.title!)
      node.ariaLabel = label
      // 工具栏用富提示气泡，其余按钮（全屏、帮助关闭）沿用官网的原生 title。
      if (!node.classList.contains('editor-tool')) node.title = label
    })
    localizeEmojiPanel()
    resetTable()
    syncLinkHint()
    syncMediaHint()
    syncLength()
    syncLines()
    renderCustomTools('toolbar')
    renderAttachments()
    setView(isPost() ? view : 'write')
  }
  function syncToolActive() {
    PANEL_TOOL_KEYS.forEach((key) => {
      const open = key === 'emoji' ? !emojiPanel.hidden : !panelNodes[key as PanelName].hidden
      toolbar
        ?.querySelector<HTMLElement>(`[data-editor-command="${key}"]`)
        ?.classList.toggle('active', open)
    })
  }
  function closeFloatingPanels(except?: PanelName) {
    PANEL_NAMES.forEach((name) => {
      if (name === except) return
      const node = panelNodes[name]
      if (node.hidden) return
      node.hidden = true
      // 原版关闭浮层会清掉草稿，下次打开不残留上一次的输入。
      if (name === 'link' || name === 'media')
        node.querySelectorAll<HTMLInputElement>('input').forEach((field) => (field.value = ''))
      if (name === 'table') resetTable()
    })
    syncToolActive()
  }
  /** 与原版 updateFloatingPanelPosition 一致：锚定按钮，上方空间更宽裕时往上弹。 */
  function positionPanel(name: PanelName) {
    const node = panelNodes[name]
    const button = (
      name === 'image' && panelAnchor
        ? panelAnchor
        : toolbar?.querySelector<HTMLElement>(`[data-editor-command="${name}"]`)
    ) as HTMLElement | null
    if (node.hidden || !button) return
    const buttonRect = button.getBoundingClientRect()
    // 按钮被隐藏时（例如格式切换的瞬间）退回到编辑器主体，避免浮层跳到视口左上角。
    const rect = buttonRect.width && buttonRect.height ? buttonRect : shell.getBoundingClientRect()
    const padding = 12
    const gap = 12
    const width = Math.min(PANEL_WIDTH[name], innerWidth - padding * 2)
    node.style.width = `${width}px`
    node.style.maxHeight = ''
    const height = node.offsetHeight || 240
    const above = Math.max(120, rect.top - padding - gap)
    const below = Math.max(120, innerHeight - rect.bottom - padding - gap)
    const placeAbove = (above > below && height <= above) || (above > below && below < 180)
    const maxHeight = Math.max(120, Math.min(placeAbove ? above : below, innerHeight - padding * 2))
    const panelHeight = Math.min(height, maxHeight)
    node.style.maxHeight = `${maxHeight}px`
    const rawTop = placeAbove ? rect.top - gap - panelHeight : rect.bottom + gap
    node.style.top = `${Math.min(Math.max(rawTop, padding), Math.max(padding, innerHeight - panelHeight - padding))}px`
    node.style.left = `${Math.min(Math.max(rect.left, padding), Math.max(padding, innerWidth - width - padding))}px`
  }
  function positionFloatingPanels() {
    PANEL_NAMES.forEach((name) => positionPanel(name))
    positionEmojiPanel()
    syncSelectionBar()
  }
  function openPanel(name: PanelName | 'help') {
    if (name === 'help') {
      closeFloatingPanels()
      closeEmoji()
      renderHelp()
      helpDialog?.showModal()
      return
    }
    const node = panelNodes[name]
    const wasOpen = !node.hidden
    closeEmoji()
    closeFloatingPanels()
    closeMenus()
    if (wasOpen) return // 再点一次同一个按钮收起
    saveSelection()
    if (name === 'link') prefillLink()
    if (name === 'media') syncMediaHint()
    node.hidden = false
    if (name === 'image') {
      const targetRow = node.querySelector<HTMLElement>('[data-library-target]')!
      targetRow.hidden = opts.imageTarget !== 'choose'
      libraryMode = opts.imageTarget === 'gallery' ? 'gallery' : 'body'
      targetRow
        .querySelectorAll<HTMLElement>('[data-library-mode]')
        .forEach((button) =>
          button.classList.toggle('active', button.dataset.libraryMode === libraryMode)
        )
      void loadLibrary()
    }
    syncToolActive()
    positionPanel(name)
  }
  function closePanels() {
    closeFloatingPanels()
    closeEmoji()
    if (helpDialog?.open) helpDialog.close()
  }
  function renderHelp() {
    const en = opts.locale === 'en'
    const title = en ? 'Markdown editor help' : 'Markdown 编辑帮助'
    const intro = en
      ? 'The editor supports CommonMark, code highlighting, task lists, spoilers, emoji and media markers. Toolbar, shortcuts and preview use the same rules.'
      : '编辑器支持 CommonMark、代码高亮、任务列表、剧透、表情和媒体标记。工具栏、快捷键和预览使用同一套规则。'
    const content = helpDialog?.querySelector<HTMLElement>(
      '[data-help-content], #editor-help-content'
    )
    if (!content) return
    content.innerHTML = `<h1>${title}</h1><blockquote>${intro}</blockquote>${helpSections(en)
      .map(
        ([name, body]) =>
          `<h2>${name}</h2><div class="editor-help-markdown">${opts.render(body)}</div>`
      )
      .join('')}`
    content.querySelectorAll('pre').forEach((pre) => {
      const code = pre.textContent || ''
      const button = document.createElement('button')
      button.className = 'editor-copy'
      button.type = 'button'
      button.textContent = t('复制')
      button.onclick = async () => {
        await navigator.clipboard?.writeText(code)
        button.textContent = t('已复制')
        setTimeout(() => (button.textContent = t('复制')), 1200)
      }
      pre.append(button)
    })
  }

  // 表情面板：内核自带完整数据，浮层锚定工具栏按钮。官网挂原生 dialog 内，
  // 避免被 top layer 遮挡；后台没有原生 dialog，挂 body 并靠 z-index 浮在上层。
  const emojiButton = el<HTMLElement>('[data-editor-command="emoji"]')
  const emojiPanel = document.createElement('div')
  emojiPanel.className = 'editor-emoji-popover'
  emojiPanel.dataset.emojiPanel = ''
  emojiPanel.hidden = true
  // Telegram 式连续列表：所有分组共用一个滚动容器，分组标题是 sticky 锚点，
  // 底部 tab 随滚动高亮，点 tab 直接跳到对应锚点（不再按组重新渲染）。
  emojiPanel.innerHTML = `<div class="editor-emoji-head"><button type="button" class="editor-emoji-close" data-emoji-close><span data-icon="close"></span></button></div><div class="editor-emoji-scroll" data-emoji-scroll></div><div class="editor-emoji-tabs" data-emoji-tabs></div>`
  layer.append(emojiPanel)
  renderEditorIcons(emojiPanel)
  const emojiScroll = emojiPanel.querySelector<HTMLElement>('[data-emoji-scroll]')!
  const emojiTabs = emojiPanel.querySelector<HTMLElement>('[data-emoji-tabs]')!
  const RECENT_KEY = 'dawn.editor.recentEmojis'
  const readRecent = (): string[] => {
    try {
      return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
    } catch {
      return []
    }
  }
  const rememberEmoji = (emoji: string) => {
    const next = [emoji, ...readRecent().filter((item) => item !== emoji)].slice(0, 32)
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next))
    } catch {
      /* 隐私模式下忽略 */
    }
  }
  const EMOJI_TABS = [
    { id: 'recent', icon: '🕘', label: '最近使用', emojis: [] as string[] },
    ...EMOJI_GROUPS
  ]
  let activeEmojiGroup = readRecent().length ? 'recent' : 'smileys'

  for (const group of EMOJI_TABS) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'editor-emoji-tab'
    button.dataset.emojiGroup = group.id
    button.textContent = group.icon
    emojiTabs.append(button)
  }
  function buildGrid(list: string[]): HTMLElement {
    const grid = document.createElement('div')
    grid.className = 'editor-emoji-grid'
    if (!list.length) {
      const empty = document.createElement('p')
      empty.className = 'editor-emoji-empty'
      empty.textContent = t('暂无最近使用的表情')
      grid.append(empty)
    }
    for (const emoji of list) {
      const item = document.createElement('button')
      item.type = 'button'
      item.className = 'editor-emoji-item'
      item.textContent = emoji
      const name = EMOJI_NAMES[emoji] || emoji
      item.title = name
      item.setAttribute('aria-label', name)
      item.onclick = () => {
        saveSelection()
        insert(emoji)
        rememberEmoji(emoji)
        refreshRecentSection()
      }
      grid.append(item)
    }
    return grid
  }
  const sectionOf = (id: string) =>
    emojiScroll.querySelector<HTMLElement>(`[data-emoji-section="${id}"]`)
  function syncTabs() {
    emojiTabs
      .querySelectorAll<HTMLElement>('[data-emoji-group]')
      .forEach((button) =>
        button.classList.toggle('active', button.dataset.emojiGroup === activeEmojiGroup)
      )
  }
  function renderEmojiSections() {
    emojiScroll.replaceChildren()
    for (const group of EMOJI_TABS) {
      const section = document.createElement('section')
      section.className = 'editor-emoji-section'
      section.dataset.emojiSection = group.id
      const anchor = document.createElement('h3')
      anchor.className = 'editor-emoji-anchor'
      anchor.dataset.emojiAnchor = group.id
      anchor.textContent = t(group.label)
      section.append(anchor, buildGrid(group.id === 'recent' ? readRecent() : group.emojis))
      emojiScroll.append(section)
    }
    syncTabs()
  }
  function refreshRecentSection() {
    const section = sectionOf('recent')
    section?.querySelector('.editor-emoji-grid')?.replaceWith(buildGrid(readRecent()))
  }
  // 滚动到哪一组的锚点，底部 tab 就跟着高亮；继续滚自然进入相邻分组。
  function syncActiveGroupFromScroll() {
    const tops = EMOJI_TABS.map((group) => sectionOf(group.id)?.offsetTop ?? 0)
    if (tops.every((value) => value === 0)) return // 无布局环境（如 jsdom）不推断
    const top = emojiScroll.scrollTop + 6
    let current = EMOJI_TABS[0].id
    EMOJI_TABS.forEach((group, index) => {
      if (tops[index] <= top) current = group.id
    })
    if (current !== activeEmojiGroup) {
      activeEmojiGroup = current
      syncTabs()
    }
  }
  function scrollToGroup(id: string) {
    const section = sectionOf(id)
    if (!section) return
    activeEmojiGroup = id
    syncTabs()
    emojiScroll.scrollTop = section.offsetTop
  }
  function localizeEmojiPanel() {
    EMOJI_TABS.forEach((group) => {
      const anchor = emojiScroll.querySelector<HTMLElement>(`[data-emoji-anchor="${group.id}"]`)
      if (anchor) anchor.textContent = t(group.label)
    })
    emojiTabs.querySelectorAll<HTMLElement>('[data-emoji-group]').forEach((button) => {
      const key = EMOJI_TABS.find((item) => item.id === button.dataset.emojiGroup)!.label
      button.title = t(key)
      button.setAttribute('aria-label', t(key))
    })
    const close = emojiPanel.querySelector<HTMLElement>('[data-emoji-close]')!
    close.title = t('关闭表情面板')
    close.setAttribute('aria-label', t('关闭表情面板'))
    emojiScroll.querySelectorAll<HTMLElement>('.editor-emoji-empty').forEach((empty) => {
      empty.textContent = t('暂无最近使用的表情')
    })
  }
  function positionEmojiPanel() {
    const rect = emojiButton?.getBoundingClientRect()
    if (emojiPanel.hidden || !rect) return
    const width = emojiPanel.offsetWidth || 348
    const height = emojiPanel.offsetHeight || 320
    emojiPanel.style.left = `${Math.max(8, Math.min(rect.left, innerWidth - width - 8))}px`
    const below = rect.bottom + 8
    emojiPanel.style.top = `${below + height > innerHeight - 8 ? Math.max(8, rect.top - height - 8) : below}px`
  }
  function openEmoji() {
    closeFloatingPanels()
    closeMenus()
    saveSelection()
    ;(emojiButton as any)._editorTip?.remove()
    ;(emojiButton as any)._editorTip = null
    const wanted = activeEmojiGroup
    emojiPanel.hidden = false
    renderEmojiSections()
    positionEmojiPanel()
    scrollToGroup(wanted)
    syncToolActive()
  }
  function closeEmoji() {
    emojiPanel.hidden = true
    syncToolActive()
  }
  function toggleEmoji() {
    if (emojiPanel.hidden) openEmoji()
    else closeEmoji()
  }

  on(emojiTabs, 'click', (event: MouseEvent) => {
    const button = (event.target as HTMLElement).closest<HTMLElement>('[data-emoji-group]')
    if (button) scrollToGroup(button.dataset.emojiGroup!)
  })
  on(emojiScroll, 'scroll', syncActiveGroupFromScroll)
  // 滚轮事件在默认滚动前派发，下一帧再同步一次，保证高亮跟手（scroll 事件兜底）。
  on(emojiScroll, 'wheel', () => requestAnimationFrame(syncActiveGroupFromScroll))
  on(emojiPanel.querySelector('[data-emoji-close]'), 'click', closeEmoji)
  on(window, 'resize', positionFloatingPanels)
  window.addEventListener('scroll', positionFloatingPanels, {
    capture: true,
    signal: events.signal
  })
  // 原版浮层统一按 ESC 收起；capture + stopPropagation 避免连带关掉宿主发帖框 / ElDialog。
  document.addEventListener(
    'keydown',
    (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (emojiPanel.hidden && PANEL_NAMES.every((name) => panelNodes[name].hidden)) return
      closeEmoji()
      closeFloatingPanels()
      event.preventDefault()
      event.stopPropagation()
    },
    { capture: true, signal: events.signal }
  )
  // 宿主弹窗关闭时把浮层一起收起，避免再次打开发帖框看到上次残留的面板。
  const hostDialog = root.closest('dialog')
  if (hostDialog)
    on(hostDialog, 'close', () => {
      closeFloatingPanels()
      closeEmoji()
    })

  // 表格网格：原版默认无选中，hover/focus 才预览，移出网格恢复提示，点格子直接插入。
  for (let row = 1; row <= 6; row++)
    for (let column = 1; column <= 8; column++) {
      const cell = document.createElement('button')
      cell.type = 'button'
      cell.className = 'editor-table-cell'
      cell.dataset.row = String(row)
      cell.dataset.column = String(column)
      cell.title = `${row} × ${column}`
      grid.append(cell)
    }
  const tableHint = inPanel('table', '[data-table-hint]')!
  const tableSize = inPanel('table', '[data-table-size]')!
  function resetTable() {
    grid
      .querySelectorAll<HTMLElement>('.editor-table-cell')
      .forEach((cell) => cell.classList.remove('selected'))
    tableHint.textContent = t('表格尺寸提示')
    tableSize.textContent = t('直接点击目标尺寸')
  }
  function paintTable(rows: number, columns: number) {
    const size = `${rows} × ${columns}`
    grid
      .querySelectorAll<HTMLElement>('.editor-table-cell')
      .forEach((cell) =>
        cell.classList.toggle(
          'selected',
          Number(cell.dataset.row) <= rows && Number(cell.dataset.column) <= columns
        )
      )
    tableHint.textContent =
      opts.locale === 'en'
        ? `Insert a ${rows} × ${columns} table.`
        : `将插入 ${rows} 行 ${columns} 列表格。`
    tableSize.textContent = size
  }
  on(grid, 'mouseover', (event: MouseEvent) => {
    const cell = (event.target as HTMLElement).closest<HTMLElement>('.editor-table-cell')
    if (cell) paintTable(Number(cell.dataset.row), Number(cell.dataset.column))
  })
  on(grid, 'focusin', (event: FocusEvent) => {
    const cell = (event.target as HTMLElement).closest<HTMLElement>('.editor-table-cell')
    if (cell) paintTable(Number(cell.dataset.row), Number(cell.dataset.column))
  })
  on(grid, 'mouseleave', resetTable)
  on(grid, 'click', (event: MouseEvent) => {
    const cell = (event.target as HTMLElement).closest<HTMLElement>('.editor-table-cell')
    if (!cell) return
    insert(buildTable(Number(cell.dataset.row), Number(cell.dataset.column)))
    closeFloatingPanels()
  })

  // 链接 / 媒体浮层：原版按选区预填、实时提示，空地址时禁用「插入」。
  const linkText = inPanel('link', '[data-link-text]') as HTMLInputElement
  const linkUrl = inPanel('link', '[data-link-url]') as HTMLInputElement
  const linkHint = inPanel('link', '[data-link-hint]')!
  const linkInsert = inPanel('link', '[data-panel-action="default"]') as HTMLButtonElement
  function syncLinkHint() {
    const url = linkUrl.value.trim()
    linkHint.textContent = url && !/^https?:\/\//i.test(url) ? t('链接建议') : ''
    linkInsert.disabled = !url
  }
  function prefillLink() {
    const s = state()
    const selected = s.value.slice(s.start, s.end).trim()
    const isUrl = /^https?:\/\//i.test(selected)
    linkText.value = selected && !isUrl ? selected : ''
    linkUrl.value = isUrl ? selected : ''
    syncLinkHint()
  }
  const mediaUrl = inPanel('media', '[data-media-url]') as HTMLInputElement
  const mediaHint = inPanel('media', '[data-media-hint]')!
  const mediaInsert = inPanel('media', '[data-panel-action="default"]') as HTMLButtonElement
  const EMBED_HOSTS = new Set([
    'player.bilibili.com',
    'www.bilibili.com',
    'music.163.com',
    'www.youtube.com',
    'youtube.com',
    'youtu.be',
    'v.qq.com'
  ])
  function mediaMarker(raw: string): { text: string; hint: string } | null {
    const value = raw.trim()
    if (!value) return null
    let url: URL
    try {
      url = new URL(value.startsWith('//') ? `https:${value}` : value)
    } catch {
      return null
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    const src = value.startsWith('//')
      ? `//${url.host}${url.pathname}${url.search}${url.hash}`
      : url.toString()
    const path = url.pathname.toLowerCase()
    if (/\.(mp4|webm|ogg|mov|m3u8)$/.test(path))
      return { text: `MEDIA::video::${src}`, hint: t('媒体提示视频') }
    if (/\.(mp3|wav|m4a|aac|flac)$/.test(path))
      return { text: `MEDIA::audio::${src}`, hint: t('媒体提示音频') }
    if (EMBED_HOSTS.has(url.hostname))
      return { text: `MEDIA::iframe::${src}`, hint: t('媒体提示站点') }
    return { text: `MEDIA::iframe::${src}`, hint: t('媒体提示兜底') }
  }
  function syncMediaHint() {
    const marker = mediaMarker(mediaUrl.value)
    mediaHint.textContent = !mediaUrl.value.trim()
      ? t('媒体提示空')
      : marker?.hint || t('媒体提示无效')
    mediaInsert.disabled = !marker
  }
  on(linkUrl, 'input', syncLinkHint)
  on(mediaUrl, 'input', syncMediaHint)

  // 工具栏、选区条、弹层里的命令
  function runCommand(command: string, value?: string) {
    const text = t('文本')
    const code = t('代码')
    const highlight = t('高亮内容')
    switch (command) {
      case 'heading':
        heading(Number(value))
        break
      case 'bold':
        insert((s) => `**${s || text}**`)
        break
      case 'italic':
        insert((s) => `*${s || text}*`)
        break
      case 'underline':
        insert((s) => `<u>${s || text}</u>`)
        break
      case 'strike':
        insert((s) => `~~${s || text}~~`)
        break
      case 'highlight':
        insert((s) => `==${s || highlight}==`)
        break
      case 'code':
        insert((s) =>
          value === 'block'
            ? `\`\`\`ts\n${s || (opts.locale === 'en' ? '// code here' : '// 在这里输入代码')}\n\`\`\``
            : `\`${s || code}\``
        )
        break
      case 'quote':
        linePrefix('> ')
        break
      case 'spoiler':
        openPanel('spoiler')
        break
      case 'spoiler-block':
        insert((s) => `:::spoiler ${t('剧透提示')}\n${s || t('这里填写需要折叠显示的内容')}\n:::`)
        closeFloatingPanels()
        break
      case 'spoiler-mask':
        insert((s) => `!!${s || t('这里填写需要点击显示的内容')}!!`)
        closeFloatingPanels()
        break
      case 'list':
        list(value || 'unordered')
        break
      case 'link':
        openPanel('link')
        break
      case 'table':
        openPanel('table')
        break
      case 'divider':
        insert('\n\n---\n\n')
        break
      case 'align':
        align(value || 'left')
        break
      case 'media':
        openPanel('media')
        break
      case 'emoji':
        toggleEmoji()
        break
      case 'help':
        openPanel('help')
        break
      case 'image':
        openImageLibrary()
        break
    }
  }
  function closeMenus() {
    document
      .querySelectorAll<HTMLElement>('.editor-menu.open')
      .forEach((menu) => menu.classList.remove('open'))
  }
  const bindCommands = (node: EventTarget | null) =>
    on(node, 'click', (event: MouseEvent) => {
      const button = (event.target as HTMLElement).closest<HTMLElement>('[data-editor-command]')
      if (!button) return
      saveSelection()
      closeMenus()
      runCommand(button.dataset.editorCommand!, button.dataset.value)
    })
  on(toolbar, 'click', (event: MouseEvent) => {
    const target = event.target as HTMLElement
    const menuButton = target.closest<HTMLElement>('[data-editor-menu]')
    if (!menuButton) return
    event.stopPropagation()
    saveSelection()
    closeFloatingPanels()
    closeEmoji()
    if (menuButton.dataset.editorMenu === 'heading') syncHeadingMenu()
    const current = root.querySelector<HTMLElement>(
      `[data-editor-menu-panel="${menuButton.dataset.editorMenu}"]`
    )
    document.querySelectorAll<HTMLElement>('.editor-menu.open').forEach((menu) => {
      if (menu !== current) menu.classList.remove('open')
    })
    current?.classList.toggle('open')
  })
  bindCommands(toolbar)
  bindCommands(selectionBar)
  bindCommands(panelNodes.spoiler)
  on(document, 'click', (event: MouseEvent) => {
    const target = event.target as HTMLElement
    if (!target.closest('.editor-tool-dropdown')) closeMenus()
    // 原版：点浮层外面收起；点浮层内、或点打开它的工具栏按钮都不收起。
    const opener = target.closest<HTMLElement>('[data-editor-command]')
    const isPanelTool = !!opener && PANEL_TOOL_KEYS.includes(opener.dataset.editorCommand || '')
    // `+` 与自定义工具按钮都是浮层 opener，点击冒泡到 document 时不能被当成「点外部」立刻收起。
    const isLibraryOpener = !!target.closest('[data-editor-library], [data-editor-tool]')
    const insideFloating = !!target.closest('.editor-popover, [data-emoji-panel]')
    if (!insideFloating && !isPanelTool && !isLibraryOpener) {
      closeFloatingPanels()
      closeEmoji()
    }
  })

  // 选区浮动条、视图、全屏、图片入口
  on(selectionBar, 'mousedown', (event: MouseEvent) => event.preventDefault())
  root
    .querySelectorAll<HTMLElement>('[data-editor-view]')
    .forEach((button) =>
      on(button, 'click', () => setView(button.dataset.editorView as EditorView))
    )
  on(fullscreen, 'click', () => setFullscreen(!shell.classList.contains('fullscreen')))
  on(files, 'change', () => {
    if (files.files?.length) addFiles(Array.from(files.files))
    files.value = ''
  })
  const librarySearch = imagePanel().querySelector<HTMLInputElement>('[data-library-search]')!
  on(librarySearch, 'keydown', (event: KeyboardEvent) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    void loadLibrary(librarySearch.value.trim())
  })
  on(imagePanel(), 'click', (event: MouseEvent) => {
    const target = event.target as HTMLElement
    const mode = target.closest<HTMLElement>('[data-library-mode]')
    if (mode) {
      libraryMode = mode.dataset.libraryMode as 'body' | 'gallery'
      imagePanel()
        .querySelectorAll<HTMLElement>('[data-library-mode]')
        .forEach((button) => button.classList.toggle('active', button === mode))
    } else if (target.closest('[data-library-upload]')) files.click()
    else if (target.closest('[data-library-retry]')) void loadLibrary(librarySearch.value.trim())
  })

  // 面板按钮一律 type=button：编辑器常嵌在宿主 <form> 内（后台 ElForm、
  // 官网发帖表单），内层 form 会被解析器丢弃，type=submit 会直接提交宿主
  // 表单，导致点「取消」也保存记录 / 发布帖子。这里只按 data-panel-action 处理。
  panels.forEach((node) => {
    on(node, 'click', (event: MouseEvent) => {
      const button = (event.target as HTMLElement).closest<HTMLElement>('[data-panel-action]')
      if (!button) return
      if (button.dataset.panelAction === 'default') {
        if (node === panelNodes.link) {
          const url = linkUrl.value.trim()
          if (url) insert((s) => `[${linkText.value.trim() || s || t('链接文字占位')}](${url})`)
        } else if (node === panelNodes.media) {
          const marker = mediaMarker(mediaUrl.value)
          if (marker) insert(marker.text)
        }
      }
      closeFloatingPanels()
    })
    // 浮层输入框不属于宿主表单：Enter 只执行插入，绝不提交发帖 / 编辑表单。
    on(node, 'keydown', (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || (event.target as HTMLElement).tagName !== 'INPUT') return
      event.preventDefault()
      const button = node.querySelector<HTMLButtonElement>('[data-panel-action="default"]')
      if (button && !button.disabled) button.click()
    })
  })
  on(helpDialog?.querySelector('[data-help-close], #editor-help-close') || null, 'click', () =>
    helpDialog?.close()
  )

  // tooltip
  root.querySelectorAll<HTMLElement>('.editor-tool[data-title]').forEach((button) => {
    const key = button.dataset.title!
    button.setAttribute('aria-label', t(key))
    on(button, 'mouseenter', () => {
      const data = TIPS[key]
      if (!data || (button as any)._editorTip) return
      const tip = document.createElement('div')
      tip.className = 'editor-tooltip'
      tip.innerHTML = `<strong>${t(key)}</strong>${data[0] ? `<kbd>${data[0]}</kbd>` : ''}<small>${opts.locale === 'en' ? data[2] : data[1]}</small>`
      ;(button.closest('dialog') || document.body).append(tip)
      const rect = button.getBoundingClientRect()
      tip.style.left = `${Math.max(8, Math.min(innerWidth - tip.offsetWidth - 8, rect.left + rect.width / 2 - tip.offsetWidth / 2))}px`
      tip.style.top = `${Math.max(8, rect.top - tip.offsetHeight - 8)}px`
      ;(button as any)._editorTip = tip
    })
    on(button, 'mouseleave', () => {
      ;(button as any)._editorTip?.remove()
      ;(button as any)._editorTip = null
    })
  })

  // 输入、滚动、选区、@ 候选、快捷键、粘贴与拖放
  function updateMentions() {
    clearTimeout(mentionTimer)
    const pos = input.selectionStart
    const match =
      isPost() && input.value.slice(0, pos).match(/(?:^|[^\w@])@([\w\u4e00-\u9fa5-]{0,30})$/)
    if (!match) {
      mentionPanel.hidden = true
      return
    }
    if (!opts.mentions) return
    mentionTimer = setTimeout(async () => {
      try {
        const rows = await opts.mentions!(match[1])
        mentionPanel.replaceChildren()
        for (const row of rows || []) {
          const item = document.createElement('button')
          item.type = 'button'
          item.className = 'editor-mention'
          item.textContent = row.label
          item.onmousedown = (event) => event.preventDefault()
          item.onclick = () => {
            input.setRangeText(
              row.value.startsWith('@') ? `${row.value} ` : `@${row.value} `,
              pos - match[1].length - 1,
              pos,
              'end'
            )
            mentionPanel.hidden = true
            input.focus()
            changed()
          }
          mentionPanel.append(item)
        }
        mentionPanel.hidden = !mentionPanel.childElementCount
      } catch {
        mentionPanel.hidden = true
      }
    }, 150)
  }
  on(input, 'input', () => {
    changed()
    updateMentions()
  })
  on(input, 'scroll', () => {
    lines.scrollTop = input.scrollTop
    syncSelectionBar()
  })
  for (const type of ['select', 'click', 'keyup'])
    on(input, type, () => {
      saveSelection()
      syncHeadingMenu()
      syncSelectionBar()
    })
  on(input, 'keydown', (event: KeyboardEvent) => {
    const key = event.key.toLowerCase()
    const pos = input.selectionStart
    if (key === 'escape') {
      // 全屏时 ESC 只退出全屏，不能冒泡把宿主的编辑弹窗一起关掉。
      if (shell.classList.contains('fullscreen')) {
        setFullscreen(false)
        event.preventDefault()
        event.stopPropagation()
      }
      mentionPanel.hidden = true
    }
    if (!isPost()) return
    if (key === 'enter' && !event.metaKey && !event.ctrlKey) {
      const line = input.value.slice(input.value.lastIndexOf('\n', Math.max(0, pos - 1)) + 1, pos)
      const match = line.match(/^(\s*)([-*+]|\d+\.)\s+(\[[ xX]\]\s+)?/)
      if (match && line.trim() !== match[0].trim()) {
        const prefix = match[3]
          ? `${match[1]}${match[2]} [ ] `
          : match[2].match(/^\d+\./)
            ? `${match[1]}${parseInt(match[2]) + 1}. `
            : `${match[1]}${match[2]} `
        input.setRangeText(`\n${prefix}`, pos, input.selectionEnd, 'end')
        changed()
        event.preventDefault()
      }
      return
    }
    if (key === 'tab') {
      const start = input.value.lastIndexOf('\n', Math.max(0, pos - 1)) + 1
      if (event.shiftKey && input.value.slice(start, start + 2) === '  ') {
        input.value = input.value.slice(0, start) + input.value.slice(start + 2)
        input.setSelectionRange(pos - 2, pos - 2)
      } else {
        input.value = input.value.slice(0, start) + '  ' + input.value.slice(start)
        input.setSelectionRange(pos + 2, pos + 2)
      }
      saveSelection()
      changed()
      event.preventDefault()
      return
    }
    if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      const linesArray = input.value.split('\n')
      const row = input.value.slice(0, pos).split('\n').length - 1
      const delta = event.key === 'ArrowUp' ? -1 : 1
      if (
        linesArray[row]?.trim().startsWith('|') &&
        linesArray[row + delta]?.trim().startsWith('|')
      ) {
        ;[linesArray[row], linesArray[row + delta]] = [linesArray[row + delta], linesArray[row]]
        input.value = linesArray.join('\n')
        const next = pos + delta * (linesArray[row].length + 1)
        input.setSelectionRange(next, next)
        saveSelection()
        changed()
        event.preventDefault()
      }
      return
    }
    if (!(event.metaKey || event.ctrlKey) || event.isComposing) return
    saveSelection()
    const text = t('文本')
    if (key === 'b') insert((s) => `**${s || text}**`)
    else if (key === 'i' && !event.shiftKey) insert((s) => `*${s || text}*`)
    else if (key === 'u') insert((s) => `<u>${s || text}</u>`)
    else if (key === 'k' && !event.shiftKey) openPanel('link')
    else if (key === 'k' && event.shiftKey)
      insert(
        (s) =>
          `\`\`\`ts\n${s || (opts.locale === 'en' ? '// code here' : '// 在这里输入代码')}\n\`\`\``
      )
    else if (key === 't') {
      paintTable(3, 3)
      openPanel('table')
    } else if (key === 's') opts.onSaveDraft?.()
    else if (key === 'm' && event.altKey) insert((s) => `$${s || 'E = mc^2'}$`)
    else if (key === 'm' && event.shiftKey) insert((s) => `$$\n${s || 'E = mc^2'}\n$$`)
    else if (key === 'l' && event.altKey) insert((s) => `<center>${s || t('文本')}</center>`)
    else if (key === 'i' && event.shiftKey) files.click()
    else if (key === 'q' && event.shiftKey) linePrefix('> ')
    else if (key === 'l' && event.shiftKey) list('unordered')
    else if (key === 'o' && event.shiftKey) list('ordered')
    else if (key === '5' && event.shiftKey) insert((s) => `~~${s || text}~~`)
    else if (key === 'h' && event.shiftKey) insert((s) => `==${s || t('高亮内容')}==`)
    else if (key === '`' && event.shiftKey) insert((s) => '`' + (s || t('代码')) + '`')
    else if (/^[0-6]$/.test(key)) heading(Number(key))
    else return
    event.preventDefault()
  })
  /** 点选 / 拖入 / 剪贴板粘贴统一归一；截图工具常只给 clipboardData.items。 */
  const imageFiles = (event: ClipboardEvent | DragEvent): File[] => {
    const data = 'clipboardData' in event ? event.clipboardData : event.dataTransfer
    const fromFiles = Array.from(data?.files || [])
    const fromItems =
      data && 'items' in data
        ? (Array.from(data.items || [])
            .filter((item) => item.kind === 'file' && ACCEPTED.includes(item.type))
            .map((item) => item.getAsFile())
            .filter(Boolean) as File[])
        : []
    return (fromFiles.length ? fromFiles : fromItems).filter((file) => ACCEPTED.includes(file.type))
  }
  on(input, 'paste', (event: ClipboardEvent) => {
    const picked = imageFiles(event)
    if (!picked.length) return // 纯文本粘贴照旧
    event.preventDefault()
    addFiles(picked)
  })
  const bindDrop = (host: HTMLElement | null) => {
    on(host, 'dragover', (event: DragEvent) => {
      event.preventDefault()
      host?.classList.add('dragover')
    })
    on(host, 'dragleave', () => host?.classList.remove('dragover'))
    on(host, 'drop', (event: DragEvent) => {
      event.preventDefault()
      event.stopPropagation()
      host?.classList.remove('dragover')
      const picked = imageFiles(event)
      if (picked.length) addFiles(picked)
    })
  }
  bindDrop(shell)
  if (!shell.contains(attachBar)) bindDrop(attachBar)

  applyOptions()
  setFullscreen(false)

  return api
}

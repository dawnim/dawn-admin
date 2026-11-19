import MarkdownIt from 'markdown-it'

const CDN = 'https://cdn.jsdelivr.net/npm'

/** 框架提供的通用渲染后处理：复制、锚点、遮罩、坏图、公式与图表。 */
export function enhanceMarkdown(root: HTMLElement): void {
  root.querySelectorAll('pre.md-code-block').forEach((pre) => {
    const copy = document.createElement('button')
    copy.type = 'button'
    copy.className = 'md-copy'
    copy.textContent = '复制'
    copy.onclick = async () => {
      await navigator.clipboard?.writeText(pre.querySelector('code')?.textContent || '')
      copy.textContent = '已复制'
      setTimeout(() => (copy.textContent = '复制'), 1200)
    }
    pre.append(copy)
    if ((pre.querySelector('code')?.textContent || '').split('\n').length > 40) {
      pre.classList.add('md-code-long')
      const toggle = document.createElement('button')
      toggle.type = 'button'
      toggle.className = 'md-code-toggle'
      toggle.textContent = '展开全文'
      toggle.onclick = () => {
        const open = pre.classList.toggle('md-code-expanded')
        toggle.textContent = open ? '收起' : '展开全文'
      }
      pre.append(toggle)
    }
  })
  root.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]').forEach((heading) => {
    const anchor = document.createElement('a')
    anchor.className = 'md-heading-anchor'
    anchor.href = `#${heading.id}`
    anchor.textContent = '#'
    heading.append(anchor)
  })
  root.querySelectorAll('.md-mask').forEach((mask) => {
    ;(mask as HTMLElement).onclick = () => mask.classList.toggle('revealed')
  })
  root.querySelectorAll('img.md-image').forEach((img) => {
    img.addEventListener('error', () => img.classList.add('md-image-broken'), { once: true })
  })
  const charts = root.querySelectorAll<HTMLElement>('.md-mermaid')
  if (charts.length) {
    import(/* @vite-ignore */ `${CDN}/mermaid@11/dist/mermaid.esm.min.mjs`).then(async (module: any) => {
      const mermaid = module.default
      const dark = document.documentElement.dataset.theme === 'dark' || document.documentElement.classList.contains('dark')
      mermaid.initialize({ startOnLoad: false, theme: dark ? 'dark' : 'default' })
      for (const [index, node] of Array.from(charts).entries()) {
        try {
          const { svg } = await mermaid.render(`md-mermaid-${Date.now()}-${index}`, node.textContent || '')
          node.innerHTML = svg
        } catch { node.textContent = '图表渲染失败' }
      }
    }).catch(() => charts.forEach((node) => (node.textContent = '图表加载失败')))
  }
  if (root.querySelector('.katex') && !document.getElementById('md-katex-css')) {
    const link = document.createElement('link')
    link.id = 'md-katex-css'
    link.rel = 'stylesheet'
    link.href = `${CDN}/katex@0.16.40/dist/katex.min.css`
    document.head.append(link)
  }
}

// 聊天只解析 Markdown，HTML 保持文本，链接沿用解析器的安全协议校验。
const chat = new MarkdownIt({ html: false, breaks: true, linkify: true })
const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
const pictographic = /\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20e3/u
chat.disable('image')
chat.renderer.rules.text = (tokens, index) =>
  Array.from(segmenter.segment(tokens[index].content), ({ segment }) => {
    const text = chat.utils.escapeHtml(segment)
    return pictographic.test(segment) ? `<span class="inline-emoji">${text}</span>` : text
  }).join('')
chat.renderer.rules.link_open = (tokens, index, options, _env, renderer) => {
  tokens[index].attrSet('target', '_blank')
  tokens[index].attrSet('rel', 'noopener noreferrer')
  return renderer.renderToken(tokens, index, options)
}

export function renderChatMarkdown(text: string): string {
  return chat.render(text)
}

// 编辑器预览用的通用渲染：保留图片、表格与代码块，HTML 仍按文本处理。
const preview = new MarkdownIt({ html: false, breaks: true, linkify: true })
preview.renderer.rules.link_open = chat.renderer.rules.link_open
preview.renderer.rules.image = (tokens, index, options, _env, renderer) => {
  tokens[index].attrSet('loading', 'lazy')
  tokens[index].attrJoin('class', 'md-image')
  return renderer.renderToken(tokens, index, options)
}

export function renderMarkdown(text: string): string {
  return preview.render(text)
}

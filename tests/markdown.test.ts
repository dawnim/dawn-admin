import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import { renderChatMarkdown } from '../src/dawn/markdown'

test('聊天解析Markdown、保持表情混排，并阻止HTML与危险链接执行', () => {
  const html = renderChatMarkdown(
    '# 使用说明\n\n**你好**🙂\n下一行\n\n- 安装\n- 登录\n\n> 提示\n\n```js\nconst x = "<img>"\n```\n\n| 名称 | 内容 |\n| --- | --- |\n| 示例 | 文字 |\n\n[文档](https://example.com)\n\n<script>alert(1)</script>\n\n[危险](javascript:alert(1))\n\n![图片](https://example.com/a.png)'
  )
  for (const tag of ['h1', 'strong', 'ul', 'blockquote', 'pre', 'table']) {
    assert.ok(html.includes(`<${tag}`), tag)
  }
  assert.match(html, /class="inline-emoji">🙂/)
  assert.match(html, /<br>/)
  assert.match(html, /target="_blank" rel="noopener noreferrer"/)
  assert.match(html, /&lt;script&gt;/)
  assert.doesNotMatch(html, /<script|<img|href="javascript:/)
  assert.match(renderChatMarkdown('`🙂 <b>`'), /<code>🙂 &lt;b&gt;<\/code>/)
})

test('独立访客渲染包与后台使用相同规则，流式未闭合代码可持续解析', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'dawn-markdown-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  execFileSync(process.execPath, ['scripts/build-chat-assets.mjs', directory], {
    cwd: new URL('..', import.meta.url)
  })
  const context: { DawnMarkdown?: { renderChatMarkdown: typeof renderChatMarkdown } } = {}
  runInNewContext(readFileSync(join(directory, 'markdown.js'), 'utf8'), context)
  const source = '## 回复\n\n你好👨‍👩‍👧‍👦\n\n```go\nfmt.Println("你好")\n```'
  for (let i = 1; i <= source.length; i++) {
    assert.equal(
      context.DawnMarkdown!.renderChatMarkdown(source.slice(0, i)),
      renderChatMarkdown(source.slice(0, i))
    )
  }
})

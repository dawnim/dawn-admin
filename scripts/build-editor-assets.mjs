import { build } from 'esbuild'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const destination = resolve('dist')
await mkdir(destination, { recursive: true })
await build({
  entryPoints: ['src/dawn/editor-bundle.ts'],
  bundle: true,
  minify: true,
  format: 'iife',
  globalName: 'DawnEditor',
  footer: { js: 'window.DawnEditor=DawnEditor;' },
  outfile: resolve(destination, 'dawn-editor.js'),
})
const css = await Promise.all(['markdown', 'editor'].map(name => readFile(`src/dawn/${name}.css`, 'utf8')))
await writeFile(resolve(destination, 'dawn-editor.css'), css.join('\n'))

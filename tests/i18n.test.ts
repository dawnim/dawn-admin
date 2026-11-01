import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import test from 'node:test'
import { createI18n } from 'vue-i18n'
import en from '../src/dawn/lang/en.json'
import commonEN from '../src/locales/langs/en.json'
import fieldZH from '../src/dawn/lang/zh.json'

const english = { ...commonEN, ...en }
function flatten(data: Record<string, unknown>, prefix = ''): Record<string, string> {
  return Object.fromEntries(
    Object.entries(data).flatMap(([key, value]) =>
      typeof value === 'string'
        ? [[prefix + key, value]]
        : Object.entries(flatten(value as Record<string, unknown>, prefix + key + '.'))
    )
  )
}
const englishLines = flatten(english)
const fieldLines = flatten(fieldZH)
const parameters = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
const options = {
  legacy: false,
  fallbackLocale: false,
  fallbackFormat: true,
  missingWarn: false,
  fallbackWarn: false
} as const

test('中文原文key和英文占位符完整', () => {
  for (const [key, value] of Object.entries(englishLines)) {
    assert.deepEqual(parameters(fieldLines[key] || key), parameters(value), key)
    if (/[\u3400-\u9fff]/.test(key)) {
      assert.doesNotMatch(key, /[。！？，、；：!?.,;:]$/, key)
      assert.doesNotMatch(key, /[\u3400-\u9fff] +| +[\u3400-\u9fff]/, key)
    }
  }
  const i18n = createI18n({ ...options, locale: 'en', messages: { en: english, zh: fieldZH } })
  assert.equal(i18n.global.t('选择文件'), 'Choose file')
  i18n.global.locale.value = 'zh'
  assert.equal(i18n.global.t('选择文件'), '选择文件')
  assert.equal(i18n.global.t('fields.horizon.status'), '状态')
  for (const fields of Object.values(fieldZH.fields)) {
    for (const name of Object.keys(fields)) assert.match(name, /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/)
  }
  for (const key of Object.keys(fieldLines)) assert.ok(key in englishLines, key)
  for (const entry of readdirSync('src', { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !/\.(ts|vue)$/.test(entry.name)) continue
    const file = `${entry.parentPath}/${entry.name}`
    for (const match of readFileSync(file, 'utf8').matchAll(
      /(?:\$t|\bt|\bte)\('([^']+)'(?:,|\))/g
    )) {
      assert.ok(match[1] in englishLines, `${file}: ${match[1]}`)
    }
  }
})

test('缺少译文时按key填入参数，英文可调整参数顺序', () => {
  const key = '您于{v0}执行了{v1}'
  const i18n = createI18n({
    ...options,
    locale: 'en',
    messages: { en: { [key]: 'Performed {v1} at {v0}' } }
  })
  assert.equal(i18n.global.t(key, { v0: '12:00', v1: 'export' }), 'Performed export at 12:00')
  assert.equal(i18n.global.t('没有译文的提示{value}', { value: '测试' }), '没有译文的提示测试')
  i18n.global.locale.value = 'zh'
  assert.equal(i18n.global.t(key, { v0: '12:00', v1: '导出' }), '您于12:00执行了导出')
})

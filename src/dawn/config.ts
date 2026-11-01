import { shallowReactive, type Component } from 'vue'

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

export const dawnConfig = shallowReactive({
  apiBase: '/admin',
  wsURL: `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`,
  title: 'Dawn',
  logo: '',
  favicon: '',
  copyright: '',
  recordNumber: '',
  timezone: 'UTC',
  serverTimeOffset: 0,
  header: {} as NonNullable<Options['header']>,
  pages: {} as NonNullable<Options['pages']>
})

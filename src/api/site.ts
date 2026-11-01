import request from '@/utils/http'
import AppConfig from '@/config'
import { dawnConfig } from '@/dawn/config'

export async function loadSite() {
  const site = await request.get<Record<string, string> & { server_time: number }>({ url: '/site' })
  dawnConfig.timezone = site.timezone
  dawnConfig.serverTimeOffset = site.server_time - Date.now()
  dawnConfig.title = site.title
  dawnConfig.logo = site.logo
    ? new URL(site.logo, new URL(dawnConfig.apiBase, location.href)).href
    : ''
  dawnConfig.copyright = site.copyright
  dawnConfig.recordNumber = site.record_number
  AppConfig.systemInfo.name = site.title
  document.title = site.title
  for (const name of ['description', 'keywords']) {
    const meta =
      document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`) ||
      document.createElement('meta')
    meta.name = name
    meta.content = site[name]
    document.head.append(meta)
  }
}

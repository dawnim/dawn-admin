import { computed, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue'
import request from '@/utils/http'
import { dawnConfig } from '@/dawn/config'

/** 私密附件带Bearer读取；地址变化或组件卸载时释放Blob。 */
export function useImageUrls(source: MaybeRefOrGetter<string[]>) {
  const images = shallowRef<string[]>([])
  watch(
    () => [...toValue(source)],
    async (urls, _, onCleanup) => {
      const controller = new AbortController(),
        objects: string[] = []
      onCleanup(() => {
        controller.abort()
        objects.forEach(URL.revokeObjectURL)
      })
      images.value = []
      const unique = [...new Set(urls)]
      const api = new URL(dawnConfig.apiBase, location.href)
      const values = await Promise.all(
        unique.map(async (value) => {
          if (!value) return ''
          const target = new URL(value, api.origin)
          if (
            target.origin !== api.origin ||
            !target.pathname.startsWith(api.pathname.replace(/\/$/, '') + '/attachments/')
          )
            return value
          try {
            const blob = await request.get<Blob>({
              url: target.href,
              responseType: 'blob',
              signal: controller.signal,
              showErrorMessage: false
            })
            if (controller.signal.aborted) return ''
            const url = URL.createObjectURL(blob)
            objects.push(url)
            return url
          } catch {
            return ''
          }
        })
      )
      if (!controller.signal.aborted)
        images.value = urls.map((value) => values[unique.indexOf(value)])
    },
    { immediate: true }
  )
  return computed(() => images.value)
}

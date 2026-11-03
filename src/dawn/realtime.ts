import request from '@/utils/http'
import { $t } from '@/locales'
import { HttpError } from '@/utils/http/error'
import { readonly, ref, watch } from 'vue'
import { useUserStore } from '@/store/modules/user'
import { dawnConfig } from './config'

export interface RealtimeMessage<T = unknown> {
  type: string
  id?: string
  channel?: string
  data?: T
  request_id?: string
}
export type RealtimeHandler = (message: RealtimeMessage) => Promise<void> | void

/** One application connection. Register listeners before login; each registration returns cleanup. */
const listeners = new Map<string, Set<RealtimeHandler>>()
const status = ref<'closed' | 'connecting' | 'ready'>('closed')
const channels = new Set<string>()
const pending = new Map<
  string,
  {
    resolve: (value: unknown) => void
    reject: (error: Error) => void
    timer: ReturnType<typeof setTimeout>
  }
>()
let socket: WebSocket | undefined

export const realtime = {
  status: readonly(status),
  on(type: string, handler: RealtimeHandler) {
    if (!listeners.has(type)) listeners.set(type, new Set())
    listeners.get(type)!.add(handler)
    return () => {
      listeners.get(type)?.delete(handler)
    }
  },
  send(message: Record<string, unknown>) {
    if (status.value !== 'ready' || socket?.readyState !== WebSocket.OPEN)
      throw new Error($t('实时连接已断开'))
    socket.send(JSON.stringify(message))
  },
  request<T = unknown>(type: string, data?: unknown, timeout = 10000): Promise<T> {
    const requestId = crypto.randomUUID()
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(requestId)
        reject(new Error($t('实时请求超时')))
      }, timeout)
      pending.set(requestId, { resolve: (value) => resolve(value as T), reject, timer })
      try {
        realtime.send({ type, data, request_id: requestId })
      } catch (error) {
        clearTimeout(timer)
        pending.delete(requestId)
        reject(error)
      }
    })
  },
  subscribe(channel: string) {
    channels.add(channel)
    if (status.value === 'ready') realtime.send({ type: 'subscribe', channel })
  },
  unsubscribe(channel: string) {
    channels.delete(channel)
    if (status.value === 'ready') realtime.send({ type: 'unsubscribe', channel })
  }
}

/** Owned by the root layout; closing also clears identity-bound subscriptions and requests. */
export function connectRealtime() {
  let stopped = false,
    retry = 0
  let timer: ReturnType<typeof setTimeout>
  const userId = String(useUserStore().info.id)
  const resumeKey = `dawn.ws.resume:${userId}`
  let resume = sessionStorage.getItem(resumeKey) || ''
  const seen = new Set<string>()
  function rejectPending() {
    for (const entry of pending.values()) {
      clearTimeout(entry.timer)
      entry.reject(new Error($t('实时连接已断开')))
    }
    pending.clear()
  }
  async function open() {
    if (stopped) return
    status.value = 'connecting'
    try {
      const { ticket } = await request.post<{ ticket: string }>({
        url: '/realtime/ticket',
        data: { resume },
        showErrorMessage: false
      })
      if (stopped) return
      const connection = new WebSocket(dawnConfig.wsURL)
      socket = connection
      connection.onopen = () => connection.send(JSON.stringify({ type: 'auth', ticket }))
      let processing = Promise.resolve()
      connection.onmessage = (event) => {
        processing = processing
          .then(async () => {
            if (stopped) return
            const message = JSON.parse(event.data) as RealtimeMessage
            if (message.type === 'ready') {
              resume = (message.data as { resume: string }).resume
              sessionStorage.setItem(resumeKey, resume)
              retry = 0
              status.value = 'ready'
              for (const channel of channels) realtime.send({ type: 'subscribe', channel })
            }
            const entry = message.request_id && pending.get(message.request_id)
            if (entry && (message.type === 'result' || message.type === 'error')) {
              clearTimeout(entry.timer)
              pending.delete(message.request_id!)
              if (message.type === 'error') entry.reject(new Error(String(message.data)))
              else entry.resolve(message.data)
            }
            const key = `${message.channel}:${message.id}`
            if (!message.id || !seen.has(key)) {
              for (const handler of listeners.get(message.type) || []) await handler(message)
              if (message.id) {
                seen.add(key)
                if (seen.size > 2000) seen.delete(seen.values().next().value!)
              }
            }
            if (message.id && connection.readyState === WebSocket.OPEN)
              connection.send(
                JSON.stringify({ type: 'ack', id: message.id, channel: message.channel })
              )
          })
          .catch(() => connection.close())
      }
      connection.onclose = () => {
        if (stopped) return
        status.value = 'connecting'
        rejectPending()
        timer = setTimeout(open, Math.min(30000, 1000 * 2 ** retry++))
      }
    } catch (error) {
      if (stopped) return
      if (resume && error instanceof HttpError && error.code === 401) {
        resume = ''
        sessionStorage.removeItem(resumeKey)
      }
      timer = setTimeout(open, Math.min(30000, 1000 * 2 ** retry++))
    }
  }
  const stopLanguageWatch = watch(
    () => useUserStore().language,
    () => socket?.close()
  )
  void open()
  return {
    close() {
      stopped = true
      stopLanguageWatch()
      clearTimeout(timer)
      socket?.close()
      socket = undefined
      status.value = 'closed'
      channels.clear()
      rejectPending()
    }
  }
}

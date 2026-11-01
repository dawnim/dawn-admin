import request from '@/utils/http'
import { HttpError } from '@/utils/http/error'
import { watch } from 'vue'
import { useUserStore } from '@/store/modules/user'
import { dawnConfig } from './config'

interface Message {
  type: string
  id?: string
  channel?: string
  data?: unknown
  request_id?: string
}

/** 每个逻辑设备保留独立恢复凭证; 只在业务完成处理后确认消息. */
export function connectRealtime(onMessage: (message: Message) => Promise<void> | void) {
  let socket: WebSocket | undefined,
    stopped = false,
    retry = 0,
    timer: ReturnType<typeof setTimeout>
  let resume = sessionStorage.getItem('dawn.ws.resume') || ''
  const seen = new Map<string, string>()
  const send = (message: Record<string, unknown>) => {
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message))
  }
  async function open() {
    if (stopped) return
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
      let pending = Promise.resolve()
      connection.onmessage = (event) => {
        pending = pending
          .then(async () => {
            const message = JSON.parse(event.data) as Message
            if (message.type === 'ready') {
              resume = (message.data as { resume: string }).resume
              sessionStorage.setItem('dawn.ws.resume', resume)
              retry = 0
              return
            }
            const key = `${message.channel}:${message.id}`
            if (!message.id || !seen.has(key)) {
              await onMessage(message)
              if (message.id) {
                seen.set(key, message.id)
                if (seen.size > 2000) seen.delete(seen.keys().next().value!)
              }
            }
            if (message.id && connection.readyState === WebSocket.OPEN) {
              connection.send(
                JSON.stringify({ type: 'ack', id: message.id, channel: message.channel })
              )
            }
          })
          .catch((error) => {
            console.error(error)
            connection.close()
          })
      }
      connection.onclose = () => {
        if (!stopped) timer = setTimeout(open, Math.min(30000, 1000 * 2 ** retry++))
      }
    } catch (error) {
      if (resume && error instanceof HttpError && error.code === 401) {
        resume = ''
        sessionStorage.removeItem('dawn.ws.resume')
      }
      if (!stopped) timer = setTimeout(open, Math.min(30000, 1000 * 2 ** retry++))
    }
  }
  const stopLanguageWatch = watch(
    () => useUserStore().language,
    () => socket?.close()
  )
  void open()
  return {
    send,
    close: () => {
      stopped = true
      stopLanguageWatch()
      clearTimeout(timer)
      socket?.close()
    }
  }
}

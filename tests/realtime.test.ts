import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { createServer as createViteServer } from 'vite'

test('共享WS请求、超时、处理后确认与断开清理', async (t) => {
  const http = createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ data: { ticket: 'test-ticket' } }))
  })
  http.listen(0, '127.0.0.1')
  await once(http, 'listening')
  const storage = new Map<string, string>()
  const created: FakeSocket[] = []
  class FakeSocket {
    static OPEN = 1
    readyState = 1
    onopen?: () => void
    onclose?: () => void
    onmessage?: (event: { data: string }) => void
    sent: Record<string, unknown>[] = []
    constructor() {
      created.push(this)
    }
    send(data: string) {
      this.sent.push(JSON.parse(data))
    }
    close() {
      this.readyState = 3
      this.onclose?.()
    }
    receive(message: Record<string, unknown>) {
      this.onmessage?.({ data: JSON.stringify(message) })
    }
  }
  Object.assign(globalThis, {
    location: { protocol: 'http:', host: 'localhost' },
    ElMessage: { error() {}, success() {} },
    WebSocket: FakeSocket,
    sessionStorage: {
      getItem: (key: string) => storage.get(key),
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key)
    }
  })
  const vite = await createViteServer({
    configFile: false,
    optimizeDeps: { noDiscovery: true, entries: [] },
    server: { middlewareMode: true, hmr: false, ws: false },
    resolve: {
      alias: [
        {
          find: '@/store/modules/user',
          replacement: fileURLToPath(new URL('./fixtures/user.ts', import.meta.url))
        },
        {
          find: '@/locales',
          replacement: fileURLToPath(new URL('./fixtures/locales.ts', import.meta.url))
        },
        { find: '@', replacement: fileURLToPath(new URL('../src', import.meta.url)) }
      ]
    }
  })
  t.after(async () => {
    await vite.close()
    http.closeAllConnections()
    await new Promise<void>((resolve) => http.close(() => resolve()))
  })
  const { dawnConfig } = await vite.ssrLoadModule('/src/dawn/config.ts')
  dawnConfig.apiBase = `http://127.0.0.1:${(http.address() as { port: number }).port}/admin`
  const { realtime, connectRealtime } = await vite.ssrLoadModule('/src/dawn/realtime.ts')
  await assert.rejects(realtime.request('app.echo'), /实时连接已断开/)
  realtime.subscribe('orders:1')
  const connection = connectRealtime()
  t.after(() => connection.close())
  for (let tries = 0; !created.length && tries < 100; tries++)
    await new Promise((resolve) => setTimeout(resolve, 5))
  const socket = created[0]
  assert.ok(socket)
  socket.onopen?.()
  assert.deepEqual(socket.sent[0], { type: 'auth', ticket: 'test-ticket' })
  socket.receive({ type: 'ready', data: { resume: 'device' } })
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(realtime.status.value, 'ready')
  assert.ok(socket.sent.some((item) => item.type === 'subscribe' && item.channel === 'orders:1'))
  const result = realtime.request('app.echo', { value: 1 })
  const sent = socket.sent.at(-1)!
  socket.receive({ type: 'result', request_id: sent.request_id, data: { value: 1 } })
  assert.deepEqual(await result, { value: 1 })
  const failure = realtime.request('app.denied')
  socket.receive({ type: 'error', request_id: socket.sent.at(-1)!.request_id, data: 'denied' })
  await assert.rejects(failure, /denied/)
  await assert.rejects(realtime.request('app.timeout', {}, 1), /实时请求超时/)
  let release!: () => void
  let handled = 0
  const stop = realtime.on('order.updated', async () => {
    handled++
    await new Promise<void>((resolve) => {
      release = resolve
    })
  })
  const event = { type: 'order.updated', id: '1-0', channel: 'orders:1', data: { id: 1 } }
  socket.receive(event)
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.ok(!socket.sent.some((item) => item.type === 'ack'))
  release()
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.ok(socket.sent.some((item) => item.type === 'ack' && item.id === '1-0'))
  socket.receive(event)
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(handled, 1)
  stop()
  const interrupted = realtime.request('app.wait')
  connection.close()
  await assert.rejects(interrupted, /实时连接已断开/)
  assert.equal(realtime.status.value, 'closed')
})

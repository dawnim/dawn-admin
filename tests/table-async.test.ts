import assert from 'node:assert/strict'
import test from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'

test('表格取消请求不覆盖新数据，防抖覆盖与取消均结束Promise', async () => {
  const vite = await createServer({
    configFile: false,
    server: { middlewareMode: true, hmr: false, ws: false },
    optimizeDeps: { noDiscovery: true, entries: [] },
    resolve: {
      alias: [
        {
          find: '@/locales',
          replacement: fileURLToPath(new URL('./fixtures/locales.ts', import.meta.url))
        },
        { find: '@', replacement: fileURLToPath(new URL('../src', import.meta.url)) }
      ]
    }
  })
  try {
    const { useTable } = await vite.ssrLoadModule('/src/hooks/core/useTable.ts')
    const calls: {
      signal: AbortSignal
      resolve: (value: any) => void
      reject: (error: Error) => void
    }[] = []
    let table: ReturnType<typeof useTable>
    let errors = 0
    const app = createSSRApp({
      setup() {
        table = useTable({
          core: {
            immediate: false,
            apiFn: (_: unknown, { signal }: { signal: AbortSignal }) =>
              new Promise((resolve, reject) => calls.push({ signal, resolve, reject }))
          },
          performance: { debounceTime: 10 },
          hooks: { onError: () => errors++ }
        })
        return () => null
      }
    })
    await renderToString(app)
    const previous = table!.getData()
    const current = table!.getData()
    assert.equal(calls[0].signal.aborted, true)
    calls[1].resolve({ data: [{ id: 2 }], meta: { page: 1, page_size: 20, total: 1 } })
    await current
    calls[0].reject(new Error('late network error'))
    await previous
    assert.deepEqual(table!.data.value, [{ id: 2 }])
    assert.equal(errors, 0)
    assert.equal(table!.loading.value, false)

    const first = table!.getDataDebounced({ name: 'first' })
    const last = table!.getDataDebounced({ name: 'last' })
    assert.equal(
      await Promise.race([first.then(() => 'settled'), delay(100, 'pending')]),
      'settled'
    )
    await delay(20)
    assert.equal(calls.length, 3)
    calls[2].resolve({ data: [{ id: 3 }], meta: { page: 1, page_size: 20, total: 1 } })
    await last
    const canceled = table!.getDataDebounced({ name: 'canceled' })
    table!.cancelRequest()
    assert.equal(
      await Promise.race([canceled.then(() => 'settled'), delay(100, 'pending')]),
      'settled'
    )
    assert.equal(calls.length, 3)
  } finally {
    await vite.close()
  }
})

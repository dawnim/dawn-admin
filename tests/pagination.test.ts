import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'

test('实际表格hook在末页删除后重新取有效页，空页保持真实总数', async () => {
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
    let total = 41
    const pages: number[] = []
    let table: ReturnType<typeof useTable>
    const app = createSSRApp({
      setup() {
        table = useTable({
          core: {
            immediate: false,
            apiFn: async ({ page, page_size }: { page: number; page_size: number }) => {
              pages.push(page)
              const start = (page - 1) * page_size
              return {
                data: Array.from(
                  { length: Math.max(0, Math.min(page_size, total - start)) },
                  (_, index) => ({ id: start + index + 1 })
                ),
                meta: { page, page_size, total }
              }
            }
          }
        })
        return () => null
      }
    })
    await renderToString(app)
    await table!.handleCurrentChange(3)
    assert.equal(table!.data.value[0].id, 41)
    total = 40
    await table!.refreshData()
    assert.deepEqual(pages, [3, 3, 2])
    assert.equal(table!.pagination.current, 2)
    assert.equal(table!.data.value[0].id, 21)
    total = 0
    await table!.refreshRemove()
    assert.deepEqual(pages.slice(-2), [2, 1])
    assert.equal(table!.pagination.current, 1)
    assert.equal(table!.pagination.total, 0)
    assert.deepEqual(table!.data.value, [])
    await table!.handleSizeChange(300)
    assert.equal(table!.pagination.size, 300)
  } finally {
    await vite.close()
  }
})

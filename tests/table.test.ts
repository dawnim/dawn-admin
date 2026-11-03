import assert from 'node:assert/strict'
import test from 'node:test'
import { defaultResponseAdapter } from '../src/utils/table/tableUtils'

test('空页保留服务端总数和页码', () => {
  assert.deepEqual(
    defaultResponseAdapter({ data: [], meta: { total: 83, page: 6, page_size: 20 } }),
    {
      records: [],
      total: 83,
      current: 6,
      size: 20
    }
  )
})

test('树形列表使用数组响应', () => {
  const rows = [{ id: 1, children: [{ id: 2 }] }]
  assert.deepEqual(defaultResponseAdapter(rows), { records: rows, total: 1 })
})

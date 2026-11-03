import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { createServer as createViteServer } from 'vite'

test('HTTP凭证、请求参数和错误响应', async (t) => {
  let refreshes = 0
  let refreshUnavailable = false
  const http = createServer(async (req, res) => {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    res.setHeader('Content-Type', 'application/json')
    if (req.url === '/admin/auth/login') {
      res.writeHead(401).end(JSON.stringify({ message: '用户名或密码错误' }))
    } else if (req.url === '/admin/auth/refresh') {
      refreshes++
      if (refreshUnavailable) {
        res.writeHead(503).end(JSON.stringify({ message: 'service unavailable' }))
        return
      }
      await new Promise((resolve) => setTimeout(resolve, 30))
      res.end(JSON.stringify({ data: { access_token: 'fresh', refresh_token: 'rotated' } }))
    } else if (req.url?.startsWith('/admin/late') && req.headers.authorization !== 'Bearer fresh') {
      await new Promise((resolve) => setTimeout(resolve, 100))
      res.writeHead(401).end(JSON.stringify({ message: 'expired' }))
    } else if (req.url === '/admin/records' && req.headers.authorization !== 'Bearer fresh') {
      res.writeHead(401).end(JSON.stringify({ message: 'expired' }))
    } else if (req.url === '/admin/menus/definitions') {
      res.end(
        JSON.stringify({
          data: {
            menus: [
              { key: 'dawn.system', title: '系统管理', type: 1, sort: 10 },
              {
                key: 'dawn.users',
                parent_key: 'dawn.system',
                title: '用户管理',
                type: 2,
                path: '/system/user',
                sort: 10
              }
            ],
            custom: [
              {
                id: 42,
                key: 'custom.help',
                parent_key: 'dawn.system',
                title: '帮助',
                type: 4,
                url: 'https://example.com',
                sort: 20
              }
            ],
            permissions: [{ key: 'dawn.users.list', parent_key: 'dawn.users', title: '查看' }]
          }
        })
      )
    } else if (req.url === '/admin/horizon/api/queues') {
      res.end(
        JSON.stringify({
          items: [{ queue: 'default' }],
          total: 1,
          page: 1,
          page_size: 5,
          capability: 'supported'
        })
      )
    } else if (req.url === '/admin/roles/1/permissions') {
      res.end(
        JSON.stringify({
          data: {
            keys: ['dawn.users.list'],
            menus: [
              { key: 'dawn.system', title: '系统管理', type: 1 },
              { key: 'dawn.users', parent_key: 'dawn.system', title: '用户管理', type: 2 }
            ],
            custom: [{ key: 'custom.help', parent_key: 'dawn.system', title: '帮助', type: 2 }],
            permissions: [
              { key: 'dawn.users.list', parent_key: 'dawn.users', title: '查看' },
              { key: 'custom.help', parent_key: 'dawn.system', title: '帮助' },
              { key: 'custom.help.create', parent_key: 'custom.help', title: '新增' }
            ]
          }
        })
      )
    } else if (req.url?.startsWith('/admin/tables?') || req.url === '/admin/tables') {
      const query = new URL(req.url, 'http://localhost').searchParams
      const page = Number(query.get('page') || 1),
        size = Number(query.get('page_size') || 20)
      const field = query.get('sort_by') || 'created_at',
        descending = query.get('sort_order') !== 'asc'
      const rows = [
        {
          name: 'admin_users',
          created_at: 30,
          updated_at: 300,
          data_free: 0,
          data_length: 4096,
          collation: 'utf8mb4_unicode_ci'
        },
        {
          name: 'admin_roles',
          created_at: 10,
          updated_at: 100,
          data_free: null,
          data_length: null,
          collation: null
        },
        {
          name: 'business_widgets',
          created_at: 20,
          updated_at: 200,
          data_free: 1024,
          data_length: 8192,
          collation: 'utf8mb4_unicode_ci'
        }
      ]
      const filtered = rows
        .filter((row) => !query.get('name') || row.name.includes(query.get('name')!))
        .sort((a: any, b: any) => (a[field] - b[field]) * (descending ? -1 : 1))
      res.end(
        JSON.stringify({
          data: filtered.slice((page - 1) * size, page * size),
          meta: { total: filtered.length, page, page_size: size }
        })
      )
    } else if (req.url === '/admin/tables/admin_users/columns') {
      res.end(
        JSON.stringify({
          data: [
            { name: 'id', type: 'bigint', key: 'PRI', default: null, comment: '' },
            { name: 'code', type: 'varchar(64)', key: 'UNI', default: '', comment: '编码' },
            { name: 'status', type: 'int', key: 'MUL', default: '0', comment: '状态' }
          ]
        })
      )
    } else if (req.url === '/admin/widgets' && req.method === 'POST') {
      res
        .writeHead(201, { Location: '/admin/widgets/7' })
        .end(JSON.stringify({ data: { id: 7, ...JSON.parse(Buffer.concat(chunks).toString()) } }))
    } else if (req.url?.startsWith('/admin/widgets') && req.method === 'DELETE') {
      res.writeHead(204).end()
    } else if (req.url === '/admin/invalid') {
      res.writeHead(422).end(JSON.stringify({ message: '标题不能为空' }))
    } else {
      res.end(
        JSON.stringify({
          data: {
            url: req.url,
            method: req.method,
            body: Buffer.concat(chunks).toString(),
            authorization: req.headers.authorization,
            language: req.headers['accept-language']
          }
        })
      )
    }
  })
  http.listen(0, '127.0.0.1')
  await once(http, 'listening')
  const address = http.address() as { port: number }
  Object.assign(globalThis, {
    location: { protocol: 'http:', host: 'localhost' },
    ElMessage: { error() {}, success() {} }
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
  const { user } = await vite.ssrLoadModule('/tests/fixtures/user.ts')
  const { dawnConfig } = await vite.ssrLoadModule('/src/dawn/config.ts')
  const { default: request } = await vite.ssrLoadModule('/src/utils/http/index.ts')
  const { fetchLogout } = await vite.ssrLoadModule('/src/api/auth.ts')
  const { useAuth } = await vite.ssrLoadModule('/src/hooks/core/useAuth.ts')
  dawnConfig.apiBase = `http://127.0.0.1:${address.port}/admin`

  await t.test('组件权限读取当前授权与超级管理员标识', () => {
    const { hasAuth } = useAuth()
    user.info.buttons = ['app.orders.list']
    assert.equal(hasAuth('app.orders.list'), true)
    assert.equal(hasAuth('app.orders.update'), false)
    user.info.is_super = true
    assert.equal(hasAuth('app.orders.update'), true)
    user.info.is_super = false
  })
  await t.test('资源API透传AbortSignal，取消不转换成业务错误或弹提示', async () => {
    const { createResourceApi } = await vite.ssrLoadModule('/src/api/resource.ts')
    const controller = new AbortController()
    controller.abort()
    const messages: string[] = []
    const previous = globalThis.ElMessage.error
    globalThis.ElMessage.error = (message: string) => messages.push(message)
    try {
      await assert.rejects(createResourceApi('/records').list({}, { signal: controller.signal }), {
        code: 'ERR_CANCELED'
      })
      assert.deepEqual(messages, [])
    } finally {
      globalThis.ElMessage.error = previous
    }
  })
  await t.test('登录失败保留服务端错误，不触发全局退出或凭证轮转', async () => {
    user.setToken('current', 'refresh')
    await assert.rejects(
      request.post({
        url: '/auth/login',
        data: { username: 'admin', password: 'wrong' },
        showErrorMessage: false
      }),
      { message: '用户名或密码错误', code: 401 }
    )
    await new Promise((resolve) => setTimeout(resolve, 550))
    assert.equal(user.accessToken, 'current')
    assert.equal(refreshes, 0)
  })
  await t.test('并发401共用一次轮转', async () => {
    user.setToken('expired', 'refresh')
    const responses = await Promise.all(
      Array.from({ length: 3 }, () => request.get({ url: '/records' }))
    )
    assert.equal(refreshes, 1)
    assert.equal(user.refreshToken, 'rotated')
    assert.ok(responses.every((r) => r.authorization === 'Bearer fresh'))
  })
  await t.test('轮转完成后才返回的旧401复用新Token', async () => {
    user.setToken('expired', 'refresh')
    const before = refreshes
    const responses = await Promise.all([
      request.get({ url: '/records' }),
      request.get({ url: '/late' })
    ])
    assert.equal(refreshes - before, 1)
    assert.ok(responses.every((r) => r.authorization === 'Bearer fresh'))
  })
  await t.test('刷新服务暂时不可用时保留凭证', async () => {
    user.setToken('expired', 'refresh')
    refreshUnavailable = true
    await assert.rejects(request.get({ url: '/records', showErrorMessage: false }))
    assert.equal(user.refreshToken, 'refresh')
    assert.equal(user.accessToken, 'expired')
    refreshUnavailable = false
    user.setToken('fresh', 'rotated')
  })
  await t.test('清空本地凭证后退出请求仍携带原凭证', async () => {
    const pending = fetchLogout(user.accessToken)
    user.accessToken = ''
    assert.equal((await pending).authorization, 'Bearer fresh')
  })
  await t.test('查询参数与JSON请求体使用Axios原生语义', async () => {
    const result = await request.post({
      url: '/echo',
      params: { page: 2 },
      data: { title: '记录' }
    })
    assert.equal(result.url, '/admin/echo?page=2')
    assert.equal(result.language, 'en')
    user.language = 'zh'
    assert.equal((await request.get({ url: '/echo' })).language, 'zh')
    assert.deepEqual(JSON.parse(result.body), { title: '记录' })
    const query = await request.post({ url: '/echo', params: { page: 3 } })
    assert.equal(query.url, '/admin/echo?page=3')
    assert.equal(query.body, '')
  })
  await t.test('保留服务端验证错误', async () => {
    await assert.rejects(request.post({ url: '/invalid', showErrorMessage: false }), {
      message: '标题不能为空',
      code: 422
    })
  })
  await t.test('原版树表合并代码菜单与自定义菜单并用稳定Key建立关系', async () => {
    const { default: menu } = await vite.ssrLoadModule('/src/api/system/menu.ts')
    const rows = await menu.list()
    assert.equal(rows[0].key, 'dawn.system')
    assert.equal(rows[0].children[0].builtin, true)
    assert.equal(rows[0].children[0].children[0].type, 3)
    assert.equal(rows[0].children[1].id, 42)
    assert.equal(rows[0].children[1].link_url, 'https://example.com')
    const saved = await menu.update(42, {
      id: 42,
      type: 4,
      code: 'custom.help',
      name: '帮助',
      parent_id: 'dawn.system',
      is_iframe: 1
    })
    const body = JSON.parse(saved.body)
    assert.equal(body.key, 'custom.help')
    assert.equal(body.parent_key, 'dawn.system')
    assert.equal(body.mode, 'iframe')
  })
  await t.test('角色目录可勾选批量选择，保存只包含可授权的Key', async () => {
    const { default: role } = await vite.ssrLoadModule('/src/api/system/role.ts')
    const data = await role.menuByRole({ id: 1 })
    assert.deepEqual(data.keys, ['dawn.users.list'])
    assert.equal(data.menus[0].grantable, false)
    assert.equal(data.menus[0].children[0].children[0].grantable, true)
    assert.equal(data.menus[0].disabled, undefined)
    const custom = data.menus[0].children.find((node: any) => node.id === 'menu:custom.help')
    assert.equal(custom.grantable, false)
    assert.deepEqual(custom.children.find((node: any) => node.id === 'custom.help').children, [])
    assert.equal(
      custom.children.find((node: any) => node.id === 'custom.help.create').grantable,
      true
    )
  })
  await t.test('上游只读API明确保留原生分页外壳', async () => {
    const result = await request.get({ url: '/horizon/api/queues', rawResponse: true })
    assert.equal(result.total, 1)
    assert.equal(result.items[0].queue, 'default')
    assert.equal(result.capability, 'supported')
  })
  await t.test('REST工厂使用201、PATCH、PUT与无正文204，零值保持不变', async () => {
    const { createResourceApi } = await vite.ssrLoadModule('/src/api/resource.ts')
    const api = createResourceApi('/widgets')
    const created = await api.create({ name: 'one', active: false, count: 0 })
    assert.equal(created.id, 7)
    assert.equal(created.active, false)
    const patched = await api.update(7, { id: 7, created_at: 1, active: false, count: 0, name: '' })
    assert.deepEqual(JSON.parse(patched.body), { active: false, count: 0, name: '' })
    assert.equal(patched.url, '/admin/widgets/7')
    assert.equal(patched.method, 'PATCH')
    const replaced = await api.replace(7, { id: 7, name: 'full', count: 0, active: false })
    assert.equal(replaced.method, 'PUT')
    assert.deepEqual(JSON.parse(replaced.body), { name: 'full', count: 0, active: false })
    assert.equal(await api.remove(7), undefined)
    assert.equal(await api.removeMany([7, 8]), undefined)
  })
  await t.test('数据表维护保留元数据，筛选、日期排序和分页生效', async () => {
    const { default: database } = await vite.ssrLoadModule('/src/api/safeguard/database.ts')
    const page = await database.list({
      page: 2,
      page_size: 1,
      sort_by: 'updated_at',
      sort_order: 'asc'
    })
    assert.equal(page.meta.total, 3)
    assert.equal(page.meta.page, 2)
    assert.equal(page.meta.page_size, 1)
    assert.equal(page.data[0].name, 'business_widgets')
    const filtered = await database.list({ name: 'admin_' })
    assert.deepEqual(
      filtered.data.map((row: any) => row.name),
      ['admin_users', 'admin_roles']
    )
    assert.equal(filtered.data[0].resource, 'users')
    assert.equal(filtered.data[0].data_free, 0)
    assert.equal(filtered.data[0].collation, 'utf8mb4_unicode_ci')
    assert.equal(filtered.data[1].data_length, null)
    const empty = await database.list({ page: 5, page_size: 20 })
    assert.equal(empty.meta.total, 3)
    assert.deepEqual(empty.data, [])
  })
  await t.test('表结构保留完整类型、索引及零值和空默认值，维护动作与原版一致', async () => {
    const { default: database } = await vite.ssrLoadModule('/src/api/safeguard/database.ts')
    const columns = await database.getDetailed({ table: 'admin_users' })
    assert.deepEqual(
      columns.map((column: any) => column.column_key),
      ['PRI', 'UNI', 'MUL']
    )
    assert.equal(columns[1].column_type, 'varchar(64)')
    assert.equal(columns[0].column_default, null)
    assert.equal(columns[1].column_default, '')
    assert.equal(columns[2].column_default, '0')
    const [analyzed] = await database.optimize({ tables: ['admin_users'] })
    const [optimized] = await database.fragment({ tables: ['admin_users'] })
    assert.equal(JSON.parse(analyzed.body).action, 'analyze')
    assert.equal(JSON.parse(optimized.body).action, 'optimize')
  })
})

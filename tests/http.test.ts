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
    if (req.url === '/admin/auth/refresh') {
      refreshes++
      if (refreshUnavailable) {
        res.writeHead(503).end(JSON.stringify({ code: 503, message: 'service unavailable' }))
        return
      }
      await new Promise((resolve) => setTimeout(resolve, 30))
      res.end(
        JSON.stringify({ code: 200, data: { access_token: 'fresh', refresh_token: 'rotated' } })
      )
    } else if (req.url?.startsWith('/admin/late') && req.headers.authorization !== 'Bearer fresh') {
      await new Promise((resolve) => setTimeout(resolve, 100))
      res.writeHead(401).end(JSON.stringify({ code: 401, message: 'expired' }))
    } else if (req.url === '/admin/records' && req.headers.authorization !== 'Bearer fresh') {
      res.writeHead(401).end(JSON.stringify({ code: 401, message: 'expired' }))
    } else if (req.url === '/admin/system/menus/definitions') {
      res.end(
        JSON.stringify({
          code: 200,
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
    } else if (req.url === '/admin/system/roles/1/permissions') {
      res.end(
        JSON.stringify({
          code: 200,
          data: {
            keys: ['dawn.users.list'],
            menus: [
              { key: 'dawn.system', title: '系统管理', type: 1 },
              { key: 'dawn.users', parent_key: 'dawn.system', title: '用户管理', type: 2 }
            ],
            custom: [],
            permissions: [{ key: 'dawn.users.list', parent_key: 'dawn.users', title: '查看' }]
          }
        })
      )
    } else if (req.url === '/admin/invalid') {
      res.writeHead(422).end(JSON.stringify({ code: 422, message: '标题不能为空' }))
    } else {
      res.end(
        JSON.stringify({
          code: 200,
          data: {
            url: req.url,
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
    server: { middlewareMode: true },
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
    const saved = await menu.update({
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
  })
})

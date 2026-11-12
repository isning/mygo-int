import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import test from 'node:test'
import { apply, inject, INDEX_INJECTIONS_PATH } from '../lib/index.js'

// Real HTTP requests exercise the plugin handler. Admission, route dispatch and
// Cordis effects are focused doubles; live Host admission is covered end to end.
async function fixture(t, injections = []) {
  const routes = new Map()
  const disposers = []
  const collectedPeers = []
  const owner = { principal: { kind: 'owner' }, requestContext: Symbol('admitted') }
  const ctx = {
    effect(register) { disposers.push(register()) },
    webServer: {
      collectIndexInjections(peer) {
        assert.equal(peer, owner)
        collectedPeers.push(peer)
        return injections
      },
      register(route) {
        assert.equal(route.kind, 'exact')
        assert.equal(route.path, INDEX_INJECTIONS_PATH)
        assert.equal(routes.has(route.path), false)
        routes.set(route.path, route.handler)
        return () => routes.delete(route.path)
      },
    },
    connection: {
      admit(req) {
        switch (req.headers['x-test-admission']) {
          case 'owner': return { peer: owner }
          case 'other': return { peer: { principal: { kind: 'test-non-owner' } } }
          case 'fence': return { rejection: 403 }
          default: return { rejection: 401 }
        }
      },
    },
  }
  apply(ctx)
  const server = createServer((req, res) => {
    const handler = routes.get(new URL(req.url, 'http://localhost').pathname)
    if (handler) handler(req, res)
    else { res.statusCode = 404; res.end() }
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(() => new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve())
    server.closeAllConnections()
  }))
  return {
    request: (path = INDEX_INJECTIONS_PATH, admission = 'owner', method = 'GET') => fetch(
      `http://127.0.0.1:${server.address().port}${path}`,
      { method, headers: { 'x-test-admission': admission } },
    ),
    dispose: () => disposers.forEach(dispose => dispose()),
    collectedPeers,
  }
}

test('complete table keeps all row kinds, duplicates, order and admitted Peer', async t => {
  assert.deepEqual(inject, ['webServer', 'connection'])
  const rows = [
    { kind: 'script', placement: 'head', text: 'throw new Error("must not execute")' },
    { kind: 'style', text: ':root { color: red }' },
    { kind: 'script-preload', src: '/plugins/application.js' },
    { kind: 'script-src', placement: 'body', src: '/plugins/bootstrap.js' },
    { kind: 'global', name: '__DSH_BOOT__', value: { nested: [null, true, 3, '</script>'], toJSON: 'ordinary data' } },
    { kind: 'html', placement: 'body', html: '<div data-test="original">中文</div>' },
    { kind: 'style', text: ':root { color: red }' },
  ]
  const f = await fixture(t, rows)
  const response = await f.request(`${INDEX_INJECTIONS_PATH}?probe=1`)
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8')
  assert.equal(response.headers.get('access-control-allow-origin'), null)
  assert.deepEqual(await response.json(), { injections: rows })
  assert.equal(f.collectedPeers.length, 1)
})

test('admission, exact GET and Cordis disposal guard collection', async t => {
  const f = await fixture(t)
  for (const [admission, status] of [['missing', 401], ['fence', 403], ['other', 403]]) {
    const response = await f.request(INDEX_INJECTIONS_PATH, admission)
    assert.equal(response.status, status)
    assert.equal(await response.text(), '')
    assert.equal(response.headers.get('cache-control'), 'no-store')
  }
  assert.equal((await f.request(INDEX_INJECTIONS_PATH, 'missing', 'POST')).status, 401)
  for (const method of ['POST', 'HEAD', 'OPTIONS']) {
    const response = await f.request(INDEX_INJECTIONS_PATH, 'owner', method)
    assert.equal(response.status, 405)
    assert.equal(response.headers.get('allow'), 'GET')
  }
  assert.equal((await f.request(INDEX_INJECTIONS_PATH + '/')).status, 404)
  assert.equal(f.collectedPeers.length, 0)
  f.dispose()
  assert.equal((await f.request()).status, 404)
})

test('non-JSON contributor data fails closed without serialization hooks', async t => {
  const cyclic = {}; cyclic.self = cyclic
  let getterCalls = 0
  const accessor = Object.defineProperty({}, 'secret', { enumerable: true, get() { getterCalls++; return 'changed' } })
  let hookCalls = 0
  const hook = { toJSON() { hookCalls++; return 'changed' } }
  for (const value of [undefined, NaN, Infinity, -0, 1n, () => {}, Symbol(), cyclic, accessor, hook, new Date(), [,]]) {
    const f = await fixture(t, [{ kind: 'global', name: 'invalid', value }])
    const response = await f.request()
    assert.equal(response.status, 500)
    assert.equal(response.headers.get('cache-control'), 'no-store')
    assert.equal(await response.text(), '')
  }
  assert.equal(hookCalls, 0)
  assert.equal(getterCalls, 0)
})

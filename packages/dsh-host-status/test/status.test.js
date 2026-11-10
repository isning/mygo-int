import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { apply, inject, STATUS_PATH } from '../index.js'

// Real HTTP requests exercise the exported plugin's handler. Admission, route
// dispatch and Cordis effects below are doubles, not a live DSH security check.
async function fixture(t, release) {
  const routes = new Map()
  const disposers = []
  let graphReads = 0
  const ctx = {
    effect(register) { disposers.push(register()) },
    webServer: {
      register(route) {
        assert.equal(route.kind, 'exact')
        assert.equal(route.path, STATUS_PATH)
        assert.equal(routes.has(route.path), false)
        routes.set(route.path, route.handler)
        return () => routes.delete(route.path)
      },
    },
    connection: {
      admit(req) {
        switch (req.headers['x-test-admission']) {
          case 'owner': return { peer: { principal: { kind: 'owner' } } }
          case 'other': return { peer: { principal: { kind: 'test-non-owner' } } }
          case 'fence': return { rejection: 403 }
          default: return { rejection: 401 }
        }
      },
    },
    clientModules: {
      graph() {
        graphReads++
        return { release, entries: ['private-entry'], secret: 'must-not-export' }
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
    request: (path = STATUS_PATH, admission = 'owner', method = 'GET') => fetch(
      `http://127.0.0.1:${server.address().port}${path}`,
      { method, headers: { 'x-test-admission': admission } },
    ),
    dispose: () => disposers.forEach(dispose => dispose()),
    graphReads: () => graphReads,
  }
}

test('owner receives only status and release fields, with no caching', async t => {
  assert.deepEqual(inject, ['webServer', 'connection', 'clientModules'])
  const f = await fixture(t, { version: '0.2.2-rc.1', commit: 'build-commit', secret: 'hidden' })
  const response = await f.request(`${STATUS_PATH}?probe=1`)
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8')
  assert.equal(response.headers.get('access-control-allow-origin'), null)
  const body = await response.json()
  assert.deepEqual(body, {
    schemaVersion: 1, status: 'adapter-ready', adapterVersion: '0.1.0',
    release: { version: '0.2.2-rc.1', commit: 'build-commit' },
  })
  const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  assert.equal(body.adapterVersion, manifest.version)
})

test('denied admission and admitted non-owner cannot read release', async t => {
  const f = await fixture(t)
  for (const [admission, status] of [['missing', 401], ['fence', 403], ['other', 403]]) {
    const response = await f.request(STATUS_PATH, admission)
    assert.equal(response.status, status)
    assert.equal(response.headers.get('cache-control'), 'no-store')
    assert.equal(await response.text(), '')
  }
  // Authentication also precedes method errors.
  assert.equal((await f.request(STATUS_PATH, 'missing', 'POST')).status, 401)
  assert.equal(f.graphReads(), 0)
})

test('only exact GET is served and disposal removes the registration', async t => {
  const f = await fixture(t)
  for (const method of ['POST', 'HEAD', 'OPTIONS']) {
    const response = await f.request(STATUS_PATH, 'owner', method)
    assert.equal(response.status, 405)
    assert.equal(response.headers.get('allow'), 'GET')
  }
  for (const path of [`${STATUS_PATH}/`, `${STATUS_PATH}/child`, '/mygo/other']) {
    assert.equal((await f.request(path)).status, 404)
  }
  assert.equal(f.graphReads(), 0)
  f.dispose()
  assert.equal((await f.request()).status, 404)
})

test('optional build commit is omitted; unavailable release is explicit', async t => {
  const f = await fixture(t, { version: '0.2.2-rc.1' })
  assert.deepEqual((await (await f.request()).json()).release, { version: '0.2.2-rc.1' })
  const absent = await fixture(t)
  assert.equal((await (await absent.request()).json()).release, null)
})

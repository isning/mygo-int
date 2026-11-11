import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer, request } from 'node:http'
import { createHash } from 'node:crypto'
import { createConnection } from 'node:net'
import { createInstanceRouter } from '../dsh-instance-router.mjs'
import { routeURL, partitionRemoteStorage } from '../../entries/dsh-startup/instance-route.js'

const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve('http://127.0.0.1:' + server.address().port)))
const call = (url, { method = 'GET', headers = {}, body } = {}) => new Promise((resolve, reject) => {
  const req = request(url, { method, headers }, res => {
    let text = ''
    res.on('data', chunk => { text += chunk })
    res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text }))
  })
  req.on('error', reject)
  req.end(body)
})

test('instance routing isolates credentials, tabs and original authority while refusing cross-site control', async () => {
  const seen = []
  const host = label => createServer((req, res) => {
    seen.push({ label, headers: req.headers })
    const cookie = 'dsh-auth-' + createHash('sha256').update(req.headers.host).digest('base64url')
    if (req.url === '/?token=unsupported-cookie-test') { res.writeHead(303, { 'set-cookie': 'unrelated=test; HttpOnly' }).end(); return }
    if (req.url === '/?token=test-' + label) { res.writeHead(303, { location: './', 'set-cookie': `${cookie}=${label}; Path=/; HttpOnly; SameSite=Strict` }).end(); return }
    if (req.headers.cookie !== `${cookie}=${label}`) { res.writeHead(401).end(); return }
    res.end(label)
  })
  const a = host('A'), b = host('B')
  const originA = await listen(a), originB = await listen(b)
  const router = createInstanceRouter({ profile: { id: 'a', name: 'A', address: originA, authenticationViewId: 'owner' } })
  const server = createServer(async (req, res) => {
    const route = router.resolve(req)
    if (!route) { res.writeHead(410).end(); return }
    if (['/mygo-local/connection', '/mygo-local/login'].includes(req.url)) await router.control(req, res, route)
    else route.carrier.handle(req, res)
  })
  const origin = await listen(server)
  let upstreamClosed
  const closed = new Promise(resolve => { upstreamClosed = resolve })
  a.on('upgrade', (req, socket) => {
    assert.equal(req.headers.origin, originA)
    assert.equal(req.headers.host, new URL(originA).host)
    socket.write('HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n')
    socket.on('end', () => socket.end())
    socket.on('close', upstreamClosed)
  })
  server.on('upgrade', (req, socket, head) => router.resolve(req).carrier.upgrade(req, socket, head))
  const post = (path, value, cookie) => call(origin + path, { method: 'POST', headers: { origin, 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body: JSON.stringify(value) })
  try {
    const loginA = await post('/mygo-local/login', { token: 'test-A' })
    assert.equal(loginA.status, 204)
    const cookieA = loginA.headers['set-cookie'][0].split(';')[0]
    assert.equal((await post('/mygo-local/login', { token: 'unsupported-cookie-test' })).status, 502, 'a redirect without the native credential is not a successful login')
    assert.equal((await call(origin + '/api/proof', { headers: { cookie: cookieA } })).text, 'A')
    const next = await post('/mygo-local/connection', { id: 'b', name: 'B', address: originB, authenticationViewId: 'owner' })
    assert.equal(next.status, 200)
    const path = JSON.parse(next.text).url
    assert.equal((await call(origin + path + 'api/proof', { headers: { cookie: cookieA } })).status, 401)
    assert.equal(seen.at(-1).headers.cookie, undefined, 'A credential never travels to B')
    const loginB = await post(path + 'mygo-local/login', { token: 'test-B' }, cookieA)
    assert.equal(loginB.status, 204)
    const cookieB = loginB.headers['set-cookie'][0].split(';')[0]
    assert.notEqual(cookieA.split('=')[0], cookieB.split('=')[0])
    const cookies = cookieA + '; ' + cookieB
    assert.equal((await call(origin + path + 'api/proof', { headers: { cookie: cookies, origin } })).text, 'B')
    assert.equal(seen.at(-1).headers.host, new URL(originB).host)
    assert.equal(seen.at(-1).headers.origin, originB)
    assert.equal((await call(origin + '/api/proof', { headers: { cookie: cookies } })).text, 'A', 'other tab remains on A')
    assert.equal((await call(origin + '/mygo-local/connection', { method: 'POST', headers: { origin: 'https://evil.invalid' }, body: '{}' })).status, 403)
    assert.equal((await call(origin + '/mygo-local/connection', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status, 403)
    assert.equal((await post('/mygo-local/connection', { id: 'b', name: 'B', address: originB + '/?token=not-allowed', authenticationViewId: 'owner' })).status, 400)
    assert.equal((await call(origin + '/mygo-instance/' + '0'.repeat(64) + '/api/proof')).status, 410)
    const wire = createConnection({ host: '127.0.0.1', port: new URL(origin).port })
    await new Promise((resolve, reject) => { wire.once('connect', resolve); wire.once('error', reject) })
    const handshake = new Promise(resolve => wire.once('data', data => resolve(data.toString())))
    wire.write(`GET /api/remote.mux HTTP/1.1\r\nHost: ${new URL(origin).host}\r\nOrigin: ${origin}\r\nCookie: ${cookieA}\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n`)
    assert.match(await handshake, /^HTTP\/1.1 101/)
    wire.destroy()
    let timer
    try {
      await Promise.race([closed, new Promise((_, reject) => { timer = setTimeout(() => reject(Error('Upstream socket did not close')), 3000) })])
    } finally { clearTimeout(timer) }
  } finally {
    router.close()
    await Promise.all([server, a, b].map(server => new Promise(resolve => server.close(resolve))))
  }
})

test('route URLs preserve query/revision and remote storage cannot clear another instance or device preferences', () => {
  const prefix = '/mygo-instance/' + 'a'.repeat(64)
  const page = new URL('http://mygo.test' + prefix + '/')
  assert.equal(routeURL('/api/events?cursor=7', page), page.origin + prefix + '/api/events?cursor=7')
  assert.equal(routeURL('plugins/client.js?rev=x', page), page.origin + prefix + '/plugins/client.js?rev=x')
  assert.equal(routeURL('ws://mygo.test/api/remote.mux', page), 'ws://mygo.test' + prefix + '/api/remote.mux')
  assert.equal(routeURL('https://other.test/resource', page), 'https://other.test/resource')
  const data = new Map([['device-preference', 'keep']])
  const storage = { get length() { return data.size }, key: index => [...data.keys()][index], getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)), removeItem: key => data.delete(key) }
  const a = partitionRemoteStorage(storage, ['a']), b = partitionRemoteStorage(storage, ['b'])
  a.setItem('session', 'A'); b.setItem('session', 'B')
  assert.equal(a.getItem('session'), 'A'); assert.equal(b.getItem('session'), 'B')
  a.clear()
  assert.equal(a.length, 0); assert.equal(b.getItem('session'), 'B')
  assert.equal(storage.getItem('device-preference'), 'keep')
})

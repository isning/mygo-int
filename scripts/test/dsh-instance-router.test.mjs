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

test('mygo starts without a privileged default instance and registers every profile through one interface', async () => {
  let router
  const server = createServer(async (req, res) => {
    const route = router.resolve(req)
    if (req.url === '/mygo-local/connection') await router.control(req, res, route)
    else if (!route) res.writeHead(410).end()
    else route.carrier.handle(req, res)
  })
  const origin = await listen(server)
  router = createInstanceRouter({ publicOrigins: [origin] })
  try {
    assert.equal(router.connected, undefined)
    assert.equal(router.resolve({ url: '/' }), undefined)
    const profile = { id: 'first', name: 'First', address: 'http://127.0.0.1:4001', authenticationViewId: 'owner' }
    const response = await call(origin + '/mygo-local/connection', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(profile) })
    assert.equal(response.status, 200)
    assert.match(JSON.parse(response.text).url, /^\/mygo-instance\/[a-f0-9]{64}\/$/)
  } finally {
    router.close()
    await new Promise(resolve => server.close(resolve))
  }
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
  let router
  const server = createServer(async (req, res) => {
    const route = router.resolve(req)
    if (!route) { res.writeHead(410).end(); return }
    if (['/mygo-local/connection', '/mygo-local/login'].includes(req.url)) await router.control(req, res, route)
    else route.carrier.handle(req, res)
  })
  const origin = await listen(server)
  router = createInstanceRouter({ connectedProfile: { id: 'a', name: 'A', address: originA, authenticationViewId: 'owner' }, publicOrigins: [origin] })
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
    assert.equal(loginA.headers['set-cookie'], undefined, 'DSH credentials stay in the mygo proxy')
    assert.equal((await post('/mygo-local/login', { token: 'unsupported-cookie-test' })).status, 502, 'a redirect without the native credential is not a successful login')
    assert.equal((await call(origin + '/api/proof')).status, 410, 'unscoped remote paths never fall back to an implicit instance')
    const proofA = await call(origin + router.connected.prefix + '/api/proof')
    assert.equal(proofA.text, 'A', JSON.stringify({ status: proofA.status, upstream: seen.at(-1) }))
    const next = await post('/mygo-local/connection', { id: 'b', name: 'B', address: originB, authenticationViewId: 'owner' })
    assert.equal(next.status, 200)
    const path = JSON.parse(next.text).url
    assert.equal((await call(origin + path + 'api/proof')).status, 401)
    assert.equal(seen.at(-1).headers.cookie, undefined, 'A credential never travels to B')
    const loginB = await post(path + 'mygo-local/login', { token: 'test-B' })
    assert.equal(loginB.status, 204)
    assert.equal(loginB.headers['set-cookie'], undefined)
    assert.equal((await call(origin + path + 'api/proof', { headers: { origin } })).text, 'B')
    assert.equal(seen.at(-1).headers.host, new URL(originB).host)
    assert.equal(seen.at(-1).headers.origin, originB)
    assert.equal((await call(origin + router.connected.prefix + '/api/proof')).text, 'A', 'other tab remains on A')
    const removalBody = JSON.stringify({ id: 'b', name: 'B', address: originB, authenticationViewId: 'owner' })
    const removed = await call(origin + '/mygo-local/connection', { method: 'DELETE', headers: { origin, 'content-type': 'application/json', 'content-length': Buffer.byteLength(removalBody) }, body: removalBody })
    assert.equal(removed.status, 204, removed.text)
    assert.equal((await call(origin + path + 'api/proof')).status, 410, 'removed routes cannot retain access to the instance')
    assert.equal((await call(origin + '/mygo-local/connection', { method: 'POST', headers: { origin: 'https://evil.invalid' }, body: '{}' })).status, 403)
    assert.equal((await call(origin + '/mygo-local/connection', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status, 403)
    assert.equal((await post('/mygo-local/connection', { id: 'b', name: 'B', address: originB + '/?token=not-allowed', authenticationViewId: 'owner' })).status, 400)
    const self = await post('/mygo-local/connection', { id: 'self', name: 'Self', address: origin, authenticationViewId: 'owner' })
    assert.equal(self.status, 200, 'instance registration does not special-case addresses')
    assert.equal((await call(origin + JSON.parse(self.text).url + 'api/proof')).status, 410, 'a mygo target cannot escape into another instance route')
    assert.equal((await call(origin + '/mygo-instance/' + '0'.repeat(64) + '/api/proof')).status, 410)
    const wire = createConnection({ host: '127.0.0.1', port: new URL(origin).port })
    await new Promise((resolve, reject) => { wire.once('connect', resolve); wire.once('error', reject) })
    const handshake = new Promise(resolve => wire.once('data', data => resolve(data.toString())))
    wire.write(`GET ${router.connected.prefix}/api/remote.mux HTTP/1.1\r\nHost: ${new URL(origin).host}\r\nOrigin: ${origin}\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n`)
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

test('mygo stores a launch token per instance and restores the reverse proxy after restart', async () => {
  const host = createServer((req, res) => {
    const cookie = 'dsh-auth-' + createHash('sha256').update(req.headers.host).digest('base64url')
    if (req.url === '/?token=durable-token') { res.writeHead(303, { 'set-cookie': `${cookie}=owner; Path=/; HttpOnly; SameSite=Strict` }).end(); return }
    if (req.headers.cookie === `${cookie}=owner`) { res.end('authenticated'); return }
    res.writeHead(401).end()
  })
  const upstream = await listen(host)
  const profile = { id: 'saved', name: 'Saved', address: upstream, authenticationViewId: 'owner' }
  let savedCredentials = { version: 1, entries: {} }
  const start = async () => {
    const router = createInstanceRouter({ connectedProfile: profile, credentials: savedCredentials, onCredentials(value) { savedCredentials = structuredClone(value) } })
    const server = createServer(async (req, res) => {
      const route = router.resolve(req)
      if (!route) { res.writeHead(410).end(); return }
      if (req.method === 'GET' && new URL(req.url, 'http://localhost').searchParams.has('token')) await router.loginLink(req, res, route)
      else if (req.url === '/mygo-local/login') await router.control(req, res, route)
      else route.carrier.handle(req, res)
    })
    return { router, server, origin: await listen(server) }
  }
  let running = await start()
  try {
    const post = (origin, value, cookie) => call(origin + '/mygo-local/login', { method: 'POST', headers: { origin, 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body: JSON.stringify(value) })
    const first = await call(running.origin + '/?token=durable-token')
    assert.equal(first.status, 303)
    assert.match(first.headers.location, /^\/mygo-instance\/[a-f0-9]{64}\/$/)
    assert.equal(first.headers['set-cookie'], undefined, 'the browser never receives the upstream DSH credential')
    assert.equal(JSON.stringify(savedCredentials).includes('durable-token'), true, 'the private server credential store retains the instance token')
    running.router.close()
    await new Promise(resolve => running.server.close(resolve))

    running = await start()
    assert.equal((await call(running.origin + running.router.connected.prefix + '/proof')).text, 'authenticated')
    const restored = await post(running.origin, {})
    assert.equal(restored.status, 204, 'the stored launch token can refresh the native upstream credential')
  } finally {
    running.router.close()
    await new Promise(resolve => running.server.close(resolve))
    await new Promise(resolve => host.close(resolve))
  }
})

test('a stale route for the same instance identity follows the current connection profile', async () => {
  const stale = { id: 'stable', name: 'Stable', address: 'http://127.0.0.1:1', authenticationViewId: 'owner' }
  const currentHost = createServer((req, res) => {
    const cookie = 'dsh-auth-' + createHash('sha256').update(req.headers.host).digest('base64url')
    if (req.url === '/?token=stable-token') { res.writeHead(303, { 'set-cookie': `${cookie}=current; Path=/; HttpOnly` }).end(); return }
    if (req.headers.cookie === `${cookie}=current`) { res.end('current'); return }
    res.writeHead(401).end()
  })
  const currentOrigin = await listen(currentHost)
  const current = { ...stale, address: currentOrigin }
  const staleId = createHash('sha256').update(JSON.stringify(stale)).digest('hex')
  const credentialId = createHash('sha256').update(JSON.stringify([stale.id, stale.authenticationViewId])).digest('hex')
  const router = createInstanceRouter({ connectedProfile: current, profiles: [stale], credentials: { version: 2, entries: {
    [credentialId]: { address: stale.address, token: 'stable-token', cookie: 'dsh-auth-old=stale' },
  } } })
  const req = { url: `/mygo-instance/${staleId}/proof` }
  const server = createServer(async (req, res) => {
    const route = router.resolve(req)
    if (req.url === '/mygo-local/login') await router.control(req, res, route)
    else route.carrier.handle(req, res)
  })
  const origin = await listen(server)
  try {
    const route = router.resolve(req)
    assert.equal(route.profile.address, currentOrigin)
    assert.equal(req.url, '/proof')
    assert.deepEqual(router.profiles(), [current], 'historical addresses are omitted from persisted route metadata')
    const prefix = `/mygo-instance/${staleId}`
    assert.equal((await call(origin + prefix + '/proof')).status, 401, 'an authority-bound cookie is not reused at the new address')
    const refreshed = await call(origin + prefix + '/mygo-local/login', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: '{}' })
    assert.equal(refreshed.status, 204, 'the stable instance token is exchanged at the new address')
    assert.equal((await call(origin + prefix + '/proof')).text, 'current')
  } finally {
    router.close()
    await Promise.all([server, currentHost].map(value => new Promise(resolve => value.close(resolve))))
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

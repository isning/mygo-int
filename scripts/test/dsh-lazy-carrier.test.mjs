import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createServer, request } from 'node:http'
import { createLazyCarrier } from '../dsh-lazy-carrier.mjs'
import { LAZY_OWNER, LAZY_PATH, lazyBundleReferences } from '../../entries/dsh-startup/lazy-resources.js'

const graph = rev => ({ entries: [{ id: LAZY_OWNER, rev, url: `plugins/??${LAZY_OWNER}/client.js&rev=${rev}` }] })
const listen = async server => { await new Promise(r => server.listen(0, '127.0.0.1', r)); return `http://127.0.0.1:${server.address().port}` }
const close = server => new Promise(r => server.close(r))

test('one exact owner, file and revision; malformed or duplicate owner fails closed', () => {
  assert.deepEqual([...lazyBundleReferences(graph('abc'))], [LAZY_PATH.slice(1) + '?rev=abc'])
  for (const value of [null, { entries: [] }, { entries: [...graph('abc').entries, ...graph('abc').entries] }, graph('../x')]) assert.throws(() => lazyBundleReferences(value))
  const value = graph('abc'); value.entries[0].url += ',other/client.js'; assert.throws(() => lazyBundleReferences(value))
})

test('real HTTP forwarding preserves JS bytes, fences requests, refreshes graph and denies redirects', async () => {
  let rev = 'abc', hits = 0, redirect = false, wrongType = false
  const bytes = Buffer.from('window.__ModuleLoader__.load({chunk:"client.terminal.js"});\n')
  const upstream = createServer((req, res) => {
    assert.equal(req.headers.cookie, 'owner=test-only')
    if (req.url === '/mygo/index-injections') return res.end(JSON.stringify({ schemaVersion: 1, injections: [{ kind: 'global', name: '__DSH_BOOT__', value: graph(rev) }] }))
    hits++
    if (redirect) return res.writeHead(302, { Location: '/forbidden' }).end()
    res.writeHead(200, { 'Content-Type': wrongType ? 'text/html' : 'text/javascript; charset=utf-8', 'Set-Cookie': 'never=forward' }).end(bytes)
  })
  const remote = await listen(upstream)
  const carrier = createLazyCarrier({ origin: remote, cookie: 'owner=test-only' })
  const server = createServer(async (req, res) => { if (!await carrier(req, res)) res.writeHead(404).end() })
  const local = await listen(server)
  try {
    const get = (suffix = '?rev=abc', init) => fetch(local + LAZY_PATH + suffix, init)
    const result = await get()
    assert.equal(result.status, 200); assert.deepEqual(Buffer.from(await result.arrayBuffer()), bytes)
    assert.equal(result.headers.get('cache-control'), 'no-store'); assert.equal(result.headers.get('set-cookie'), null)
    for (const suffix of ['', '?rev=stale', '?rev=abc&extra=1', '.map?rev=abc']) assert.equal((await get(suffix)).status, 404)
    for (const headers of [{ origin: remote }, { 'sec-fetch-site': 'cross-site' }]) assert.equal((await get('?rev=abc', { headers })).status, 403)
    const badHost = await new Promise((resolve, reject) => {
      const req = request(local + LAZY_PATH + '?rev=abc', { headers: { host: 'untrusted.invalid' } }, res => { res.resume(); resolve(res.statusCode) })
      req.on('error', reject); req.end()
    })
    assert.equal(badHost, 403)
    assert.equal((await get('?rev=abc', { method: 'POST' })).status, 405)
    assert.equal(hits, 1, 'denied requests never request target JS')
    rev = 'next'; assert.equal((await get()).status, 404)
    assert.equal((await get('?rev=next')).status, 200)
    redirect = true; assert.equal((await get('?rev=next')).status, 502)
    redirect = false; wrongType = true; assert.equal((await get('?rev=next')).status, 502)
    assert.equal(hits, 4, 'redirect destination never requested')
  } finally { await close(server); await close(upstream) }
})

test('configuration rejects non-loopback origins and invalid cookie', () => {
  for (const origin of ['https://127.0.0.1', 'http://localhost', 'http://127.0.0.1/path', 'http://x@127.0.0.1']) assert.throws(() => createLazyCarrier({ origin, cookie: 'x=y' }))
  for (const cookie of ['', undefined, 'x\r\ny']) assert.throws(() => createLazyCarrier({ origin: 'http://127.0.0.1:1234', cookie }))
})

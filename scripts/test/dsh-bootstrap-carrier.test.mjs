import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer, request } from 'node:http'
import { createBootstrapCarrier, graphBundleReferences } from '../dsh-bootstrap-carrier.mjs'

const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`)))
const close = server => new Promise(resolve => server.close(resolve))
test('owner capability stays within injections and exact graph-declared bundles', async () => {
  const calls = []
  const bootstrap = '/plugins/??bootstrap/client.js&rev=123'
  const application = '/plugins/??@example/app/client.js&rev=456'
  const batch = '/plugins/??@example/app/client.js&rev=batch456'
  const rows = [{ kind: 'script-src', src: bootstrap.slice(1), placement: 'head' }, { kind: 'global', name: '__DSH_BOOT__', value: {
    entries: [{ id: '@example/app', url: application.slice(1), rev: '456' }],
    batches: [{ phase: 'application', entries: ['@example/app'], url: batch.slice(1), rev: 'batch456' }],
  } }]
  const remote = createServer((req, res) => {
    calls.push({ path: req.url, cookie: req.headers.cookie })
    res.setHeader('Content-Type', 'application/json')
    res.end(req.url === '/mygo/index-injections' ? JSON.stringify({ schemaVersion: 1, injections: rows }) : 'bootstrap bytes')
  })
  const origin = await listen(remote)
  const handler = createBootstrapCarrier({ origin, cookie: 'test-owner=private' })
  const local = createServer(async (req, res) => { if (!await handler(req, res)) res.writeHead(404).end() })
  const url = await listen(local)
  try {
    for (const headers of [{ origin: 'http://other.invalid' }, { host: 'other.invalid' }, { 'sec-fetch-site': 'cross-site' }]) {
      const status = await new Promise((resolve, reject) => {
        const req = request(url + '/mygo/index-injections', { headers }, res => { res.resume(); res.on('end', () => resolve(res.statusCode)) })
        req.on('error', reject); req.end()
      })
      assert.equal(status, 403)
    }
    assert.equal((await fetch(url + '/mygo/index-injections', { method: 'POST' })).status, 405)
    assert.equal(calls.length, 0)
    assert.equal((await fetch(url + bootstrap)).status, 404)
    const result = await fetch(url + '/mygo/index-injections')
    assert.deepEqual(await result.json(), { schemaVersion: 1, injections: rows })
    assert.equal(result.headers.get('cache-control'), 'no-store')
    assert.equal(await (await fetch(url + bootstrap)).text(), 'bootstrap bytes')
    assert.equal(await (await fetch(url + application)).text(), 'bootstrap bytes')
    assert.equal(await (await fetch(url + batch)).text(), 'bootstrap bytes')
    assert.equal((await fetch(url + batch, { headers: { origin: 'http://other.invalid' } })).status, 403)
    assert.equal((await fetch(url + batch, { method: 'POST' })).status, 405)
    assert.equal((await fetch(url + application.replace('456', '457'))).status, 404)
    assert.equal((await fetch(url + '/plugins/@example/app/client.lazy.js?rev=456')).status, 404)
    assert.equal((await fetch(url + '/plugins/@example/app/assets/private.png')).status, 404)
    assert.equal((await fetch(url + bootstrap + 'different')).status, 404)
    assert.equal((await fetch(url + '/plugins/??application/client.js&rev=123')).status, 404)
    assert.equal((await fetch(url + '/rpc')).status, 404)
    assert.equal(calls.length, 4)
    assert.ok(calls.every(call => call.cookie === 'test-owner=private'))
  } finally { await close(local); await close(remote) }
})

test('graph capability rejects arbitrary URLs, changed revisions and undeclared batch members', () => {
  const row = { id: '@example/app', url: 'plugins/??@example/app/client.js&rev=456', rev: '456' }
  const batch = { phase: 'application', entries: [row.id], url: row.url, rev: row.rev }
  for (const url of ['https://other.invalid/code.js', '/rpc', row.url + '&extra=1', row.url.replace('456', '457')]) {
    assert.throws(() => graphBundleReferences({ entries: [{ ...row, url }], batches: [batch] }))
  }
  assert.throws(() => graphBundleReferences({ entries: [row], batches: [{ ...batch, entries: ['other'] }] }))
  assert.throws(() => graphBundleReferences({ entries: [row], batches: [] }))
})

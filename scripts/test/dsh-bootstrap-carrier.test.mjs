import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer, request } from 'node:http'
import { createBootstrapCarrier } from '../dsh-bootstrap-carrier.mjs'

const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`)))
const close = server => new Promise(resolve => server.close(resolve))
test('owner capability stays within injections and exact declared bootstrap scripts', async () => {
  const calls = []
  const bootstrap = '/plugins/??bootstrap/client.js&rev=123'
  const rows = [{ kind: 'script-src', src: bootstrap.slice(1), placement: 'head' }, { kind: 'global', name: '__DSH_BOOT__', value: { entries: [1] } }]
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
    assert.equal((await fetch(url + bootstrap + 'different')).status, 404)
    assert.equal((await fetch(url + '/plugins/??application/client.js&rev=123')).status, 404)
    assert.equal((await fetch(url + '/rpc')).status, 404)
    assert.equal(calls.length, 2)
    assert.ok(calls.every(call => call.cookie === 'test-owner=private'))
  } finally { await close(local); await close(remote) }
})

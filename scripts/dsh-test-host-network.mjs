// Verify the owned public listener without reading or exposing Host credentials.
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { request } from 'node:http'
import { loadOriginalSocketLibrary } from './dsh-session-carrier.mjs'
const status = JSON.parse(await readFile('.scratch/test-dsh/status.json', 'utf8'))
const origin = new URL(status.clientUrl).origin
const http = (path, headers = {}) => new Promise((resolve, reject) => {
  const req = request(new URL(path, origin), { headers, timeout: 10000 }, res => {
    let body = ''
    res.on('data', bytes => { body += bytes })
    res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }))
  })
  req.on('error', reject)
  req.on('timeout', () => req.destroy(Error('HTTP timeout')))
  req.end()
})
const page = await http('/')
assert.equal(page.status, 200)
assert.equal((await http('/', { host: 'untrusted.invalid' })).status, 403)
assert.equal((await http('/mygo/index-injections', { origin: 'http://untrusted.invalid' })).status, 403)
assert.equal((await http('/mygo/index-injections', { origin, 'sec-fetch-site': 'cross-site' })).status, 403)
const injection = await http('/mygo/index-injections', { origin })
assert.equal(injection.status, 200)
assert.equal(injection.headers['set-cookie'], undefined)
const graph = JSON.parse(injection.body)
assert.ok(graph.injections.some(row => row.name === '__DSH_BOOT__'))
assert.equal((await fetch(status.localClientUrl)).status, 200)
assert.equal((await fetch(status.origin + '/mygo/status')).status, 401)
const { WebSocket } = loadOriginalSocketLibrary(process.cwd())
const socketUrl = new URL('/api/remote.mux', origin); socketUrl.protocol = 'ws:'
async function socket(headers, expected) {
  await new Promise((resolve, reject) => {
    const ws = new WebSocket(socketUrl, { headers, handshakeTimeout: 10000 })
    ws.on('error', reject)
    ws.on('open', () => {
      if (expected !== 101) { ws.close(); reject(Error('Unexpected admitted socket')); return }
      ws.close()
    })
    ws.on('close', () => { if (expected === 101) resolve() })
    ws.on('unexpected-response', (_req, response) => {
      response.resume()
      try { assert.equal(response.statusCode, expected); resolve() } catch (error) { reject(error) }
    })
  })
}
await socket({ origin }, 101)
await socket({ origin: 'http://untrusted.invalid' }, 403)
await socket({}, 403)
await socket({ origin, host: 'untrusted.invalid' }, 403)
const result = { ok: true, origin, socketUrl: socketUrl.href, publicHTTP: 200, publicWebSocket: 101, untrustedHost: 403, untrustedOrigin: 403, missingSocketOrigin: 403, upstreamUnauthenticated: 401, loopbackHTTP: 200 }
await writeFile('.scratch/test-dsh/network-validation.json', JSON.stringify(result, null, 2), { mode: 0o600 })
console.log(JSON.stringify(result, null, 2))

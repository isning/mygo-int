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
assert.equal(page.status, 401)
assert.equal((await http('/mygo-local/admission')).status,401)
assert.equal((await http('/', { host: 'untrusted.invalid' })).status, 403)
assert.equal((await http('/mygo/index-injections', { origin: 'http://untrusted.invalid' })).status, 403)
assert.equal((await http('/mygo/index-injections', { origin, 'sec-fetch-site': 'cross-site' })).status, 403)
assert.equal((await http('/mygo/index-injections', { origin })).status, 401)
const launch = new URL(await readFile('.scratch/test-dsh/client-launch-url', 'utf8'))
const login = await http(launch.pathname + launch.search)
assert.equal(login.status, 303)
assert.equal(login.headers.location, './')
const cookie = login.headers['set-cookie'].map(x => x.split(';')[0]).join('; ')
assert.equal((await http('/', {cookie})).status, 200)
assert.equal((await http('/mygo-local/admission', {origin,cookie})).status,204)
assert.equal((await http('/mygo-local/admission'+launch.search)).status,401,'local probe never exchanges a launch token')
assert.equal((await http('/mygo-local/admission', {origin:'http://untrusted.invalid',cookie})).status,403)
assert.equal((await http('/api/session/create', {origin})).status, 401)
const wrongAudience = await readFile('.scratch/test-dsh/owner-cookie', 'utf8')
assert.equal((await http('/mygo/index-injections', {origin, cookie:wrongAudience})).status, 401)
assert.equal((await http('/mygo-local/admission', {origin,cookie:wrongAudience})).status,401)
assert.equal((await http('/mygo-local/admission', {origin,cookie:cookie+'tamper'})).status,401)
assert.equal((await http('/mygo/index-injections', {origin, cookie:cookie+'tamper'})).status, 401)
const injection = await http('/mygo/index-injections', { origin, cookie })
assert.equal(injection.status, 200)
assert.equal(injection.headers['set-cookie'], undefined)
const graph = JSON.parse(injection.body)
assert.ok(graph.injections.some(row => row.name === '__DSH_BOOT__'))
assert.equal((await http('/', {host:new URL(status.localClientUrl).host})).status, 401)
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
await socket({ origin }, 401)
await socket({ origin, cookie }, 101)
await socket({ origin, cookie:wrongAudience }, 401)
await socket({ origin: 'http://untrusted.invalid' }, 403)
await socket({}, 403)
await socket({ origin, host: 'untrusted.invalid' }, 403)
// Original /connect creates an independent owner operator, never a guest.
const operator=await http('/connect'+launch.search)
assert.equal(operator.status,302)
assert.equal(operator.headers.location,'./api/remote.mux')
const operatorCookie=operator.headers['set-cookie'].map(x=>x.split(';')[0]).join('; ')
assert.equal((await http('/mygo/status',{origin,cookie:operatorCookie})).status,200)
await socket({origin,cookie:operatorCookie},101)
let released=false
for(let i=0;i<40;i++){
 if((await http('/mygo/status',{origin,cookie:operatorCookie})).status===401){released=true;break}
 await new Promise(resolve=>setTimeout(resolve,50))
}
assert.ok(released,'original API Peer revoked when its owning socket closes')
assert.equal((await http('/mygo/status',{origin,cookie})).status,200,'browser auth unaffected by independent operator release')
const result = { ok: true, operatorReleased:true, originalConnect:302, origin, socketUrl: socketUrl.href, publicHTTP: 401, publicWebSocket: 401, authenticatedHTTP: 200, authenticatedWebSocket: 101, wrongAuthorityCookie: 401, tamperedCookie: 401, untrustedHost: 403, untrustedOrigin: 403, missingSocketOrigin: 403, upstreamUnauthenticated: 401, loopbackHTTP: 401 }
result.localManagementAdmission = { anonymous:401, authenticated:204, launchTokenNotExchanged:401, wrongAuthority:401, tamperedCookie:401, untrustedOrigin:403 }
await writeFile('.scratch/test-dsh/network-validation.json', JSON.stringify(result, null, 2), { mode: 0o600 })
console.log(JSON.stringify(result, null, 2))

// Fixed-target transport. DSH alone authenticates and authorizes the browser.
import { request as httpRequest } from 'node:http'
import { createHash } from 'node:crypto'
import { Transform } from 'node:stream'
import { createCarrierTrust } from './dsh-carrier-trust.mjs'

const HOP = new Set(['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade'])
export function createAuthenticatedCarrier({ origin, publicOrigins = [], maxBodyBytes = 300 * 1024 * 1024 }) {
  const target = new URL(origin)
  if (target.protocol !== 'http:' || target.hostname !== '127.0.0.1' || target.pathname !== '/' || target.search || target.hash || target.username || target.password) throw Error('Expected fixed loopback DSH origin')
  const trusted = createCarrierTrust({ publicOrigins })
  const active = new Set()
  function headers(req, upgrade = false) {
    const blocked = new Set([...HOP, ...(req.headers.connection ?? '').toLowerCase().split(',').map(x => x.trim())])
    const out = {}
    for (const [key, value] of Object.entries(req.headers)) {
      if (value !== undefined && !blocked.has(key) && !key.startsWith('forwarded') && !key.startsWith('x-forwarded-') && !['cookie', 'authorization', 'proxy-authorization'].includes(key)) out[key] = value
    }
    // Forward only the original DSH credential for this exact authority, never
    // unrelated browser cookies, a launcher's cookie or a synthesized principal.
    const name = 'dsh-auth-' + createHash('sha256').update(req.headers.host).digest('base64url')
    const cookie = req.headers.cookie?.split(';').map(x => x.trim()).filter(x => x.startsWith(name + '='))
    if (cookie?.length === 1) out.cookie = cookie[0]
    if (upgrade) { out.connection = 'Upgrade'; out.upgrade = 'websocket' }
    return out
  }
  function valid(req, socket = false) {
    return trusted(req, socket) && typeof req.url === 'string' && req.url.startsWith('/') && !req.url.startsWith('//') && !/[\\\r\n]/.test(req.url)
  }
  function track(socket) { active.add(socket); socket.once('close', () => active.delete(socket)) }
  return {
    // Read-only admission probe for device-local management. Original DSH decides
    // whether this exact browser credential is admitted; Host/Origin stay intact.
    admit(req, res) {
      if (!valid(req) || req.method !== 'GET') { res.writeHead(403).end(); return }
      const upstream = httpRequest(target, { path: '/', method: 'GET', headers: headers(req), agent: false }, reply => {
        reply.resume()
        res.writeHead(reply.statusCode === 200 ? 204 : reply.statusCode === 401 ? 401 : 403,
          { 'cache-control': 'no-store' }).end()
      })
      upstream.on('socket', track)
      upstream.setTimeout(15000, () => upstream.destroy())
      upstream.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end() })
      upstream.end()
    },
    handle(req, res, indexHTML) {
      if (!valid(req)) { res.writeHead(403).end(); return }
      if (indexHTML !== undefined && ['GET', 'HEAD'].includes(req.method) && !new URL(req.url, 'http://localhost').search) {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' }).end(req.method === 'HEAD' ? undefined : indexHTML)
        return
      }
      let size = 0
      const upstream = httpRequest(target, { path: req.url, method: req.method, headers: headers(req), agent: false }, reply => {
        if (indexHTML !== undefined && reply.statusCode === 200) {
          reply.resume()
          res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' }).end(req.method === 'HEAD' ? undefined : indexHTML)
        } else {
          const responseHeaders = Object.fromEntries(Object.entries(reply.headers).filter(([key]) => !HOP.has(key)))
          // Original redirects are returned, never followed by this transport.
          res.writeHead(reply.statusCode, responseHeaders)
          reply.pipe(res)
        }
      })
      upstream.on('socket', track)
      upstream.setTimeout(120000, () => upstream.destroy())
      upstream.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end() })
      const bound = new Transform({ transform(chunk, encoding, done) {
        size += chunk.length
        if (size > maxBodyBytes) { if (!res.headersSent) res.writeHead(413).end(); upstream.destroy(); done(Error('Transport body limit')); return }
        done(null, chunk)
      } })
      bound.on('error', () => {})
      req.pipe(bound).pipe(upstream)
      req.on('aborted', () => upstream.destroy())
      res.on('close', () => upstream.destroy())
    },
    upgrade(req, socket, head) {
      if (!valid(req, true)) { socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); return }
      const upstream = httpRequest(target, { path: req.url, method: 'GET', headers: headers(req, true), agent: false })
      track(socket)
      upstream.on('upgrade', (reply, remote, remoteHead) => {
        track(remote)
        remote.setTimeout(0)
        socket.write('HTTP/1.1 101 Switching Protocols\r\n' + Object.entries(reply.headers).map(([k, v]) => `${k}: ${v}\r\n`).join('') + '\r\n')
        if (remoteHead.length) socket.write(remoteHead)
        if (head.length) remote.write(head)
        socket.pipe(remote).pipe(socket)
        socket.on('close', () => remote.destroy())
        remote.on('close', () => socket.destroy())
        remote.on('error', () => socket.destroy())
      })
      upstream.on('response', reply => { reply.resume(); socket.end(`HTTP/1.1 ${reply.statusCode} Rejected\r\nConnection: close\r\n\r\n`) })
      upstream.on('error', () => socket.destroy())
      socket.on('error', () => upstream.destroy())
      socket.on('close', () => upstream.destroy())
      upstream.setTimeout(15000, () => upstream.destroy())
      upstream.end()
    },
    close() { for (const socket of active) socket.destroy() },
  }
}

// Fixed-target transport. DSH alone authenticates and authorizes the browser.
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { createHash } from 'node:crypto'
import { Transform } from 'node:stream'
import { createCarrierTrust } from './dsh-carrier-trust.mjs'

const HOP = new Set(['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade'])
export function createAuthenticatedCarrier({ origin, publicOrigins = [], maxBodyBytes = 300 * 1024 * 1024, credentialNamespace, pathPrefix = '', getCredential }) {
  const target = new URL(origin)
  if ((!credentialNamespace && (target.protocol !== 'http:' || target.hostname !== '127.0.0.1')) || !['http:', 'https:'].includes(target.protocol) || target.pathname !== '/' || target.search || target.hash || target.username || target.password) throw Error('Expected a configured DSH origin')
  const transport = target.protocol === 'https:' ? httpsRequest : httpRequest
  const trusted = createCarrierTrust({ publicOrigins })
  const active = new Set()
  const upstreamCookie = req => 'dsh-auth-' + createHash('sha256').update(credentialNamespace ? target.host : req.headers.host).digest('base64url')
  const browserCookie = req => credentialNamespace
    ? 'mygo-dsh-' + createHash('sha256').update(req.headers.host + ':' + credentialNamespace).digest('base64url') : upstreamCookie(req)
  function responseHeaders(req, reply) {
    const out = Object.fromEntries(Object.entries(reply.headers).filter(([key]) => !HOP.has(key)))
    if (credentialNamespace && getCredential) delete out['set-cookie']
    else if (credentialNamespace && out['set-cookie']) {
      out['set-cookie'] = out['set-cookie'].filter(value => value.startsWith(upstreamCookie(req) + '='))
        .map(value => {
          const cookie = value.replace(upstreamCookie(req) + '=', browserCookie(req) + '=')
          const secure = req.socket.encrypted || publicOrigins.some(origin => {
            const url = new URL(origin)
            return url.host === req.headers.host && url.protocol === 'https:'
          })
          return secure ? /;\s*Secure(?:;|$)/i.test(cookie) ? cookie : cookie + '; Secure' : cookie.replace(/;\s*Secure(?=;|$)/ig, '')
        })
    }
    if (pathPrefix && typeof out.location === 'string' && out.location.startsWith('/') && !out.location.startsWith('//')) out.location = pathPrefix + out.location
    return out
  }
  function headers(req, upgrade = false) {
    const blocked = new Set([...HOP, ...(req.headers.connection ?? '').toLowerCase().split(',').map(x => x.trim())])
    const out = {}
    for (const [key, value] of Object.entries(req.headers)) {
      if (value !== undefined && !blocked.has(key) && !key.startsWith('forwarded') && !key.startsWith('x-forwarded-') && !['cookie', 'authorization', 'proxy-authorization'].includes(key)) out[key] = value
    }
    // Forward only the original DSH credential for this exact authority, never
    // unrelated browser cookies, a launcher's cookie or a synthesized principal.
    const stored = getCredential?.()
    if (stored) out.cookie = stored
    else if (!getCredential) {
      const name = browserCookie(req)
      const cookie = req.headers.cookie?.split(';').map(x => x.trim()).filter(x => x.startsWith(name + '='))
      if (cookie?.length === 1) out.cookie = cookie[0].replace(name + '=', upstreamCookie(req) + '=')
    }
    // The public edge is validated before this authority translation. Credentials
    // remain signed and admitted by the target Host, never synthesized here.
    if (credentialNamespace) {
      out.host = target.host
      if (out.origin) out.origin = target.origin
      delete out.referer
    }
    if (upgrade) { out.connection = 'Upgrade'; out.upgrade = 'websocket' }
    return out
  }
  function valid(req, socket = false) {
    return trusted(req, socket) && typeof req.url === 'string' && req.url.startsWith('/') && !req.url.startsWith('//') && !/[\\\r\n]/.test(req.url)
  }
  function transportFailure(res, error) {
    if (res.headersSent) { res.destroy(error); return }
    const code = typeof error?.code === 'string' ? error.code : 'UPSTREAM_UNAVAILABLE'
    res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' })
      .end(`Unable to connect to the selected instance (${code})`)
  }
  function track(socket) { active.add(socket); socket.once('close', () => active.delete(socket)) }
  return {
    // Read-only admission probe for device-local management. Original DSH decides
    // whether this exact browser credential is admitted; Host/Origin stay intact.
    admit(req, res) {
      if (!valid(req) || req.method !== 'GET') { res.writeHead(403).end(); return }
      const upstream = transport(target, { path: '/', method: 'GET', headers: headers(req), agent: false }, reply => {
        reply.resume()
        res.writeHead(reply.statusCode === 200 ? 204 : reply.statusCode === 401 ? 401 : 403,
          { 'cache-control': 'no-store' }).end()
      })
      upstream.on('socket', track)
      upstream.setTimeout(15000, () => upstream.destroy())
      upstream.on('error', error => transportFailure(res, error))
      upstream.end()
    },
    login(req, res, token, { onAccepted, successStatus = 204, successHeaders = {} } = {}) {
      if (!valid(req) || !['GET', 'POST'].includes(req.method)) { res.writeHead(403).end(); return }
      const loginHeaders = headers(req)
      delete loginHeaders['content-length']
      delete loginHeaders['content-type']
      const upstream = transport(target, { path: '/?token=' + encodeURIComponent(token), method: 'GET', headers: loginHeaders, agent: false }, async reply => {
        reply.resume()
        const cookies = reply.headers['set-cookie']?.filter(value => value.startsWith(upstreamCookie(req) + '='))
        const credential = cookies?.[0]?.split(';', 1)[0]
        const status = reply.statusCode === 303 && credential ? 204
          : reply.statusCode >= 400 && reply.statusCode <= 599 ? reply.statusCode : 502
        if (status === 204) {
          try { await onAccepted?.(credential) } catch { res.writeHead(500, { 'cache-control': 'no-store' }).end(); return }
        }
        const browserCookies = !getCredential && status === 204 ? responseHeaders(req, reply)['set-cookie'] : undefined
        const responseStatus = status === 204 ? successStatus : status
        res.writeHead(responseStatus, { 'cache-control': 'no-store', ...(status === 204 ? successHeaders : {}), ...(browserCookies?.length ? { 'set-cookie': browserCookies } : {}) }).end()
      })
      upstream.on('socket', track)
      upstream.setTimeout(15000, () => upstream.destroy())
      upstream.on('error', error => transportFailure(res, error))
      upstream.end()
    },
    handle(req, res, indexHTML) {
      if (!valid(req)) { res.writeHead(403).end(); return }
      if (indexHTML !== undefined && ['GET', 'HEAD'].includes(req.method) && !new URL(req.url, 'http://localhost').search) {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' }).end(req.method === 'HEAD' ? undefined : indexHTML)
        return
      }
      let size = 0
      const upstream = transport(target, { path: req.url, method: req.method, headers: headers(req), agent: false }, reply => {
        if (indexHTML !== undefined && reply.statusCode === 200) {
          reply.resume()
          res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' }).end(req.method === 'HEAD' ? undefined : indexHTML)
        } else {
          // Original redirects are returned, never followed by this transport.
          res.writeHead(reply.statusCode, responseHeaders(req, reply))
          reply.pipe(res)
        }
      })
      upstream.on('socket', track)
      upstream.setTimeout(120000, () => upstream.destroy())
      upstream.on('error', error => transportFailure(res, error))
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
      const upstream = transport(target, { path: req.url, method: 'GET', headers: headers(req, true), agent: false })
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

// Narrow original file-menu Remote capability, with explicit server-owned targets.
import { createCarrierTrust } from './dsh-carrier-trust.mjs'
const paths = new Set(['/api/workspaceFiles/stat', '/api/workspaceFiles/readBytes'])
const keys = value => value && typeof value === 'object' && !Array.isArray(value) ? Object.keys(value).sort().join(',') : undefined
const identity = value => typeof value === 'string' && value.length > 0 && value.length <= 4096 && !/[\x00-\x1f\x7f]/.test(value)
export function createDownloadCarrier({ origin, cookie, publicOrigins = [], targets = [] }) {
  const remote = new URL(origin)
  if (remote.protocol !== 'http:' || remote.hostname !== '127.0.0.1' || remote.pathname !== '/' || remote.search || remote.hash || remote.username || remote.password) throw Error('Download origin must be loopback HTTP')
  if (typeof cookie !== 'string' || !cookie || /[\r\n]/.test(cookie)) throw Error('Invalid owner cookie')
  const grants = targets.map(target => {
    if (keys(target) !== 'path,sessionId' || !identity(target.sessionId) || target.sessionId.length > 256 || !identity(target.path)) throw Error('Expected exact Session/path download target')
    return { ...target }
  })
  const trusted = createCarrierTrust({ publicOrigins })
  return async (request, response) => {
    if (!paths.has(request.url?.split('?')[0])) return false
    const fail = status => { response.writeHead(status, { 'Cache-Control': 'no-store' }).end(); return true }
    if (!trusted(request, true)) return fail(403)
    if (request.method !== 'POST') return fail(405)
    if (!paths.has(request.url)) return fail(400)
    if (request.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') return fail(415)
    if (request.headers['content-length'] && (!/^\d+$/.test(request.headers['content-length']) || Number(request.headers['content-length']) > 16384)) return fail(413)
    const chunks = []; let size = 0
    try {
      for await (const chunk of request) { size += chunk.length; if (size > 16384) return fail(413); chunks.push(chunk) }
      const body = Buffer.concat(chunks)
      let message
      try { message = JSON.parse(body.toString('utf8')) } catch { return fail(400) }
      const args = message?.payload?.args
      const read = request.url.endsWith('/readBytes')
      if (keys(message) !== 'method,payload,rpcId,type' || message.type !== 'client-request' || !identity(message.rpcId) || message.rpcId.length > 256 ||
          request.url !== '/api/' + message.method || keys(message.payload) !== 'args' || keys(args) !== (read ? 'options,path,workspaceFileScopeId' : 'path,workspaceFileScopeId') ||
          read && keys(args.options) !== '' || !grants.some(target => target.sessionId === args.workspaceFileScopeId && target.path === args.path)) return fail(400)
      const controller = new AbortController(), closed = () => { if (!response.writableEnded) controller.abort() }
      response.once('close', closed)
      try {
        const result = await fetch(new URL(request.url, remote), {
          method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body,
          redirect: 'error', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]),
        })
        // Binary Remote framing and error envelopes belong to original Connection.
        response.writeHead(result.status, { 'Content-Type': result.headers.get('content-type') ?? 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
        if (result.body) for await (const chunk of result.body) {
          if (!response.write(chunk)) await new Promise((resolve, reject) => {
            const done = () => { response.off('close', close); resolve() }, close = () => { response.off('drain', done); reject(Error('Download closed')) }
            response.once('drain', done); response.once('close', close)
          })
        }
        response.end()
      } finally { response.off('close', closed) }
    } catch {
      if (response.headersSent) response.destroy()
      else return fail(502)
    }
    return true
  }
}

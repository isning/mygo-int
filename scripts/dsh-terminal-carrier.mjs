import { createCarrierTrust } from './dsh-carrier-trust.mjs'
// Original Terminal guide shell discovery only; no PTY allocation or streams.
export const TERMINAL_SHELLS_RPC_PATH = '/api/terminal/shells'
const MAX_REQUEST_BYTES = 4096

export function createTerminalReadCarrier({ origin, cookie, publicOrigins = [] }) {
  const trusted = createCarrierTrust({ publicOrigins })
  const remote = new URL(origin)
  if (remote.protocol !== 'http:' || remote.hostname !== '127.0.0.1' || remote.pathname !== '/' || remote.search || remote.hash || remote.username || remote.password) {
    throw new Error('RPC origin must be an http://127.0.0.1:port origin')
  }
  if (typeof cookie !== 'string' || !cookie || /[\r\n]/.test(cookie)) throw new Error('Missing or invalid owner cookie')
  return async (request, response) => {
    // Compare the raw target: encoded aliases, queries and absolute URLs are denied.
    if (!request.url.startsWith('/api/terminal/')) return false
    const fail = (status, code, extra = {}) => {
      response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra })
        .end(JSON.stringify({ error: code }))
      return true
    }
    if (!trusted(request)) return fail(403, 'rpc-carrier/untrusted-request')
    if (request.url !== TERMINAL_SHELLS_RPC_PATH) return fail(403, 'rpc-carrier/endpoint-denied')
    if (request.method !== 'POST') return fail(405, 'rpc-carrier/method-denied', { Allow: 'POST' })
    if (request.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') return fail(415, 'rpc-carrier/json-required')
    let body = ''
    try {
      let size = 0
      const chunks = []
      for await (const chunk of request) {
        size += chunk.length
        if (size > MAX_REQUEST_BYTES) return fail(413, 'rpc-carrier/request-too-large')
        chunks.push(chunk)
      }
      body = Buffer.concat(chunks).toString('utf8')
      const message = JSON.parse(body)
      const keys = value => value && typeof value === 'object' && !Array.isArray(value) ? Object.keys(value).sort().join(',') : undefined
      if (keys(message) !== 'method,payload,rpcId,type' || message.type !== 'client-request' ||
          typeof message.rpcId !== 'string' || !message.rpcId || message.rpcId.length > 128 ||
          message.method !== 'terminal/shells' || keys(message.payload) !== 'args' || keys(message.payload.args) !== 'agentId' ||
          typeof message.payload.args.agentId !== 'string' || !/^[\w-]{1,256}$/.test(message.payload.args.agentId)) {
        return fail(400, 'rpc-carrier/invalid-shells-call')
      }
    } catch { return fail(400, 'rpc-carrier/invalid-json') }
    try {
      const result = await fetch(new URL(TERMINAL_SHELLS_RPC_PATH, remote), {
        method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body,
        redirect: 'error', signal: AbortSignal.timeout(15000),
      })
      // Preserve the original envelope, status and error. Never return cookies.
      const bytes = new Uint8Array(await result.arrayBuffer())
      response.writeHead(result.status, {
        'Content-Type': result.headers.get('content-type') ?? 'application/octet-stream',
        'Cache-Control': 'no-store',
      }).end(bytes)
    } catch { return fail(502, 'rpc-carrier/upstream-unavailable') }
    return true
  }
}

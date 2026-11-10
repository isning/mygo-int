import { createCarrierTrust } from './dsh-carrier-trust.mjs'
// Scoped loopback browser capability; original Connection/Gateway own all envelopes.
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const keys = value => value && typeof value === 'object' && !Array.isArray(value) ? Object.keys(value).sort().join(',') : undefined
const empty = value => keys(value) === ''
const id = value => typeof value === 'string' && value.length > 0 && value.length <= 256
export function allowedSessionCall(endpoint, payload, stream = false) {
  if (keys(payload) !== 'args') return false
  const args = payload.args
  if (stream && ['$events', 'session/control', 'workspace/follow', 'remoteAccess/follow'].includes(endpoint)) return empty(args)
  if (!stream && endpoint === 'session/list') return keys(args) === '_request' && empty(args._request)
  if (!stream && endpoint === 'session/projections') return keys(args) === 'request' && keys(args.request) === 'sessionId' && id(args.request.sessionId)
  if (!stream && endpoint === 'session/prompt' && keys(args) === 'request') {
    const r = args.request
    // Text-only ordinary Session submission. The original client owns identity,
    // receipt reconciliation, and errors; forward the admitted envelope verbatim.
    return keys(r) !== undefined &&
      ['content,mode,requestId,sessionId', 'clientTimeZone,content,mode,requestId,sessionId'].includes(keys(r)) &&
      id(r.sessionId) && id(r.requestId) && ['queue', 'steer'].includes(r.mode) &&
      (r.clientTimeZone === undefined || typeof r.clientTimeZone === 'string' && r.clientTimeZone.length > 0 && r.clientTimeZone.length <= 128) &&
      Array.isArray(r.content) && r.content.length > 0 && r.content.length <= 8 &&
      r.content.every(part => keys(part) === 'text,type' && part.type === 'text' && typeof part.text === 'string') &&
      r.content.reduce((size, part) => size + part.text.length, 0) <= 8192 && r.content.some(part => part.text.trim().length > 0)
  }
  if (stream && endpoint === 'session/follow' && keys(args) === 'request') {
    const r = args.request
    return keys(r) !== undefined && Object.keys(r).every(k => ['address', 'activate', 'assistantStream', 'maxMessages', 'turnWindow'].includes(k)) &&
      keys(r.address) === 'kind,sessionId' && r.address.kind === 'session' && id(r.address.sessionId) &&
      (r.activate === undefined || r.activate === true) && (r.assistantStream === undefined || r.assistantStream === true) &&
      (r.maxMessages === undefined || Number.isInteger(r.maxMessages) && r.maxMessages > 0 && r.maxMessages <= 1000) &&
      (r.turnWindow === undefined || keys(r.turnWindow) === 'minMessages,minTurns' && Number.isInteger(r.turnWindow.minMessages) && r.turnWindow.minMessages > 0 && r.turnWindow.minMessages <= (r.maxMessages ?? 500) && Number.isInteger(r.turnWindow.minTurns) && r.turnWindow.minTurns > 0 && r.turnWindow.minTurns <= 100)
  }
  return false
}
export function createSessionCarrier({ origin, cookie, WebSocket, WebSocketServer, publicOrigins = [] }) {
  const trusted = createCarrierTrust({ publicOrigins })
  const remote = new URL(origin)
  if (remote.protocol !== 'http:' || remote.hostname !== '127.0.0.1' || remote.pathname !== '/' || remote.search || remote.hash || remote.username || remote.password) throw Error('Session origin must be loopback HTTP')
  if (typeof cookie !== 'string' || !cookie || /[\r\n]/.test(cookie)) throw Error('Invalid owner cookie')
  const sockets = new Set()
  const wss = new WebSocketServer({ noServer: true, maxPayload: 16384 })
  return {
    async handle(request, response) {
      if (!['/api/session/list', '/api/session/projections', '/api/session/prompt'].includes(request.url)) return false
      const fail = status => { response.writeHead(status, { 'Cache-Control': 'no-store' }).end(); return true }
      if (!trusted(request)) return fail(403)
      if (request.method !== 'POST') return fail(405)
      if (request.headers['content-type']?.split(';')[0] !== 'application/json') return fail(415)
      const chunks = []; let size = 0
      try {
        for await (const chunk of request) { size += chunk.length; if (size > (request.url === '/api/session/prompt' ? 65536 : 4096)) return fail(413); chunks.push(chunk) }
        // Decode once so a text character split across HTTP chunks stays intact.
        const body = Buffer.concat(chunks).toString('utf8')
        const m = JSON.parse(body)
        if (keys(m) !== 'method,payload,rpcId,type' || m.type !== 'client-request' || !id(m.rpcId) || request.url !== '/api/' + m.method || !allowedSessionCall(m.method, m.payload)) return fail(400)
        const result = await fetch(new URL(request.url, remote), { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body, redirect: 'error', signal: AbortSignal.timeout(15000) })
        response.writeHead(result.status, { 'Content-Type': result.headers.get('content-type') ?? 'application/json', 'Cache-Control': 'no-store' }).end(new Uint8Array(await result.arrayBuffer()))
      } catch { return fail(502) }
      return true
    },
    upgrade(request, socket, head) {
      if (request.url !== '/api/remote.mux' || !trusted(request, true)) { socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); return }
      wss.handleUpgrade(request, socket, head, browser => {
        sockets.add(browser)
        const target = new URL('/api/remote.mux', remote); target.protocol = 'ws:'
        const host = new WebSocket(target, { headers: { cookie, origin: remote.origin }, followRedirects: false, handshakeTimeout: 10000, maxPayload: 4 * 1024 * 1024 })
        sockets.add(host)
        const pending = []; const active = new Set()
        const close = () => { for (const s of [browser, host]) { sockets.delete(s); if (s.readyState < 2) s.close() } }
        browser.on('error', close); host.on('error', close)
        browser.on('close', close); host.on('close', close)
        host.on('open', () => { for (const bytes of pending) host.send(bytes, { binary: false }); pending.length = 0 })
        host.on('message', (bytes, binary) => {
          try { const frame = JSON.parse(bytes.toString()); if (['end', 'error'].includes(frame.type)) active.delete(frame.streamId) } catch { /* Host owns response validation. */ }
          if (browser.readyState === 1) browser.send(bytes, { binary }) })
        browser.on('message', (bytes, binary) => {
          try {
            const m = JSON.parse(bytes.toString())
            if (binary || !id(m.streamId)) throw Error('Invalid frame')
            if (m.type === 'open' && keys(m) === 'endpoint,payload,streamId,type' && active.size < 16 && !active.has(m.streamId) && allowedSessionCall(m.endpoint, m.payload, true)) active.add(m.streamId)
            else if (m.type === 'cancel' && keys(m) === 'streamId,type' && active.delete(m.streamId)) { /* original cancellation */ }
            else throw Error('Denied frame')
            if (host.readyState === 1) host.send(bytes, { binary: false })
            else if (host.readyState === 0 && pending.length < 16) pending.push(bytes)
            else throw Error('Unavailable carrier')
          } catch { browser.close(1008, 'session capability denied'); close() }
        })
      })
    },
    close() { for (const socket of sockets) if (socket.readyState < 2) socket.close(); wss.close() },
  }
}
export function loadOriginalSocketLibrary(workspace) {
  const require = createRequire(resolve(workspace, '.scratch/upstream/deepseek-harness/packages/api/gateway/package.json'))
  return require('ws')
}

// Direct Node owner capability for original Gateway event delivery; no proxy or retry loop.
export const EVENTS_SOCKET_PATH = '/api/remote.mux'

export function createAuthenticatedEventsTransport({ origin, cookie, WebSocket, onDiagnostic = () => {} }) {
  const host = new URL(origin)
  if (host.protocol !== 'http:' || host.hostname !== '127.0.0.1' || host.pathname !== '/' || host.search || host.hash || host.username || host.password) {
    throw new Error('Events origin must be an http://127.0.0.1:port origin')
  }
  if (typeof cookie !== 'string' || !cookie || /[\r\n]/.test(cookie)) throw new Error('Missing or invalid owner cookie')
  if (typeof WebSocket !== 'function') throw new Error('Node WebSocket constructor required')
  const endpoint = new URL(EVENTS_SOCKET_PATH, host)
  endpoint.protocol = 'ws:'
  const report = diagnostic => { try { onDiagnostic(diagnostic) } catch {} }
  return {
    streamBaseUrl: host.href,
    // Classification belongs to the selected target, never this credential capability.
    ownsHost: false,
    createWebSocket(url) {
      if (url !== endpoint.href) throw new Error('events-transport/endpoint-denied')
      const socket = new WebSocket(url, { headers: { cookie, origin: host.origin }, followRedirects: false, handshakeTimeout: 10000 })
      socket.on('unexpected-response', (_request, response) => {
        report({ code: 'events-transport/upgrade-rejected', status: response.statusCode })
        response.resume()
        // ws leaves unexpected-response handling to its listener. End this failed attempt.
        socket.close()
      })
      socket.on('error', error => report({ code: 'events-transport/socket-error', systemCode: typeof error.code === 'string' ? error.code : undefined }))
      socket.on('open', () => report({ code: 'events-transport/open' }))
      socket.on('close', code => report({ code: 'events-transport/closed', closeCode: code }))
      const send = socket.send.bind(socket)
      socket.send = text => {
        const frame = JSON.parse(text)
        const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === keys
        if (!exact(frame, frame.type === 'open' ? 'endpoint,payload,streamId,type' : 'streamId,type') || typeof frame.streamId !== 'string' ||
          !(frame.type === 'cancel' || frame.type === 'open' && frame.endpoint === '$events' && exact(frame.payload, 'args') && exact(frame.payload.args, ''))) {
          throw new Error('events-transport/frame-denied')
        }
        send(text)
      }
      return socket
    },
  }
}

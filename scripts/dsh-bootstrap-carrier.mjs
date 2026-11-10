// Explicit loopback owner capability: only injections and their blocking scripts.
// No arbitrary path forwarding, redirects, browser cookies, RPC or application bundles.
export function createBootstrapCarrier({ origin, cookie }) {
  const remote = new URL(origin)
  if (remote.protocol !== 'http:' || remote.hostname !== '127.0.0.1' || remote.pathname !== '/' || remote.search || remote.hash || remote.username || remote.password) {
    throw new Error('DSH_ORIGIN must be an http://127.0.0.1:port origin')
  }
  if (!cookie || /[\r\n]/.test(cookie)) throw new Error('Missing or invalid owner cookie')
  let scripts = new Set()
  return async (request, response) => {
    const path = new URL(request.url, 'http://localhost')
    if (path.pathname !== '/mygo/index-injections' && !scripts.has(path.pathname + path.search)) return false
    const localOrigin = `http://127.0.0.1:${request.socket.localPort}`
    if (request.headers.host !== new URL(localOrigin).host ||
        (request.headers.origin && request.headers.origin !== localOrigin) ||
        (request.headers['sec-fetch-site'] && !['same-origin', 'none'].includes(request.headers['sec-fetch-site']))) {
      response.writeHead(403, { 'Cache-Control': 'no-store' }).end()
      return true
    }
    if (request.method !== 'GET' || path.hash || (path.pathname === '/mygo/index-injections' && path.search)) {
      response.writeHead(405, { Allow: 'GET', 'Cache-Control': 'no-store' }).end()
      return true
    }
    try {
      const result = await fetch(new URL(path.pathname + path.search, remote), {
        headers: { cookie }, redirect: 'error', signal: AbortSignal.timeout(15000),
      })
      const body = await result.text()
      if (result.ok && path.pathname === '/mygo/index-injections') {
        const payload = JSON.parse(body)
        if (payload.schemaVersion !== 1 || !Array.isArray(payload.injections)) throw new Error('Invalid injection response')
        const next = new Set()
        for (const row of payload.injections) {
          if (row.kind !== 'script-src') continue
          const url = new URL(row.src, remote)
          if (url.origin !== remote.origin || url.pathname !== '/plugins/' || !url.search || url.hash || url.username || url.password) {
            throw new Error('Unsupported blocking bootstrap URL')
          }
          // Preserve rows exactly; pinned URLs are document-relative plugins/?combo=… .
          if (row.src !== `plugins/${url.search}`) throw new Error('Unsupported blocking bootstrap reference')
          next.add(url.pathname + url.search)
        }
        scripts = next
      }
      response.writeHead(result.status, {
        'Content-Type': result.headers.get('content-type') ?? 'application/octet-stream',
        'Cache-Control': 'no-store',
      }).end(body)
    } catch {
      response.writeHead(502, { 'Cache-Control': 'no-store' }).end()
    }
    return true
  }
}

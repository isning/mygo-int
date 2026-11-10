// Server-side custody of one current-revision lazy JavaScript resource.
import { LAZY_PATH, lazyBundleReferences } from '../entries/dsh-startup/lazy-resources.js'

export function createLazyCarrier({ origin, cookie }) {
  const remote = new URL(origin)
  if (remote.protocol !== 'http:' || remote.hostname !== '127.0.0.1' || remote.pathname !== '/' || remote.search || remote.hash || remote.username || remote.password) throw new Error('Lazy origin must be loopback HTTP')
  if (typeof cookie !== 'string' || !cookie || /[\r\n]/.test(cookie)) throw new Error('Invalid owner cookie')
  return async (request, response) => {
    // Claim only this pathname family, including malformed suffixes, to deny them.
    if (!request.url.startsWith(LAZY_PATH)) return false
    const fail = status => { response.writeHead(status, { 'Cache-Control': 'no-store' }).end(); return true }
    const localOrigin = `http://127.0.0.1:${request.socket.localPort}`
    if (request.headers.host !== new URL(localOrigin).host ||
        (request.headers.origin && request.headers.origin !== localOrigin) ||
        (request.headers['sec-fetch-site'] && !['same-origin', 'none'].includes(request.headers['sec-fetch-site']))) return fail(403)
    if (request.method !== 'GET') return fail(405)
    if (!new RegExp(`^${LAZY_PATH.replaceAll('.', '\\.')}\\?rev=[A-Za-z0-9_-]+$`).test(request.url)) return fail(404)
    try {
      // Re-read the real graph: stale revisions never retain ambient permission.
      const injections = await fetch(new URL('/mygo/index-injections', remote), {
        headers: { cookie }, redirect: 'error', signal: AbortSignal.timeout(15000),
      })
      if (!injections.ok) return fail(502)
      const payload = await injections.json()
      const graphs = payload.injections?.filter(row => row.kind === 'global' && row.name === '__DSH_BOOT__')
      if (payload.schemaVersion !== 1 || graphs?.length !== 1) return fail(502)
      if (!lazyBundleReferences(graphs[0].value).has(request.url.slice(1))) return fail(404)
      const result = await fetch(new URL(request.url, remote), {
        headers: { cookie }, redirect: 'error', signal: AbortSignal.timeout(15000),
      })
      if (!result.ok) return fail(result.status)
      const type = result.headers.get('content-type')?.split(';')[0]
      if (!['application/javascript', 'text/javascript'].includes(type)) return fail(502)
      const chunks = []; let size = 0
      for await (const chunk of result.body) {
        size += chunk.length
        if (size > 4 * 1024 * 1024) return fail(502)
        chunks.push(chunk)
      }
      response.writeHead(result.status, {
        'Content-Type': result.headers.get('content-type'), 'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      }).end(Buffer.concat(chunks))
      return true
    } catch { return fail(502) }
  }
}

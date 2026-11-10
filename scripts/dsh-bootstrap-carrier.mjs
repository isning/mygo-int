import { createCarrierTrust } from './dsh-carrier-trust.mjs'
// Explicit loopback owner capability: injections and exact graph-declared bundles.
// No arbitrary path forwarding, redirects, browser cookies, RPC or package assets.
export function graphBundleReferences(graph) {
  if (!graph || !Array.isArray(graph.entries) || !Array.isArray(graph.batches)) throw new Error('Invalid boot graph')
  const ids = new Set()
  const references = new Set()
  const add = (row, entries) => {
    if (typeof row.rev !== 'string' || !/^[A-Za-z0-9_-]+$/.test(row.rev) ||
        row.url !== `plugins/??${entries.map(id => `${id}/client.js`).join(',')}&rev=${row.rev}`) {
      throw new Error('Unsupported graph bundle reference')
    }
    references.add(row.url)
  }
  for (const row of graph.entries) {
    if (typeof row.id !== 'string' || !/^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/.test(row.id) || ids.has(row.id)) throw new Error('Invalid graph package identity')
    ids.add(row.id)
    add(row, [row.id])
  }
  const batched = new Set()
  for (const batch of graph.batches) {
    if (!['bootstrap', 'application'].includes(batch.phase) || !Array.isArray(batch.entries) || !batch.entries.length) throw new Error('Invalid graph batch')
    for (const id of batch.entries) {
      if (!ids.has(id) || batched.has(id)) throw new Error('Invalid graph batch membership')
      batched.add(id)
    }
    add(batch, batch.entries)
  }
  if (batched.size !== ids.size) throw new Error('Incomplete graph batches')
  return references
}

export function createBootstrapCarrier({ origin, cookie, publicOrigins = [] }) {
  const trusted = createCarrierTrust({ publicOrigins })
  const remote = new URL(origin)
  if (remote.protocol !== 'http:' || remote.hostname !== '127.0.0.1' || remote.pathname !== '/' || remote.search || remote.hash || remote.username || remote.password) {
    throw new Error('DSH_ORIGIN must be an http://127.0.0.1:port origin')
  }
  if (!cookie || /[\r\n]/.test(cookie)) throw new Error('Missing or invalid owner cookie')
  let scripts = new Set()
  return async (request, response) => {
    const path = new URL(request.url, 'http://localhost')
    if (path.pathname !== '/mygo/index-injections' && !scripts.has(path.pathname + path.search)) return false
    if (!trusted(request)) {
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
        const graphs = payload.injections.filter(row => row.kind === 'global' && row.name === '__DSH_BOOT__')
        if (graphs.length !== 1) throw new Error('Expected one boot graph')
        for (const reference of graphBundleReferences(graphs[0].value)) next.add(`/${reference}`)
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

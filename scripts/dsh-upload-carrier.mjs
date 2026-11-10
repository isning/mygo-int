// Online-only raw file intake. Host FileUploads owns admission, storage and receipts.
import { createCarrierTrust } from './dsh-carrier-trust.mjs'
export const FILE_UPLOAD_PATH = '/api/session/uploadFileBinary'
export const MAX_UPLOAD_BYTES = 1024 * 1024

export function allowedFileUploadTarget(target) {
  if (typeof target !== 'string' || !target.startsWith(FILE_UPLOAD_PATH + '?') || target.length > 4096) return false
  const url = new URL(target, 'http://127.0.0.1')
  if (url.pathname !== FILE_UPLOAD_PATH || url.hash) return false
  const entries = [...url.searchParams]
  if (entries.some(([key]) => !['sessionId', 'name'].includes(key)) || new Set(entries.map(([key]) => key)).size !== entries.length) return false
  const session = url.searchParams.get('sessionId'), name = url.searchParams.get('name')
  return typeof session === 'string' && session.length > 0 && session.length <= 256 && !/[\x00-\x1f\x7f]/.test(session) &&
    (name === null || name.length > 0 && name.length <= 256 && !/[\x00-\x1f\x7f/\\]/.test(name))
}

export function createUploadCarrier({ origin, cookie, publicOrigins = [] }) {
  const remote = new URL(origin)
  if (remote.protocol !== 'http:' || remote.hostname !== '127.0.0.1' || remote.pathname !== '/' || remote.search || remote.hash || remote.username || remote.password) throw Error('Upload origin must be loopback HTTP')
  if (typeof cookie !== 'string' || !cookie || /[\r\n]/.test(cookie)) throw Error('Invalid owner cookie')
  const trusted = createCarrierTrust({ publicOrigins })
  return async function handleUpload(request, response) {
    if (request.url?.split('?')[0] !== FILE_UPLOAD_PATH) return false
    const fail = status => { response.writeHead(status, { 'Cache-Control': 'no-store' }).end(); return true }
    if (!trusted(request, true) ||
      request.headers['sec-fetch-site'] && request.headers['sec-fetch-site'] !== 'same-origin') return fail(403)
    if (request.method !== 'POST') return fail(405)
    if (!allowedFileUploadTarget(request.url)) return fail(400)
    if (request.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/octet-stream') return fail(415)
    if (request.headers['content-length'] !== undefined && (!/^\d+$/.test(request.headers['content-length']) || Number(request.headers['content-length']) > MAX_UPLOAD_BYTES)) return fail(413)
    try {
      // Bounded intake before dispatch prevents an oversized body partially reaching Host.
      const chunks = []; let size = 0
      for await (const chunk of request) {
        size += chunk.length
        if (size > MAX_UPLOAD_BYTES) return fail(413)
        chunks.push(chunk)
      }
      const result = await fetch(new URL(request.url, remote), {
        method: 'POST', headers: { cookie, 'content-type': 'application/octet-stream' },
        body: Buffer.concat(chunks), redirect: 'error', signal: AbortSignal.timeout(30000),
      })
      const body = new Uint8Array(await result.arrayBuffer())
      response.writeHead(result.status, { 'Content-Type': result.headers.get('content-type') ?? 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }).end(body)
    } catch { return fail(502) }
    return true
  }
}

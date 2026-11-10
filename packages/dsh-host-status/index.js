export const name = 'mygo-dsh-host-status'
export const inject = ['webServer', 'connection', 'clientModules']
export const STATUS_PATH = '/mygo/status'
export const INDEX_INJECTIONS_PATH = '/mygo/index-injections'

/** Register only in the Host composition; Cordis owns registration disposal. */
export function apply(ctx) {
  for (const path of [STATUS_PATH, INDEX_INJECTIONS_PATH]) {
    ctx.effect(() => ctx.webServer.register({
      kind: 'exact',
      path,
      handler(req, res) {
        res.setHeader('Cache-Control', 'no-store')
        // Retain the admitted Peer: authentication alone is not authorization.
        const admission = ctx.connection.admit(req)
        if ('rejection' in admission) {
          res.statusCode = admission.rejection
          res.end()
          return
        }
        if (admission.peer.principal.kind !== 'owner') {
          res.statusCode = 403
          res.end()
          return
        }
        if (req.method !== 'GET') {
          res.statusCode = 405
          res.setHeader('Allow', 'GET')
          res.end()
          return
        }
        if (path === INDEX_INJECTIONS_PATH) {
          // One original synchronous collection, with this request's exact Peer.
          // Serialize before sending headers; never execute script/global rows.
          let body
          try {
            const injections = ctx.webServer.collectIndexInjections(admission.peer)
            assertJsonData(injections)
            body = JSON.stringify({ schemaVersion: 1, injections })
          } catch {
            // Invalid contributor data must not become a truncated/lossy success.
            res.statusCode = 500
            res.end()
            return
          }
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(body)
          return
        }
        const release = ctx.clientModules.graph().release
        // Explicit field selection prevents accidental bootstrap/private graph export.
        const publicRelease = release === undefined ? null : {
          version: release.version,
          ...(release.commit === undefined ? {} : { commit: release.commit }),
        }
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(JSON.stringify({
          schemaVersion: 1,
          status: 'adapter-ready',
          adapterVersion: '0.1.0',
          release: publicRelease,
        }))
      },
    }), `mygo-dsh-host-status: GET ${path}`)
  }
}

// The upstream row contract is JSON data, but global.value is typed unknown.
// Reject values JSON.stringify would discard/coerce, and accessors/toJSON hooks.
function assertJsonData(value, ancestors = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return
  if (typeof value === 'number' && Number.isFinite(value) && !Object.is(value, -0)) return
  if (typeof value !== 'object' || ancestors.has(value)) throw new TypeError('Not JSON data')
  const array = Array.isArray(value)
  const prototype = Object.getPrototypeOf(value)
  if (array ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) {
    throw new TypeError('Not plain JSON data')
  }
  const keys = Reflect.ownKeys(value)
  if (array && keys.length !== value.length + 1) throw new TypeError('Not a dense JSON array')
  ancestors.add(value)
  for (const key of keys) {
    if (array && key === 'length') continue
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (typeof key !== 'string' || !descriptor.enumerable || !('value' in descriptor)
      || (array && !/^(0|[1-9][0-9]*)$/.test(key))) {
      throw new TypeError('Not JSON data properties')
    }
    assertJsonData(descriptor.value, ancestors)
  }
  ancestors.delete(value)
}

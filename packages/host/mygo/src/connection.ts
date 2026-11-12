import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-connection'
import type {} from '@deepseek-ai/dsh-host-webserver'

/** Authenticated route returning the ordered client bootstrap injection table. */
export const INDEX_INJECTIONS_PATH = '/mygo/index-injections'

/** Install the MyGO!!!! connection protocol implementation; Cordis owns registration disposal. */
export function installConnection(ctx: Context): void {
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: INDEX_INJECTIONS_PATH,
    handler(req, res) {
      res.setHeader('Cache-Control', 'no-store')
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
      let body
      try {
        const injections = ctx.webServer.collectIndexInjections(admission.peer)
        assertJsonData(injections)
        body = JSON.stringify({ injections })
      } catch {
        res.statusCode = 500
        res.end()
        return
      }
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(body)
    },
  }), `mygo-host/connection: GET ${INDEX_INJECTIONS_PATH}`)
}

// The upstream row contract is JSON data, but global.value is typed unknown.
// Reject values JSON.stringify would discard/coerce, and accessors/toJSON hooks.
function assertJsonData(value: unknown, ancestors = new Set<object>()): void {
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
    if (descriptor === undefined || typeof key !== 'string' || !descriptor.enumerable || !('value' in descriptor)
      || (array && !/^(0|[1-9][0-9]*)$/.test(key))) {
      throw new TypeError('Not JSON data properties')
    }
    assertJsonData(descriptor.value, ancestors)
  }
  ancestors.delete(value)
}

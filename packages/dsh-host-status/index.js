export const name = 'mygo-dsh-host-status'
export const inject = ['webServer', 'connection', 'clientModules']
export const STATUS_PATH = '/mygo/status'

/** Register only in the Host composition; Cordis owns registration disposal. */
export function apply(ctx) {
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: STATUS_PATH,
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
  }), `mygo-dsh-host-status: GET ${STATUS_PATH}`)
}

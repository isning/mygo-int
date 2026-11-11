// The deferred exists before the unchanged official entry starts running.
import { applyIndexInjections } from '/mygo-boot/apply-injections.js'
import { routeURL } from '/mygo-boot/instance-route.js'
const gate = globalThis.__DSH_BOOT_READY__
try {
  const response = await fetch('/mygo/index-injections', { credentials: 'same-origin', cache: 'no-store' })
  if (!response.ok) throw Object.assign(new Error(`mygo boot: index injections HTTP ${response.status}`), { status: response.status })
  const payload = await response.json()
  if (payload.schemaVersion !== 1 || !Array.isArray(payload.injections)) {
    throw new Error('mygo boot: unsupported index injections response')
  }
  const graphs = payload.injections.filter(row => row.kind === 'global' && row.name === '__DSH_BOOT__')
  if (graphs.length !== 1) throw new Error('mygo boot: expected one boot graph')
  // Original browser-relative bundle and asset resolution uses this authenticated
  // authority. Original ModuleSystem/Remote own loading and access decisions.
  globalThis.__DSH_TRANSPORT__ = { ...globalThis.__DSH_TRANSPORT__, ownsHost: false }
  await applyIndexInjections(payload.injections, src => new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = routeURL(src)
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`mygo boot: failed to load ${src}`))
    document.head.append(script)
  }))
  gate.resolve()
} catch (reason) {
  // The selected entry owns failure presentation, including rejected readiness.
  gate.reject(reason)
}

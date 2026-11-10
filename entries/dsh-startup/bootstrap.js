// The deferred exists before the unchanged official entry starts running.
import { applyIndexInjections } from '/mygo-boot/apply-injections.js'

const gate = globalThis.__DSH_BOOT_READY__
try {
  const response = await fetch('/mygo/index-injections', { credentials: 'same-origin', cache: 'no-store' })
  if (!response.ok) throw new Error(`mygo boot: index injections HTTP ${response.status}`)
  const payload = await response.json()
  if (payload.schemaVersion !== 1 || !Array.isArray(payload.injections)) {
    throw new Error('mygo boot: unsupported index injections response')
  }
  await applyIndexInjections(payload.injections, src => new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`mygo boot: failed to load ${src}`))
    document.head.append(script)
  }))
  gate.resolve()
} catch (reason) {
  // AppWebEntry owns failure presentation, including rejected readiness.
  gate.reject(reason)
}

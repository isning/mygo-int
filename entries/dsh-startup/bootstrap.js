// The deferred exists before the unchanged official entry starts running.
import { applyIndexInjections } from '/mygo-boot/apply-injections.js'
import { graphBundleReferences } from '/mygo-boot/bundle-references.js'

import { SESSION_ASSETS } from '/mygo-boot/session-assets.js'

const gate = globalThis.__DSH_BOOT_READY__
try {
  const response = await fetch('/mygo/index-injections', { credentials: 'same-origin', cache: 'no-store' })
  if (!response.ok) throw new Error(`mygo boot: index injections HTTP ${response.status}`)
  const payload = await response.json()
  if (payload.schemaVersion !== 1 || !Array.isArray(payload.injections)) {
    throw new Error('mygo boot: unsupported index injections response')
  }
  const graphs = payload.injections.filter(row => row.kind === 'global' && row.name === '__DSH_BOOT__')
  if (graphs.length !== 1) throw new Error('mygo boot: expected one boot graph')
  const references = graphBundleReferences(graphs[0].value)
  // Preserve independently installed RPC hooks; the original module system owns
  // factory registration, dependency arrival and static singleton resolution.
  globalThis.__DSH_TRANSPORT__ = {
    ...globalThis.__DSH_TRANSPORT__,
    loadBundle: src => new Promise((resolve, reject) => {
      if (!references.has(src)) return reject(new Error(`mygo boot: undeclared bundle ${src}`))
      const script = document.createElement('script')
      script.src = src
      script.async = true
      script.onload = () => { script.remove(); resolve() }
      script.onerror = () => { script.remove(); reject(new Error(`mygo boot: failed to load ${src}`)) }
      document.head.append(script)
    }),
    resolveAsset: reference => {
      if (!SESSION_ASSETS.has(reference)) throw new Error(`mygo boot: undeclared package asset ${reference}`)
      return '/' + reference
    },
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

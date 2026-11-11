// Reject Host claims on local seed modules before original reconciliation starts.
// ClientEntries retains its managed roster, release gate, queue and disposal.
export function protectLocalEntryModules(modules, localModuleNames) {
  const localNames = new Set(localModuleNames)
  const normalize = name => name.endsWith('/client') ? name.slice(0, -7) : name
  const owned = new Set([...localNames].map(normalize))
  const initialRelease = modules.manifest.release
  const entries = modules.entries
  const sync = entries.sync
  // Original sync validates before entering its observable reconciliation queue.
  // Retain that rejection for the existing Plugins diagnostics without changing
  // the original roster, desired graph, or exception delivered to its caller.
  const state = entries.state
  const getSnapshot = state.getSnapshot
  const subscribe = state.subscribe
  const listeners = new Set()
  let rejection
  let previous, projected
  function snapshot() {
    const current = getSnapshot.call(state)
    if (!rejection) return current
    if (previous !== current) {
      previous = current
      projected = { ...current, failures: [...current.failures, { id: 'graph', message: rejection }] }
    }
    return projected
  }
  function observe(listener) {
    listeners.add(listener)
    const off = subscribe.call(state, listener)
    return () => { listeners.delete(listener); off() }
  }
  function report(message) {
    rejection = message
    previous = undefined
    for (const listener of [...listeners]) {
      try { listener() } catch (error) { console.error('Local entry boundary diagnostic subscriber failed', error) }
    }
  }
  state.getSnapshot = snapshot
  state.subscribe = observe
  function guardedSync(graph) {
    try {
      // Preserve original release-change handling (including unreadable future graphs).
      const release = graph?.release
      const sameRelease = release?.version === initialRelease?.version
        && release?.commit === initialRelease?.commit
      if (sameRelease && Array.isArray(graph?.entries)) {
        for (const row of graph.entries) {
          if (typeof row?.id === 'string' && owned.has(normalize(row.id))) {
            throw Error(`Local module ownership conflict in Host graph: ${row.id}`)
          }
        }
      }
      const result = sync.call(this, graph)
      // Only an admitted graph supersedes a rejected graph. Retry, permission
      // and transport failures must not masquerade as composition admission.
      if (sameRelease && rejection) report(undefined)
      return result
    } catch (error) {
      report(String(error))
      throw error
    }
  }
  entries.sync = guardedSync
  return () => {
    if (entries.sync === guardedSync) entries.sync = sync
    if (state.getSnapshot === snapshot) state.getSnapshot = getSnapshot
    if (state.subscribe === observe) state.subscribe = subscribe
    listeners.clear()
  }
}

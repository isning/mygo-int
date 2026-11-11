// Reject Host claims on local seed modules before original reconciliation starts.
// ClientEntries retains its managed roster, release gate, queue and disposal.
export function protectLocalEntryModules(modules, localModuleNames) {
  const localNames = new Set(localModuleNames)
  const normalize = name => name.endsWith('/client') ? name.slice(0, -7) : name
  const owned = new Set([...localNames].map(normalize))
  const initialRelease = modules.manifest.release
  const entries = modules.entries
  const sync = entries.sync
  function guardedSync(graph) {
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
    return sync.call(this, graph)
  }
  entries.sync = guardedSync
  return () => { if (entries.sync === guardedSync) entries.sync = sync }
}

// Device-local profiles and the currently running carrier are separate state.
export const inject = ['mygoStartup']
export function apply(ctx) {
  const boot = ctx.mygoStartup, bound = boot.configuration.selectedInstance
  const storage = localStorage
  const key = `mygo.instances.v2:${location.origin}`
  const binding = bound && { id: bound.id, name: bound.name ?? bound.id, address: bound.address, authenticationViewId: bound.authenticationViewId }
  let catalog = binding ? [binding] : []
  let diagnostic = '', revision = 0, connectionStatus = binding ? 'checking' : 'idle', connectionDiagnostic = ''
  const listeners = new Set(), notify = () => { for (const fn of listeners) fn() }
  function validate(row) {
    if (!row || !/^[\w-]{1,128}$/.test(row.id) || typeof row.name !== 'string' || !row.name.trim() || row.name.length > 128 || !/^[\w-]{1,128}$/.test(row.authenticationViewId)) throw Error('Expected stable id, name and authentication view')
    if (Object.keys(row).some(key => !['id', 'name', 'address', 'authenticationViewId'].includes(key))) throw Error('Credentials and unknown catalog fields are not accepted')
    let address
    try { address = new URL(row.address) } catch { throw Error('Invalid URL') }
    if (!['http:', 'https:'].includes(address.protocol) || address.username || address.password || address.search || address.hash || address.pathname !== '/') throw Error('Use an HTTP(S) origin without credentials, path or token')
    return { id: row.id, name: row.name.trim(), address: address.origin, authenticationViewId: row.authenticationViewId }
  }
  try {
    const saved = JSON.parse(storage.getItem(key) || 'null')
    if (saved) {
      if (![2, 3].includes(saved.version) || !Number.isSafeInteger(saved.revision) || !Array.isArray(saved.catalog) || saved.catalog.length > 32) throw Error('Invalid catalog')
      const rows = saved.catalog.map(validate)
      if (new Set(rows.map(r => r.id)).size !== rows.length) throw Error('Invalid catalog identities')
      if (binding) {
        const current = rows.findIndex(row => row.id === binding.id && row.authenticationViewId === binding.authenticationViewId)
        if (current >= 0) rows[current] = { ...rows[current], address: binding.address }
        else {
          if (rows.length >= 32) throw Error('Catalog limit reached')
          rows.push(binding)
        }
      }
      catalog = rows; revision = saved.revision
    }
  } catch (error) { diagnostic = `Saved catalog ignored: ${error.message}` }
  async function persist(rows) {
    const expectedRevision = revision
    const saved = JSON.parse(storage.getItem(key) || 'null')
    if (expectedRevision !== revision || (saved?.revision ?? 0) !== revision) throw Error('Catalog changed during this edit; reload before saving')
    storage.setItem(key, JSON.stringify({ version: 3, revision: revision + 1, catalog: rows }))
    catalog = rows; revision++; notify()
  }
  async function refresh() {
    if (!binding) { connectionStatus = 'idle'; connectionDiagnostic = ''; notify(); return }
    connectionStatus = 'checking'; connectionDiagnostic = ''; notify()
    try { await boot.admit(); connectionStatus = 'authenticated' }
    catch (error) { connectionStatus = 'unavailable'; connectionDiagnostic = error instanceof Error ? error.message : String(error) }
    notify()
  }
  if (binding) void refresh()
  const isCurrentProfile = row => binding !== undefined && row?.id === binding.id && row.address === binding.address
    && row.authenticationViewId === binding.authenticationViewId
  ctx.provide('instanceManager', {
    snapshot: () => ({ catalog, currentId: binding?.id ?? null, currentProfile: binding ?? null, diagnostic, connectionStatus, connectionDiagnostic }),
    isCurrentProfile,
    availability: row => isCurrentProfile(row) ? connectionStatus : 'saved',
    refresh,
    async save(row, editingId) {
      if (editingId && editingId !== row.id) throw Error('Stable instance id cannot be changed')
      if (editingId && !catalog.some(row => row.id === editingId)) throw Error('Edited instance no longer exists')
      const value = validate(row)
      if (!editingId && catalog.some(r => r.id === value.id)) throw Error('Instance id already exists')
      if (catalog.length >= 32 && !editingId) throw Error('Catalog limit reached')
      await persist([...catalog.filter(r => r.id !== value.id), value])
    },
    async select(id) {
      const profile = catalog.find(row => row.id === id)
      if (!profile) throw Error('Unknown instance')
      const response = await fetch('/mygo-local/connection', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(profile) })
      if (!response.ok) throw Error(`Instance connection HTTP ${response.status}`)
      const { url } = await response.json()
      if (typeof url !== 'string' || !/^\/mygo-instance\/[a-f0-9]{64}\/$/.test(url)) throw Error('Invalid instance route')
      location.assign(url)
    },
    async remove(id) {
      const profile = catalog.find(row => row.id === id)
      if (!profile) throw Error('Unknown instance')
      if (isCurrentProfile(profile)) throw Error('Cannot remove the current instance')
      const response = await fetch('/mygo-local/connection', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify(profile) })
      if (!response.ok) throw Error(`Instance removal HTTP ${response.status}`)
      const rows = catalog.filter(row => row.id !== id)
      await persist(rows)
    },
    subscribe: fn => { listeners.add(fn); return () => listeners.delete(fn) },
  })
}

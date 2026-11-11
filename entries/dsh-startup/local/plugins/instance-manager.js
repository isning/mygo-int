// Device-local profiles and the currently running carrier are separate state.
export const inject = ['mygoStartup']
export function apply(ctx) {
  const boot = ctx.mygoStartup, bound = boot.configuration.selectedInstance
  const key = `mygo.instances.v1:${location.origin}:${bound.id}:${bound.authenticationViewId}`
  const binding = { id: bound.id, name: 'Local test DSH', address: bound.address, authenticationViewId: bound.authenticationViewId }
  let catalog = [binding], selectedId = bound.id, diagnostic = '', revision = 0, connectionStatus = 'checking'
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
    const saved = JSON.parse(localStorage.getItem(key) || 'null')
    if (saved) {
      if (![1, 2].includes(saved.version) || !Number.isSafeInteger(saved.revision) || !Array.isArray(saved.catalog) || saved.catalog.length > 32) throw Error('Invalid catalog')
      // Old profiles could not edit the seeded address. Once editable, only
      // untouched seed values follow deployment changes; user edits always win.
      const rows = saved.catalog.map(row => validate(row?.id === bound.id
        && (saved.version === 1 || row.address === saved.seedAddress) ? { ...row, address: binding.address } : row))
      if (new Set(rows.map(r => r.id)).size !== rows.length || !rows.some(r => r.id === bound.id) || !rows.some(r => r.id === saved.selectedId)) throw Error('Invalid catalog identities')
      catalog = rows; selectedId = saved.selectedId; revision = saved.revision
    }
  } catch (error) { diagnostic = `Saved catalog ignored: ${error.message}` }
  async function persist(rows, selection) {
    const expectedRevision = revision
    const saved = JSON.parse(localStorage.getItem(key) || 'null')
    if (expectedRevision !== revision || (saved?.revision ?? 0) !== revision) throw Error('Catalog changed during this edit; reload before saving')
    localStorage.setItem(key, JSON.stringify({ version: 2, seedAddress: binding.address, revision: revision + 1, catalog: rows, selectedId: selection }))
    catalog = rows; selectedId = selection; revision++; notify()
  }
  async function refresh() {
    connectionStatus = 'checking'; notify()
    try { await boot.admit(); connectionStatus = 'authenticated' } catch { connectionStatus = 'unavailable' }
    notify()
  }
  void refresh()
  const isConnectedProfile = row => row?.id === binding.id && row.address === binding.address
    && row.authenticationViewId === binding.authenticationViewId
  ctx.provide('instanceManager', {
    snapshot: () => ({ catalog, selectedId, connectedId: bound.id, connectedProfile: binding, diagnostic, connectionStatus }),
    isConnectedProfile,
    availability: row => isConnectedProfile(row) ? `Bound carrier · ${connectionStatus} (DSH admission probe)` : 'Unavailable · external carrier not configured',
    refresh,
    async save(row, editingId) {
      if (editingId && editingId !== row.id) throw Error('Stable instance id cannot be changed')
      if (editingId && !catalog.some(row => row.id === editingId)) throw Error('Edited instance no longer exists')
      const value = validate(row)
      if (!editingId && catalog.some(r => r.id === value.id)) throw Error('Instance id already exists')
      if (catalog.length >= 32 && !editingId) throw Error('Catalog limit reached')
      await persist([...catalog.filter(r => r.id !== value.id), value], selectedId)
    },
    async select(id) {
      if (!catalog.some(r => r.id === id)) throw Error('Unknown instance')
      // Selection is a durable catalog preference, never an implicit transport redirect.
      await persist(catalog, id)
    },
    subscribe: fn => { listeners.add(fn); return () => listeners.delete(fn) },
  })
}

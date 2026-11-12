// The mygo reverse proxy owns the instance catalog; the browser only presents it.
import { connectionProfileKey } from '../profile-identity.js'

export const inject = ['mygoStartup']
export function apply(ctx) {
  const boot = ctx.mygoStartup, bound = boot.configuration.selectedInstance
  const binding = bound && validate({ ...bound, name: bound.name ?? bound.id })
  let catalog = Array.isArray(boot.configuration.instances) ? boot.configuration.instances.map(validate) : []
  if (catalog.length > 32 || new Set(catalog.map(connectionProfileKey)).size !== catalog.length) throw Error('Invalid instance catalog')
  if (binding && !catalog.some(row => row.id === binding.id && row.authenticationViewId === binding.authenticationViewId)) catalog.push(binding)
  let connectionStatus = binding ? 'checking' : 'idle', connectionDiagnostic = ''
  const listeners = new Set(), notify = () => { for (const fn of listeners) fn() }

  function validate(row) {
    if (!row || !/^[\w-]{1,128}$/.test(row.id) || typeof row.name !== 'string' || !row.name.trim() || row.name.length > 128 || !/^[\w-]{1,128}$/.test(row.authenticationViewId)) throw Error('Expected stable id, name and authentication view')
    if (Object.keys(row).some(key => !['id', 'name', 'address', 'authenticationViewId'].includes(key))) throw Error('Credentials and unknown catalog fields are not accepted')
    let address
    try { address = new URL(row.address) } catch { throw Error('Invalid URL') }
    if (!['http:', 'https:'].includes(address.protocol) || address.username || address.password || address.search || address.hash || address.pathname !== '/') throw Error('Use an HTTP(S) origin without credentials, path or token')
    return { id: row.id, name: row.name.trim(), address: address.origin, authenticationViewId: row.authenticationViewId }
  }
  async function register(profile) {
    const response = await fetch('/mygo-local/connection', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(profile) })
    if (!response.ok) throw Error(`Instance connection HTTP ${response.status}`)
    const { url } = await response.json()
    if (typeof url !== 'string' || !/^\/mygo-instance\/[a-f0-9]{64}\/$/.test(url)) throw Error('Invalid instance route')
    return url
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
    snapshot: () => ({ catalog, currentId: binding?.id ?? null, currentProfile: binding ?? null, diagnostic: '', connectionStatus, connectionDiagnostic }),
    isCurrentProfile,
    availability: row => isCurrentProfile(row) ? connectionStatus : 'saved',
    refresh,
    async save(row, editingProfile) {
      const value = validate(row)
      const editingKey = editingProfile && connectionProfileKey(editingProfile)
      const valueKey = connectionProfileKey(value)
      if (editingProfile && editingKey !== valueKey) throw Error('Stable instance identity cannot be changed')
      if (editingProfile && !catalog.some(row => connectionProfileKey(row) === editingKey)) throw Error('Edited instance no longer exists')
      if (!editingProfile && catalog.some(row => connectionProfileKey(row) === valueKey)) throw Error('Instance profile already exists')
      if (catalog.length >= 32 && !editingProfile) throw Error('Catalog limit reached')
      await register(value)
      catalog = [...catalog.filter(row => connectionProfileKey(row) !== valueKey), value]
      notify()
    },
    async select(identity) {
      const key = connectionProfileKey(identity)
      const profile = catalog.find(row => connectionProfileKey(row) === key)
      if (!profile) throw Error('Unknown instance')
      location.assign(await register(profile))
    },
    async remove(identity) {
      const key = connectionProfileKey(identity)
      const profile = catalog.find(row => connectionProfileKey(row) === key)
      if (!profile) throw Error('Unknown instance')
      if (isCurrentProfile(profile)) throw Error('Cannot remove the current instance')
      const response = await fetch('/mygo-local/connection', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify(profile) })
      if (!response.ok) throw Error(`Instance removal HTTP ${response.status}`)
      catalog = catalog.filter(row => connectionProfileKey(row) !== key)
      notify()
    },
    subscribe: fn => { listeners.add(fn); return () => listeners.delete(fn) },
  })
}

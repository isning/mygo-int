// The mygo reverse proxy owns the instance catalog; the browser only presents it.
import { connectionProfileKey, normalizeConnectionProfile } from '../profile-identity.js'

export const inject = ['mygoStartup']
export function apply(ctx) {
  const boot = ctx.mygoStartup, bound = boot.configuration.selectedInstance
  const binding = bound && normalizeConnectionProfile({ ...bound, name: bound.name ?? bound.id })
  let catalog = Array.isArray(boot.configuration.instances) ? boot.configuration.instances.map(normalizeConnectionProfile) : []
  if (catalog.length > 32 || new Set(catalog.map(connectionProfileKey)).size !== catalog.length) throw Error('Invalid instance catalog')
  if (binding && !catalog.some(row => row.id === binding.id && row.authenticationViewId === binding.authenticationViewId)) catalog.push(binding)
  let connectionStatus = binding ? 'checking' : 'idle', connectionDiagnostic = ''
  const listeners = new Set(), notify = () => { for (const fn of listeners) fn() }

  async function register(profile) {
    const response = await fetch('/mygo-local/connection', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(profile) })
    if (!response.ok) throw Error((await response.text()).trim() || 'Unable to save this instance')
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
      const value = normalizeConnectionProfile(row)
      const editingKey = editingProfile && connectionProfileKey(editingProfile)
      const valueKey = connectionProfileKey(value)
      if (editingProfile && editingKey !== valueKey) throw Error('Stable instance identity cannot be changed')
      if (editingProfile && !catalog.some(row => connectionProfileKey(row) === editingKey)) throw Error('Edited instance no longer exists')
      if (!editingProfile && catalog.some(row => connectionProfileKey(row) === valueKey)) throw Error('Instance profile already exists')
      if (catalog.length >= 32 && !editingProfile) throw Error('Catalog limit reached')
      const url = await register(value)
      catalog = [...catalog.filter(row => connectionProfileKey(row) !== valueKey), value]
      notify()
      if (editingProfile && isCurrentProfile(editingProfile) && editingProfile.address !== value.address) location.assign(url)
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
      if (!response.ok) throw Error((await response.text()).trim() || 'Unable to remove this instance')
      catalog = catalog.filter(row => connectionProfileKey(row) !== key)
      notify()
    },
    subscribe: fn => { listeners.add(fn); return () => listeners.delete(fn) },
  })
}

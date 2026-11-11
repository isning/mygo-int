// Local authority adapter over the one original Loader. Never calls Host Remote.
import { matchesLegacyDeviceOverlay, matchesPreviousDeviceOverlay } from './legacy-device-overlay.js'

export const inject = ['loader', 'mygoStartup']
const clone = value => JSON.parse(JSON.stringify(value))
const phases = ['pending', 'loading', 'active', 'failed', 'disposed', 'unloading']
const protectedNames = new Set(['./plugins/client-composition.js', './plugins/instance-manager.js', './plugins/ui-client-manager.js', './plugins/unified-plugin-manager.js'])

export function apply(ctx) {
  const boot = ctx.mygoStartup
  const storage = localStorage
  const device = boot.configuration.deviceInstance ?? boot.configuration.selectedInstance
  const key = `mygo.local.v1:${location.origin}:${device.id}:${device.authenticationViewId}`
  const base = JSON.stringify(boot.configuration.entries)
  let revision = 0, overrides = {}, diagnostic = '', busy = false
  const listeners = new Set()
  const notify = () => { for (const listener of listeners) listener() }
  try {
    const saved = JSON.parse(storage.getItem(key) || 'null')
    if (saved) {
      const legacy = matchesLegacyDeviceOverlay(saved.base, boot)
      const previous = matchesPreviousDeviceOverlay(saved.base, boot)
      if (saved.version !== 1 || (saved.base !== base && !legacy && !previous) || !Number.isSafeInteger(saved.revision) || saved.revision < 0 || !saved.overrides || typeof saved.overrides !== 'object' || Array.isArray(saved.overrides)) throw Error('Invalid overlay or operator composition changed; reset this device overlay')
      for (const [id, value] of Object.entries(saved.overrides)) {
        const original = boot.configuration.entries.find(entry => entry.id === id)
        if (!original || (previous && !JSON.parse(saved.base).some(entry => entry.id === id)) || (legacy && id !== 'local-note') || protectedNames.has(original.name) || !value || Object.keys(value).some(k => !['config', 'disabled'].includes(k)) || typeof value.disabled !== 'boolean' || !value.config || typeof value.config !== 'object' || Array.isArray(value.config)) throw Error(`Saved override ${id} no longer matches curated startup`)
      }
      overrides = saved.overrides
      revision = saved.revision
      if (legacy) diagnostic = 'Legacy device overlay restored to retained local entries. The next accepted edit saves the shared-root composition.'
    }
  } catch (error) { diagnostic = `Saved overlay ignored: ${error.message}. Operator configuration is running; saved data is retained. Reset this device overlay to recover.` }
  const desiredEntry = entry => ({ ...clone(entry), ...clone(overrides[entry.id] || {}) })
  const errors = new WeakMap()
  const rows = () => [...ctx.loader.entries()].filter(boot.ownsEntry).map(entry => ({
    entryId: entry.id, rowId: entry.options.id, moduleName: entry.options.name,
    enabled: !entry.disabled, phase: entry.fiber ? phases[entry.fiber.state] ?? null : null,
    diagnostic: errors.get(entry.fiber) || (!entry.disabled && !entry.fiber ? 'No runtime fiber (import or activation did not complete)' : undefined),
    readOnlyReason: protectedNames.has(entry.options.name) || !boot.configuration.entries.some(e => e.id === entry.id) ? 'protected' : undefined,
    dependencies: Object.keys(entry.fiber?.inject || {}),
    parentId: entry.parent.ctx.fiber.entry?.id ?? null,
    config: clone(entry.options.config ?? {}),
    desired: desiredEntry(boot.configuration.entries.find(e => e.id === entry.id) || entry.options),
  }))
  async function change(id, patch, expectedRevision = revision) {
    if (busy) throw Error('Another local change is running')
    if (expectedRevision !== revision) throw Error('Stale local revision; refresh before saving')
    const original = boot.configuration.entries.find(entry => entry.id === id)
    if (!original || protectedNames.has(original.name)) throw Error('Protected startup service; change the operator startup file to replace it')
    if (Object.keys(patch).some(k => !['config', 'disabled'].includes(k))) throw Error('Only local config and enablement can be changed')
    if ('config' in patch && (!patch.config || Array.isArray(patch.config) || typeof patch.config !== 'object')) throw Error('Plugin configuration must be a JSON object')
    if ('disabled' in patch && typeof patch.disabled !== 'boolean') throw Error('Invalid enablement')
    if (busy || expectedRevision !== revision) throw Error('Local state changed during admission; refresh and retry')
    const stored = JSON.parse(storage.getItem(key) || 'null')
    if ((stored?.revision ?? 0) !== revision) throw Error('Another tab changed this device overlay; reload before saving')
    busy = true; notify()
    const entry = ctx.loader.resolve(id), previous = clone(entry.options)
    if (!boot.ownsEntry(entry)) { busy = false; notify(); throw Error('Entry is outside the local ownership scope') }
    const next = { config: previous.config ?? {}, disabled: Boolean(previous.disabled), ...clone(patch) }
    try {
      await ctx.loader.update(id, next)
      await ctx.loader.await()
      if (!next.disabled) await entry.fiber?.await()
      if (!next.disabled && entry.fiber?.state !== boot.FiberState.ACTIVE) throw Error(`Entry ${id} failed to activate: ${phases[entry.fiber?.state] || 'no fiber'}`)
      if ((JSON.parse(storage.getItem(key) || 'null')?.revision ?? 0) !== revision) throw Error('Another tab changed saved startup during lifecycle work; reload before saving')
      const candidate = { ...overrides, [id]: next }
      // A single localStorage replacement is atomic; commit only after lifecycle success.
      storage.setItem(key, JSON.stringify({ version: 1, base, revision: revision + 1, overrides: candidate }))
      overrides = candidate; revision++; diagnostic = ''
    } catch (error) {
      diagnostic = `Change rejected: ${error.message}`
      try {
        await ctx.loader.update(id, { config: previous.config ?? {}, disabled: Boolean(previous.disabled) })
        await ctx.loader.await()
        if (!previous.disabled && entry.fiber?.state !== boot.FiberState.ACTIVE) throw Error('previous entry is not ACTIVE')
        diagnostic += '; previous configuration restored'
      } catch (rollback) { diagnostic += `; rollback failed: ${rollback.message}. Reload or reset this device overlay.` }
      throw Error(diagnostic)
    } finally { busy = false; notify() }
  }
  const service = {
    desiredEntry, rows, change, subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener) },
    status: () => ({ revision, diagnostic, busy }),
    reportRecovery(id) { diagnostic = `Saved startup for ${id} failed; operator configuration is running instead. Edit the desired config or reset this device overlay.`; notify() },
    async reset() { storage.removeItem(key); location.reload() },
    async reload() { location.reload() },
  }
  ctx.provide('clientComposition', service)
  ctx.on('mygo/startup-entry', async (entry, next) => desiredEntry(await next()))
  ctx.on('mygo/startup-failed', async entry => {
    if (!boot.ownsEntry(entry) || !overrides[entry.options.id]) return
    const original = boot.configuration.entries.find(row => row.id === entry.options.id)
    if (!original) return
    await ctx.loader.update(entry.id, { config: original.config ?? {}, disabled: Boolean(original.disabled) })
    await ctx.loader.await()
    if (original.disabled || entry.fiber?.state === boot.FiberState.ACTIVE) service.reportRecovery(entry.id)
  })
  ctx.on('internal/status', fiber => {
    if (!fiber.entry || !boot.ownsEntry(fiber.entry)) return
    if (fiber.state === boot.FiberState.FAILED) {
      void fiber.await().catch(error => {
        if (fiber.state === boot.FiberState.FAILED) errors.set(fiber, error.message)
        notify()
      })
    } else { errors.delete(fiber) }
    notify()
  })
  ctx.effect(() => {
    const onStorage = event => { if (event.key === key) { diagnostic = 'Another tab changed saved startup; reload to restore it'; notify() } }
    addEventListener('storage', onStorage)
    return () => removeEventListener('storage', onStorage)
  })
}

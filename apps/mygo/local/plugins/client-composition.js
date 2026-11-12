// Local authority adapter over the one original Loader. Never calls Host Remote.
export const inject = ['loader', 'mygoStartup']
const clone = value => JSON.parse(JSON.stringify(value))
const phases = ['pending', 'loading', 'active', 'failed', 'disposed', 'unloading']
const protectedNames = new Set(['./plugins/client-composition.js', './plugins/instance-manager.js', './plugins/ui-client-manager.js', './plugins/unified-plugin-manager.js'])

export async function apply(ctx) {
  const boot = ctx.mygoStartup
  const base = JSON.stringify(boot.configuration.entries)
  let revision = 0, overrides = {}, diagnostic = '', busy = false
  const listeners = new Set()
  const configForms = new Map()
  const notify = () => { for (const listener of listeners) listener() }
  try {
    const response = await fetch('/mygo-local/client-config', { cache: 'no-store' })
    if (!response.ok) throw Error((await response.text()).trim() || 'Unable to load the MyGO!!!! plugin configuration')
    const saved = await response.json()
    if (saved.version !== 1 || !Number.isSafeInteger(saved.revision) || saved.revision < 0
      || saved.base !== null && typeof saved.base !== 'string' || !saved.overrides
      || typeof saved.overrides !== 'object' || Array.isArray(saved.overrides)) throw Error('Invalid MyGO!!!! client configuration')
    if (saved.base !== null && saved.base !== base) throw Error('Operator composition changed; reset the saved MyGO!!!! plugin configuration')
    for (const [id, value] of Object.entries(saved.overrides)) {
      const original = boot.configuration.entries.find(entry => entry.id === id)
      if (!original || protectedNames.has(original.name) || !value || Object.keys(value).some(k => !['config', 'disabled'].includes(k))
        || typeof value.disabled !== 'boolean' || !value.config || typeof value.config !== 'object' || Array.isArray(value.config)) throw Error(`Saved override ${id} no longer matches the MyGO!!!! composition`)
    }
    overrides = saved.overrides
    revision = saved.revision
  } catch (error) { diagnostic = `Saved MyGO!!!! plugin configuration ignored: ${error.message}` }
  async function persist(candidate) {
    const response = await fetch('/mygo-local/client-config', { method: 'PUT', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ expectedRevision: revision, base, overrides: candidate }) })
    if (!response.ok) throw Error(response.status === 409 ? 'Mygo plugin configuration changed; reload before saving'
      : (await response.text()).trim() || 'Unable to save the MyGO!!!! plugin configuration')
    const saved = await response.json()
    if (saved.version !== 1 || saved.revision !== revision + 1) throw Error('Invalid MyGO!!!! plugin configuration response')
    revision = saved.revision
  }
  const desiredEntry = entry => ({ ...clone(entry), ...clone(overrides[entry.id] || {}) })
  const applyConfigOps = (source, ops) => {
    const next = clone(source)
    for (const op of ops) {
      if (!op || !['set', 'unset'].includes(op.op) || !Array.isArray(op.path) || !op.path.length
        || op.path.some(segment => typeof segment !== 'string' || !segment || segment === '__proto__' || segment === 'prototype' || segment === 'constructor')) {
        throw Error('Invalid local configuration operation')
      }
      let parent = next
      for (const segment of op.path.slice(0, -1)) {
        const value = parent[segment]
        if (value === undefined) parent = parent[segment] = {}
        else if (!value || Array.isArray(value) || typeof value !== 'object') throw Error('Local configuration path is not an object')
        else parent = value
      }
      const field = op.path.at(-1)
      if (op.op === 'set') parent[field] = clone(op.value)
      else delete parent[field]
    }
    return next
  }
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
    busy = true; notify()
    const entry = ctx.loader.resolve(id), previous = clone(entry.options)
    if (!boot.ownsEntry(entry)) { busy = false; notify(); throw Error('Entry is outside the local ownership scope') }
    const next = { config: previous.config ?? {}, disabled: Boolean(previous.disabled), ...clone(patch) }
    try {
      await ctx.loader.update(id, next)
      await ctx.loader.await()
      if (!next.disabled) await entry.fiber?.await()
      if (!next.disabled && entry.fiber?.state !== boot.FiberState.ACTIVE) throw Error(`Entry ${id} failed to activate: ${phases[entry.fiber?.state] || 'no fiber'}`)
      const candidate = { ...overrides, [id]: next }
      await persist(candidate)
      overrides = candidate; diagnostic = ''
    } catch (error) {
      diagnostic = `Change rejected: ${error.message}`
      try {
        await ctx.loader.update(id, { config: previous.config ?? {}, disabled: Boolean(previous.disabled) })
        await ctx.loader.await()
        if (!previous.disabled && entry.fiber?.state !== boot.FiberState.ACTIVE) throw Error('previous entry is not ACTIVE')
        diagnostic += '; previous configuration restored'
      } catch (rollback) { diagnostic += `; rollback failed: ${rollback.message}. Reload or reset the MyGO!!!! plugin configuration.` }
      throw Error(diagnostic)
    } finally { busy = false; notify() }
  }
  const configForm = id => {
    if (configForms.has(id)) return configForms.get(id)
    const original = boot.configuration.entries.find(entry => entry.id === id)
    if (!original || protectedNames.has(original.name)) return undefined
    const unavailable = Object.freeze({ status: 'unavailable', value: undefined, base: undefined, user: undefined, revision: undefined, writable: false })
    let snapshot, snapshotKey
    const form = {
      getSnapshot() {
        const entry = ctx.loader.resolve(id)
        if (!boot.ownsEntry(entry)) return unavailable
        const saved = overrides[id]
        const key = JSON.stringify([revision, entry.options.config ?? {}, saved?.config])
        if (key === snapshotKey) return snapshot
        snapshotKey = key
        snapshot = {
          status: 'ready', value: clone(entry.options.config ?? {}), base: clone(original.config ?? {}),
          user: saved ? clone(saved.config) : undefined, revision, writable: true,
        }
        return snapshot
      },
      subscribe(listener) { return service.subscribe(listener) },
      async mutate(ops, expectedRevision) {
        const snapshot = form.getSnapshot()
        if (snapshot.status !== 'ready' || !snapshot.writable) return false
        if (expectedRevision !== undefined && expectedRevision !== snapshot.revision) return false
        const next = applyConfigOps(snapshot.value, ops)
        await change(id, { config: next }, expectedRevision ?? snapshot.revision)
        return true
      },
      set(field, value) { return form.mutate([{ op: 'set', path: [field], value }]) },
      unset(field) { return form.mutate([{ op: 'unset', path: [field] }]) },
    }
    configForms.set(id, form)
    return form
  }
  const service = {
    rows, change, configForm, subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener) },
    status: () => ({ revision, diagnostic, busy }),
    async reset() { await persist({}); location.reload() },
  }
  ctx.provide('clientComposition', service)
  ctx.on('mygo/startup-entry', async (entry, next) => desiredEntry(await next()))
  ctx.on('mygo/startup-failed', async entry => {
    if (!boot.ownsEntry(entry) || !overrides[entry.options.id]) return
    const original = boot.configuration.entries.find(row => row.id === entry.options.id)
    if (!original) return
    await ctx.loader.update(entry.id, { config: original.config ?? {}, disabled: Boolean(original.disabled) })
    await ctx.loader.await()
    if (original.disabled || entry.fiber?.state === boot.FiberState.ACTIVE) {
      diagnostic = `Saved startup for ${entry.id} failed; operator configuration is running instead. Edit the desired config or reset the MyGO!!!! plugin configuration.`
      notify()
    }
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

}

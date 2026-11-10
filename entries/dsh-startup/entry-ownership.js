// Attribution over original Loader objects; this is not an authority or sandbox.
export function createEntryOwnership() {
  const owners = new WeakMap()
  const scopes = new Set()
  function attach(loader, owner) {
    let active = true
    const identity = Object.freeze({ ...owner })
    const claim = entry => {
      const previous = owners.get(entry)
      if (previous && previous !== identity) throw Error('Loader entry already has an owner')
      owners.set(entry, identity)
    }
    const scope = {
      owner: identity,
      // Concrete Entry references are for integration lifecycle work, never package aliases.
      entries: () => active ? [...loader.entries()].filter(entry => owners.get(entry) === identity) : [],
    }
    const off = loader.ctx.on('loader/entry-init', claim)
    for (const entry of loader.entries()) claim(entry)
    scopes.add(scope)
    loader.ctx.effect(() => () => { active = false; off(); scopes.delete(scope) }, 'mygo: entry ownership')
    return Object.freeze(scope)
  }
  function snapshot() {
    return [...scopes].flatMap(scope => scope.entries().map(entry => ({
      owner: scope.owner,
      entryId: entry.id,
      packageId: entry.options.name,
      disabled: entry.disabled,
      fiberState: entry.fiber?.state ?? null,
    })))
  }
  return Object.freeze({ attach, ownerOf: entry => owners.get(entry), snapshot })
}

// Adapt only the public facade instance. ClientEntries retains its original queue,
// release gate, create/remove/reload methods, package IDs and dependency semantics.
export function bindRemoteEntryOwnership(facade, registry, selectedInstance) {
  let scope
  let clientEntries
  let removedGraph
  let inactiveBefore
  const create = facade.create
  facade.create = function (...args) {
    const modules = create.apply(this, args)
    const entries = modules.entries
    clientEntries = entries
    const start = entries.start
    entries.start = function (loader, manifest) {
      scope ??= registry.attach(loader, {
        kind: 'instance',
        instanceId: selectedInstance.id,
        authenticationViewId: selectedInstance.authenticationViewId,
      })
      return start.call(this, loader, manifest)
    }
    return modules
  }
  // A deliberately bounded diagnostic case, not a general graph controller.
  // ClientEntries.sync owns serialization, Loader removal, fiber settlement and pruning.
  async function removeTerminalContribution() {
    const id = '@deepseek-ai/dsh-client-ui-sidebar-terminal'
    if (!scope || !clientEntries) throw Error('Remote entries have not started')
    const candidates = scope.entries().filter(entry => entry.options.name === id)
    if (!removedGraph) {
      if (candidates.length !== 1) throw Error('Expected one original Terminal entry')
      const entry = candidates[0]
      if (registry.ownerOf(entry) !== scope.owner || entry.fiber?.state !== 2) {
        throw Error('Terminal entry is not active in the selected instance scope')
      }
      const graph = globalThis.__DSH_BOOT__
      if (!graph || graph.entries.some(row => row.id !== id &&
        [...(row.inject ?? []), ...(row.external ?? [])].some(dep => dep.replace(/\/client$/, '') === id))) {
        throw Error('Terminal removal would affect a dependent entry or graph is unavailable')
      }
      inactiveBefore = new Set(scope.entries().filter(row => !row.fiber).map(row => row.options.name))
      removedGraph = {
        ...graph,
        entries: graph.entries.filter(row => row.id !== id),
        batches: graph.batches.map(batch => ({ ...batch, entries: batch.entries.filter(key => key !== id) }))
          .filter(batch => batch.entries.length),
      }
    }
    await clientEntries.sync(removedGraph)
    const failures = clientEntries.state.getSnapshot().failures
    // Reconciliation also retries already-unmounted optional entries. Preserve their
    // diagnostics without attributing that pre-existing absence to this removal.
    const newFailures = failures.filter(failure => !inactiveBefore.has(failure.id))
    if (newFailures.length) throw Error(`Terminal removal failed: ${JSON.stringify(newFailures)}`)
    if (scope.entries().some(entry => entry.options.name === id)) throw Error('Terminal entry remains after reconciliation')
    return { removed: id, remaining: scope.entries().length, preexistingInactiveFailures: failures }
  }
  return Object.freeze({ get scope() { return scope }, removeTerminalContribution })
}

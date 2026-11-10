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
  const create = facade.create
  facade.create = function (...args) {
    const modules = create.apply(this, args)
    const entries = modules.entries
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
  return Object.freeze({ get scope() { return scope } })
}

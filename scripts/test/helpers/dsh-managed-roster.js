// Browser-only observation at the original public bootstrap/ClientEntries seams.
// No fake Loader, graph controller, entry attribution or replacement lifecycle.
export function observeManagedRoster() {
  let facade, modules, loader
  Object.defineProperty(globalThis, '__ModuleLoader__', {
    configurable: true,
    get: () => facade,
    set(value) {
      facade = value
      const create = value.create
      value.create = function (...args) {
        modules = create.apply(this, args)
        const start = modules.entries.start
        modules.entries.start = function (actualLoader, manifest) {
          loader = actualLoader
          return start.call(this, actualLoader, manifest)
        }
        return modules
      }
    },
  })
  const retained = new Map()
  const rows = () => [...loader.entries()]
  globalThis.__MYGO_ROSTER_TEST__ = {
    capture() {
      for (const entry of rows()) retained.set(entry.id, {
        entry, namespace: entry.moduleNamespace, fiber: entry.fiber,
      })
      return this.snapshot()
    },
    snapshot() {
      return rows().map(entry => ({
        id: entry.id, name: entry.options.name, state: entry.fiber?.state ?? null,
        moduleLoaded: entry.moduleNamespace !== undefined,
        sameEntry: retained.get(entry.id)?.entry === entry,
        sameModule: retained.get(entry.id)?.namespace === entry.moduleNamespace,
        sameFiber: retained.get(entry.id)?.fiber === entry.fiber,
      })).sort((a, b) => a.id.localeCompare(b.id))
    },
    async sync(graph) {
      try {
        await modules.entries.sync(graph)
        return { failures: modules.entries.state.getSnapshot().failures }
      } catch (error) {
        return { error: String(error) }
      }
    },
    removedState(id) { return retained.get(id)?.fiber?.state },
  }
}

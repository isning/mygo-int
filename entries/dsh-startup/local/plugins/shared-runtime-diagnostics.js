// Acceptance instrumentation using original services and Slots; no product UI.
// Kept separate so platform startup does not implement diagnostic presentation.
export function createSharedRuntimeDiagnostics({ React, Context, getConfiguration }) {
  return {
    inject: ['slots', 'modules'],
    async apply(scope) {
      scope.provide('mygoMigration', Object.freeze({ label: 'MYGO supplied Context service' }))
      const react = await scope.modules.import('react')
      const cordis = await scope.modules.import('@deepseek-ai/cordis')
      const localEntries = [...scope.loader.entries()].filter(entry =>
        getConfiguration().entries.some(options => options.id === entry.options.id))
      const localModulesShared = (await Promise.all(localEntries.filter(entry => !entry.disabled).map(async entry =>
        await scope.modules.import(entry.options.name) === entry.moduleNamespace))).every(Boolean)
      scope.slots.inject('shell.overlay', () => scope.slots.register({ name: 'shell.overlay', id: 'mygo-shared-runtime-diagnostic' }, () => {
        const [label] = React.useState(scope.mygoMigration.label)
        const entries = [...scope.loader.entries()]
        return React.createElement('aside', {
          hidden: true,
          'data-mygo-shared-client': '',
          'data-local-active': String(localEntries.length > 0 && localEntries.every(entry => entry.disabled || entry.fiber?.state === 2)),
          'data-local-entry': localEntries.map(entry => entry.options.name).join(','),
          'data-session-active': String(entries.some(entry => entry.options.name === '@deepseek-ai/dsh-client-ui-session' && entry.fiber?.state === 2)),
          'data-platform-singletons': String(localModulesShared && react === React && cordis.Context === Context && scope instanceof Context && scope.modules === scope.loader.internal),
        }, label)
      }))
    },
  }
}

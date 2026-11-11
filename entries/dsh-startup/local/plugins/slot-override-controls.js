// Acceptance fixture only: drive the original local Entry, never Host management.
export const inject = ['slots', 'modules', 'loader', 'sessions']
export async function apply(ctx) {
  const React = await ctx.modules.import('react')
  const entry = [...ctx.loader.entries()].find(row => row.options.id === 'local-workspace-override')
  if (!entry) throw Error('Missing local workspace override Entry')
  await entry.update({ disabled: true })
  const sessions = ctx.sessions
  const sessionEntry = [...ctx.loader.entries()].find(row => row.options.name === '@deepseek-ai/dsh-client-ui-session')
  const sessionFiber = sessionEntry?.fiber
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({ name: 'shell.overlay', id: 'mygo-slot-override-controls' }, function Controls() {
    const [result, setResult] = React.useState('ready')
    const run = action => async () => {
      try {
        if (action === 'remove') await ctx.loader.remove(entry.options.id)
        else await entry.update({ disabled: action === 'disable' })
        await ctx.loader.await()
        if (ctx.sessions !== sessions || sessionEntry?.fiber !== sessionFiber || sessionFiber?.state !== 2) {
          throw Error('Session service or active Entry changed')
        }
        setResult(action + ': session retained')
      } catch (error) { setResult('FAILED: ' + String(error)) }
    }
    return React.createElement('aside', { 'data-slot-override-controls': '', style: { position: 'fixed', bottom: 40, right: 8, zIndex: 10000, background: 'white', color: 'black' } },
      ...['enable', 'disable', 'remove'].map(action => React.createElement('button', { key: action, onClick: run(action), 'data-slot-action': action }, action)),
      React.createElement('output', null, result))
  }))
}

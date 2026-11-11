// Presentation in the original sidebar; catalog selection never retargets transport.
export const inject = ['instanceManager', 'slots', 'modules', 'connection']
export async function apply(ctx) {
  const React = await ctx.modules.import('react')
  const { Button, Menu, MenuItemButton, ConnectionIndicator } = await ctx.modules.import('@deepseek-ai/dsh-client-ui-primitives')
  const h = React.createElement
  const manager = ctx.instanceManager
  const connection = ctx.connection
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action', id: 'mygo-instances', order: -100,
  }, function InstanceNavigation({ wide }) {
    const [snapshot, setSnapshot] = React.useState(() => manager.snapshot())
    const [open, setOpen] = React.useState(false)
    const [pending, setPending] = React.useState(false)
    const [error, setError] = React.useState('')
    React.useEffect(() => {
      const update = () => setSnapshot(manager.snapshot())
      const unsubscribe = manager.subscribe(update)
      update()
      return unsubscribe
    }, [])
    const state = React.useSyncExternalStore(connection.state.subscribe, connection.state.getSnapshot) ?? 'connecting'
    const selected = snapshot.catalog.find(row => row.id === snapshot.selectedId)
    const bound = snapshot.catalog.find(row => row.id === snapshot.connectedId)
    const boundLabel = `Bound connection: ${bound?.name ?? snapshot.connectedId} · ${state}`
    async function select(id) {
      setPending(true); setError('')
      try { await manager.select(id) }
      catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)) }
      finally { setPending(false) }
    }
    return h('div', { 'data-mygo-navigation': '' },
      h(Menu, {
        open, onClose: () => setOpen(false), portal: true, side: 'top', autoFocus: true,
        anchor: h(Button, {
          'aria-label': 'Instances', 'aria-haspopup': 'menu', 'aria-expanded': open,
          title: boundLabel, onClick: () => setOpen(value => !value),
        }, wide ? `Instances · ${state}` : '◎'),
      },
      h('div', { style: { padding: 12, maxWidth: 300, overflowWrap: 'anywhere' }, 'aria-busy': pending },
        h('p', null, `Saved profile: ${selected?.name ?? snapshot.selectedId}`),
        h('p', { role: 'status' }, boundLabel),
        snapshot.selectedId !== snapshot.connectedId && h('p', { role: 'status' }, 'External profile unavailable; no connection was switched.'),
        h('p', null, 'Selection is saved on this device. Only the operator-bound carrier can connect.'),
        h(ConnectionIndicator, {
          state: state === 'connected' ? undefined : state,
          disconnectedLabel: 'Bound connection disconnected · reconnect',
          connectingLabel: 'Connecting to bound instance', recoveredLabel: 'Connection restored',
          reconnectActionLabel: 'Reconnect bound instance', restartActionLabel: 'Restart bound connection',
          onReconnect: () => connection.reconnect(),
        }),
        snapshot.diagnostic && h('p', { role: 'alert' }, snapshot.diagnostic),
        error && h('p', { role: 'alert' }, error)),
      ...snapshot.catalog.map(row => h(MenuItemButton, {
        key: row.id, current: row.id === snapshot.selectedId, disabled: pending,
        onSelect: () => void select(row.id),
      }, `Select ${row.name}`))))
  }))
}

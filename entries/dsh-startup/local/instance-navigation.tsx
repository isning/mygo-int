// Original sidebar/menu chrome over the actual bound connection.
import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { IconChevronDownOutlineRegular, IconDatabaseOutlineRegular, IconRefreshOutlineRegular, IconSettingsOutlineMedium, Menu, MenuItemButton, StateDot, Toast } from '@deepseek-ai/dsh-client-ui-primitives'
import css from '../../../.scratch/upstream/deepseek-harness/packages/client/ui-settings-account/src/client/AccountMenu.module.css'

export function registerInstanceNavigation(ctx) {
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action', id: 'mygo-instances', order: -100,
  }, function InstanceNavigation({ wide }) {
    const manager = ctx.instanceManager
    const connection = ctx.connection
    const [snapshot, setSnapshot] = useState(() => manager.snapshot())
    useEffect(() => {
      const update = () => setSnapshot(manager.snapshot())
      const off = manager.subscribe(update)
      update()
      return off
    }, [manager])
    const state = useSyncExternalStore(connection.state.subscribe, connection.state.getSnapshot) ?? 'connecting'
    useSyncExternalStore(listener => ctx.slots.subscribe('sidebar.settings', listener), () => ctx.slots.getVersion('sidebar.settings'))
    const [open, setOpen] = useState(false)
    const trigger = useRef<HTMLButtonElement>(null)
    const [error, setError] = useState('')
    const bound = snapshot.catalog.find(row => row.id === snapshot.connectedId)
    // At this pin the original shell explicitly exposes its shared instance
    // through store.create(); no second settings store or DOM clicks are used.
    const settings = ctx.slots.entries('sidebar.settings').find(entry => typeof entry.store?.create === 'function')?.store
    const dot = state === 'connected' ? 'done' : state === 'connecting' ? 'ongoing' : 'error'
    const status = state === 'connected' ? 'Connected' : state === 'connecting' ? 'Connecting…' : 'Disconnected'
    const name = bound?.name ?? snapshot.connectedId
    return <div className={css.root} data-mygo-navigation="">
      <Menu open={open} onClose={() => setOpen(false)} portal side="top" autoFocus
        className={css.anchor} listClassName={css.signedOutMenu}
        anchor={<button ref={trigger} type="button" className={css.trigger} data-signed-out="true" data-collapsed={!wide}
          aria-label="Instances" aria-haspopup="menu" aria-expanded={open} title={`${name} · ${status}`}
          onClick={() => setOpen(value => !value)}>
          <IconDatabaseOutlineRegular size={16} />
          {wide && <><span className={css.label}>{name}</span><StateDot state={dot} size={8} /><IconChevronDownOutlineRegular size={12} /></>}
        </button>}>
        {snapshot.catalog.map(row => <MenuItemButton key={row.id} current={row.id === snapshot.connectedId}
          icon={<StateDot state={row.id === snapshot.connectedId ? dot : 'idle'} size={8} />}
          disabled={row.id !== snapshot.connectedId}
          disabledReason="No connection is available for this instance yet."
          onSelect={() => setOpen(false)}>{row.name}</MenuItemButton>)}
        {state !== 'connected' && <MenuItemButton separatorBefore icon={<IconRefreshOutlineRegular size={16} />}
          disabled={state === 'connecting'} onSelect={() => { connection.reconnect(); setOpen(false) }}>Reconnect</MenuItemButton>}
        <MenuItemButton separatorBefore icon={<IconSettingsOutlineMedium size={16} />} disabled={!settings}
          onSelect={() => {
            try { setOpen(false); trigger.current?.focus(); settings.create().actions.openSection('mygo-instances') }
            catch (failure) { setError(failure instanceof Error ? failure.message : String(failure)) }
          }}>Manage instances</MenuItemButton>
      </Menu>
      {error && <Toast text={error} onDone={() => setError('')} />}
    </div>
  }))
}

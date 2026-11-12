// Original sidebar/menu chrome over the actual bound connection.
import { useClientText, clientError } from './i18n'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { IconChevronDownOutlineRegular, IconDatabaseOutlineRegular, IconRefreshOutlineRegular, IconSettingsOutlineMedium, Menu, MenuItemButton, StateDot, Toast } from '@deepseek-ai/dsh-client-ui-primitives'
import css from '@deepseek-ai/dsh-client-ui-settings-account/src/client/AccountMenu.module.css'
import type { InstanceProfile, MygoContext } from './types'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'

type SettingsStore = { create(): { actions: { openSection(id: string): void } } }

export function registerInstanceNavigation(ctx: MygoContext) {
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action', id: 'mygo-instances', order: -100,
  }, function InstanceNavigation({ wide }: { wide: boolean }) {
    const t = useClientText(ctx)
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
    const [switching, setSwitching] = useState(false)
    const bound = snapshot.catalog.find(manager.isCurrentProfile)
    // At this pin the original shell explicitly exposes its shared instance
    // through store.create(); no second settings store or DOM clicks are used.
    const settings = ctx.slots.entries('sidebar.settings').map(entry => entry.store as SettingsStore | undefined)
      .find((store): store is SettingsStore => typeof store?.create === 'function')
    const dot = state === 'connected' ? 'done' : state === 'connecting' ? 'ongoing' : 'error'
    const status = state === 'connected' ? t('Connected') : state === 'connecting' ? t('Connecting…') : t('Disconnected')
    const name = bound?.name ?? snapshot.currentId
    return <div className={css.root} data-mygo-navigation="">
      <Menu open={open} onClose={() => setOpen(false)} portal side="top" autoFocus
        className={css.anchor} listClassName={css.signedOutMenu}
        anchor={<button ref={trigger} type="button" className={css.trigger} data-signed-out="true" data-collapsed={!wide}
          aria-label={t('Instances')} aria-haspopup="menu" aria-expanded={open} title={`${name} · ${status} · ${snapshot.currentProfile?.address ?? ''}`}
          onClick={() => setOpen(value => !value)}>
          <IconDatabaseOutlineRegular size={16} />
          {wide && <>
            <span className={css.label}>{name}</span><StateDot state={dot} size={8} /><IconChevronDownOutlineRegular size={12} />
          </>}
        </button>}>
        {snapshot.catalog.map((row: InstanceProfile) => <MenuItemButton key={`${row.id}:${row.authenticationViewId}`} current={manager.isCurrentProfile(row)}
          icon={<StateDot state={manager.isCurrentProfile(row) ? dot : 'idle'} size={8} />}
          disabled={switching}
          onSelect={() => {
            setOpen(false)
            if (manager.isCurrentProfile(row)) return
            setSwitching(true)
            void manager.select(row).catch((failure: unknown) => { setSwitching(false); setError(clientError(ctx, failure)) })
          }}>{row.name}</MenuItemButton>)}
        {state !== 'connected' && <MenuItemButton separatorBefore icon={<IconRefreshOutlineRegular size={16} />}
          disabled={state === 'connecting'} onSelect={() => { connection.reconnect(); setOpen(false) }}>{t('Reconnect')}</MenuItemButton>}
        <MenuItemButton separatorBefore icon={<IconSettingsOutlineMedium size={16} />} disabled={!settings}
          onSelect={() => {
            try { setOpen(false); trigger.current?.focus(); settings?.create().actions.openSection('mygo-instances') }
            catch (failure) { setError(clientError(ctx, failure)) }
          }}>{t('Manage instances')}</MenuItemButton>
      </Menu>
      {error && <Toast text={error} onDone={() => setError('')} />}
    </div>
  }))
}

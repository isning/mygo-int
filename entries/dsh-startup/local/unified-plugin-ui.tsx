// Extend the original Plugins page through its native tab contract. The original
// main registration, page, Host controller, cards and dialogs stay in charge.
import React, { useEffect, useState } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/cordis-plugin-loader'
import type {} from '@deepseek-ai/dsh-client-modules/client'
import { Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import { RowsSection, RowDetail } from '../../../.scratch/upstream/deepseek-harness/packages/client/ui-plugin-manager/src/client/PluginManagerPage.tsx?mygo-rows'
import type { PackageRow, PackageView } from '../../../.scratch/upstream/deepseek-harness/packages/client/ui-plugin-manager/src/client/manager-store.ts'
import type { PluginManagerPageProps } from '../../../.scratch/upstream/deepseek-harness/packages/client/ui-plugin-manager/src/client/PluginManagerPage.tsx'
import css from '../../../.scratch/upstream/deepseek-harness/packages/client/ui-plugin-manager/src/client/PluginManagerPage.module.css'
import { LocalPluginActions, type LocalCompositionService } from './unified-local-actions'
import { InstanceClientActions } from './unified-instance-actions'

type Source = 'LOCAL' | 'INSTANCE CLIENT'
type ClientContext = Context & {
  clientComposition: LocalCompositionService
  mygoStartup: {
    admit(): Promise<void>
    ownsEntry(entry: unknown): boolean
    configuration: { selectedInstance: { id: string; authenticationViewId: string } }
  }
}
type InspectRow = Omit<PackageRow, 'entryId'> & { entryId?: string }
type Translate = PluginManagerPageProps['t']
const phases = ['pending', 'loading', 'active', 'failed', null, 'unloading'] as const

function ClientPlugins({ ctx, source, t }: { ctx: ClientContext; source: Source; t: Translate }) {
  const [, refresh] = useState(0)
  const [selected, select] = useState<string>()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const resolveText = (text: Parameters<typeof ctx.locale.resolveText>[0]) => ctx.locale.resolveText(text)
  useEffect(() => {
    const update = () => refresh(value => value + 1)
    const off = ctx.clientComposition.subscribe(update)
    const status = ctx.on('internal/status', update)
    const timer = setInterval(update, 1000)
    return () => { off(); status(); clearInterval(timer) }
  }, [ctx])
  const local = ctx.clientComposition.rows()
  const rows: InspectRow[] = source === 'LOCAL' ? local.map(row => ({ ...row,
    ...(row.readOnlyReason ? { readOnlyReason: 'management-required' as const } : {}),
  })) : [...ctx.loader.entries()].filter(entry => !ctx.mygoStartup.ownsEntry(entry)
    && ctx.modules.manifest.plugins.some(plugin => plugin.id === entry.options.name)).map(entry => ({
      entryId: entry.id, rowId: entry.options.id, moduleName: entry.options.name,
      enabled: !entry.disabled, phase: entry.fiber ? phases[entry.fiber.state] ?? null : null,
    }))
  const row = rows.find(row => row.entryId === selected)
  const scope = source === 'LOCAL' ? 'This device' : ctx.mygoStartup.configuration.selectedInstance.id
  const pkg: PackageView = { name: scope, meta: { title: source === 'LOCAL' ? 'Local plugins' : 'Instance client' },
    official: false, installed: false, availability: 'profile', optional: false, removable: false,
    updatable: false, enabled: true, rows: rows as PackageRow[] }
  if (row) return <RowDetail pkg={pkg} row={row} t={t} resolveText={resolveText} form={undefined}
    onBack={() => select(undefined)} renderSlot={(key, owner) => {
      if (key === 'plugins.detail.badge') return <Tag tone="neutral">{source === 'LOCAL' ? 'Local' : 'Instance client'}</Tag>
      if (key !== 'plugins.row.config') return null
      if (owner.view === 'summary') return source === 'LOCAL' ? 'Runs on this device.' : `Supplied by ${scope}; runs on this device.`
      return source === 'LOCAL'
        ? <LocalPluginActions ctx={ctx} row={row} onChanged={() => refresh(value => value + 1)} />
        : <InstanceClientActions ctx={ctx} row={row} onChanged={() => refresh(value => value + 1)} />
    }} />
  return <section className={css.group} data-mygo-plugin-source={source}>
    <p className={css.pageIntro}>{source === 'LOCAL'
      ? 'Plugins on this device. Changes here do not modify your Host.'
      : `Client plugins supplied by ${scope}. Their versions follow the instance.`}</p>
    {error && <p role="alert" className={css.reason}>{error}</p>}
    <RowsSection rows={rows} t={t} resolveText={resolveText}
      configure={{ has: row => row.entryId !== undefined, open: row => select(row.entryId) }}
      toggle={source === 'LOCAL' ? {
        busy: () => busy || ctx.clientComposition.status().busy,
        onSetEnabled: (row, enabled) => {
          if (busy || !row.entryId) return
          setBusy(true); setError('')
          void ctx.clientComposition.change(row.entryId, { disabled: !enabled }, ctx.clientComposition.status().revision)
            .catch(error => setError(error instanceof Error ? error.message : String(error)))
            .finally(() => setBusy(false))
        },
      } : undefined} />
  </section>
}

export function register(ctx: ClientContext) {
  // The original main entry owns the page and its child-slot declarations.
  // Contributions use those declarations rather than replacing the page or
  // duplicating its controller, navigation state, header, CSS or dialogs.
  ctx.slots.inject('plugins.tab', function* () {
    yield ctx.slots.register({ name: 'plugins.tab', id: 'mygo-local', label: 'Local', order: -20, locale: 'pluginManager' },
      ({ t }) => <ClientPlugins ctx={ctx} source="LOCAL" t={t} />)
    yield ctx.slots.register({ name: 'plugins.tab', id: 'mygo-instance-client', label: 'Instance client', order: -10, locale: 'pluginManager' },
      ({ t }) => <ClientPlugins ctx={ctx} source="INSTANCE CLIENT" t={t} />)
  })
}

// Extend the original Plugins page through its native tab contract. The original
// main registration, page, Host controller, cards and dialogs stay in charge.
import React, { useEffect, useState } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/cordis-plugin-loader'
import type {} from '@deepseek-ai/dsh-client-modules/client'
import { Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import { PackageCard, RowDetail } from '../../../.scratch/upstream/deepseek-harness/packages/client/ui-plugin-manager/src/client/PluginManagerPage.tsx?mygo-rows'
import type { PackageRow, PackageView } from '../../../.scratch/upstream/deepseek-harness/packages/client/ui-plugin-manager/src/client/manager-store.ts'
import type { PluginManagerPageProps } from '../../../.scratch/upstream/deepseek-harness/packages/client/ui-plugin-manager/src/client/PluginManagerPage.tsx'
import css from '../../../.scratch/upstream/deepseek-harness/packages/client/ui-plugin-manager/src/client/PluginManagerPage.module.css'
import { LocalPluginActions, type LocalCompositionService } from './unified-local-actions'
import { installPluginSideBadges, type PluginRuntimeFacts } from './plugin-side-badges'
import { installRuntimeDetails, RuntimeDetails } from './plugin-runtime-details'

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

function LocalPlugins({ ctx, t, facts }: { ctx: ClientContext; t: Translate; facts: PluginRuntimeFacts }) {
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
  const rows: InspectRow[] = local.map(row => ({ ...row,
    ...(row.readOnlyReason ? { readOnlyReason: 'management-required' as const } : {}),
  }))
  const row = rows.find(row => row.entryId === selected)
  const scope = 'This device'
  const pkg: PackageView = { name: scope, meta: { title: 'Local plugins' },
    official: false, installed: false, availability: 'profile', optional: false, removable: false,
    updatable: false, enabled: true, rows: rows as PackageRow[] }
  if (row) return <RowDetail pkg={pkg} row={row} t={t} resolveText={resolveText} form={undefined}
    onBack={() => select(undefined)} renderSlot={(key, owner) => {
      if (key === 'plugins.detail.section') return <RuntimeDetails ctx={ctx} facts={facts} modules={[row.moduleName]} local />
      if (key === 'plugins.detail.badge') return <Tag tone="neutral">Local</Tag>
      if (key !== 'plugins.row.config') return null
      if (owner.view === 'summary') return 'Runs on this device.'
      return <LocalPluginActions ctx={ctx} row={row} onChanged={() => refresh(value => value + 1)} />
    }} />
  const names: Record<string, { title: string; description: string; group: 'basic' | 'extensions' }> = {
    './plugins/client-composition.js': { title: 'Client composition', description: 'Manage local plugins and device startup preferences.', group: 'basic' },
    './plugins/instance-manager.js': { title: 'Instances', description: 'Save and select connection profiles on this device.', group: 'basic' },
    './plugins/unified-plugin-manager.js': { title: 'Plugin management', description: 'Extend Plugins with local controls and runtime information.', group: 'basic' },
    './plugins/local-navigation.js': { title: 'Instance navigation', description: 'Access instance profiles from the application sidebar.', group: 'basic' },
    './plugins/ui-client-manager.js': { title: 'Local settings', description: 'Manage this client from the original Settings page.', group: 'basic' },
    './plugins/marker.js': { title: 'Local note', description: 'An experimental example of a local UI contribution.', group: 'extensions' },
  }
  const change = (row: InspectRow, enabled: boolean) => {
    if (busy || !row.entryId) return
    setBusy(true); setError('')
    void ctx.clientComposition.change(row.entryId, { disabled: !enabled }, ctx.clientComposition.status().revision)
      .catch(error => setError(error instanceof Error ? error.message : String(error)))
      .finally(() => setBusy(false))
  }
  return <div className={css.installedPanel} data-mygo-plugin-source="LOCAL">
    {error && <p role="alert" className={css.reason}>{error}</p>}
    {(['basic', 'extensions', 'bundles'] as const).map(group => {
      const members = rows.filter(row => (names[row.moduleName]?.group ?? 'bundles') === group)
      if (!members.length) return null
      return <section key={group} className={css.group} data-local-plugin-group={group}>
        <div className={css.groupHead}><h3 className={css.groupTitle}>{t(group === 'basic' ? 'basicTitle' : group === 'extensions' ? 'extensionsTitle' : 'bundlesTitle')}</h3></div>
        <ul className={css.cards}>{members.map(row => <PackageCard key={row.entryId ?? row.rowId}
          pkg={{ ...pkg, name: row.moduleName, enabled: row.enabled, rows: [row as PackageRow],
            meta: { ...row.meta, title: names[row.moduleName]?.title ?? row.moduleName,
              description: names[row.moduleName]?.description ?? row.moduleName },
            ...(row.readOnlyReason ? { readOnlyReason: row.readOnlyReason } : {}),
          }} t={t} resolveText={resolveText} busy={busy || ctx.clientComposition.status().busy}
          highlighted={false} newer={undefined} onOpen={() => select(row.entryId)} onSetEnabled={enabled => change(row, enabled)} />)}</ul>
      </section>
    })}
  </div>
}

export function register(ctx: ClientContext) {
  const facts = installPluginSideBadges(ctx, entry => ctx.mygoStartup.ownsEntry(entry))
  installRuntimeDetails(ctx, facts)
  // The original main entry owns the page and its child-slot declarations.
  // Contributions use those declarations rather than replacing the page or
  // duplicating its controller, navigation state, header, CSS or dialogs.
  ctx.slots.inject('plugins.tab', function* () {
    yield ctx.slots.register({ name: 'plugins.tab', id: 'mygo-local', label: 'Local', order: -20, locale: 'pluginManager' },
      ({ t }) => <LocalPlugins ctx={ctx} t={t} facts={facts} />)
  })
}

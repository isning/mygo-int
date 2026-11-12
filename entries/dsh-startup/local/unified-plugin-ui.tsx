// Extend the original Plugins page through its native tab contract. The original
// main registration, page, Host controller, cards and dialogs stay in charge.
import { useClientText, clientError } from './i18n'
import React, { useEffect, useState } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/cordis-plugin-loader'
import type {} from '@deepseek-ai/dsh-client-modules/client'
import { Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import { PackageCard, PackageDetail, ItemCard, ItemDetail, RowDetail } from '../../../.scratch/upstream/deepseek-harness/packages/client/ui-plugin-manager/src/client/PluginManagerPage.tsx?mygo-rows'
import type { PackageRow, PackageView } from '../../../.scratch/upstream/deepseek-harness/packages/client/ui-plugin-manager/src/client/manager-store.ts'
import type { PluginManagerPageProps } from '../../../.scratch/upstream/deepseek-harness/packages/client/ui-plugin-manager/src/client/PluginManagerPage.tsx'
import css from '../../../.scratch/upstream/deepseek-harness/packages/client/ui-plugin-manager/src/client/PluginManagerPage.module.css'
import { installPluginSideBadges, type PluginRuntimeFacts } from './plugin-side-badges'
import { installRuntimeDetails, RuntimeDetails } from './plugin-runtime-details'

type ClientContext = Context & {
  clientComposition: {
    rows(): InspectRow[]
    status(): { revision: number; busy: boolean; diagnostic: string }
    subscribe(listener: () => void): () => void
    change(id: string, patch: { disabled?: boolean }, revision?: number): Promise<void>
  }
  mygoStartup: {
    admit(): Promise<void>
    ownsEntry(entry: unknown): boolean
    configuration: { selectedInstance: { id: string; authenticationViewId: string } }
  }
}
type InspectRow = Omit<PackageRow, 'entryId'> & { entryId?: string }
type Translate = PluginManagerPageProps['t']

const localPluginInfo: Record<string, { title: string; description: string; group: 'basic' | 'extensions' }> = {
  './plugins/client-composition.js': { title: 'Startup preferences', description: 'Remembers enabled plugins and their options on this device.', group: 'basic' },
  './plugins/instance-manager.js': { title: 'Instance profiles', description: 'Stores your remote connection profiles. Manage them in Settings → Instances.', group: 'basic' },
  './plugins/unified-plugin-manager.js': { title: 'Plugin manager', description: 'Adds this Local tab and plugin runtime details.', group: 'basic' },
  './plugins/local-navigation.js': { title: 'Instance switcher', description: 'Shows the instance selector in the sidebar.', group: 'basic' },
  './plugins/ui-client-manager.js': { title: 'Settings integration', description: 'Adds device preferences and instance profiles to Settings.', group: 'basic' },
  './plugins/touch-feedback.js': { title: 'Touch feedback', description: 'Removes the browser’s tap highlight while preserving keyboard focus indicators.', group: 'extensions' },
}

function LocalPlugins({ ctx, t, facts, renderConfiguration }: { ctx: ClientContext; t: Translate; facts: PluginRuntimeFacts; renderConfiguration: PluginManagerPageProps['renderSlot'] }) {
  const clientT = useClientText(ctx)
  const [, refresh] = useState(0)
  const [view, setView] = useState<{ entryId?: string; component?: boolean }>({})
  const selected = view.entryId
  const component = view.component ?? false
  const select = (entryId?: string) => setView({ entryId })
  const setComponent = (value: boolean) => setView({ entryId: selected, component: value })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const resolveText = (text: Parameters<typeof ctx.locale.resolveText>[0]) => ctx.locale.resolveText(text)
  useEffect(() => {
    const update = () => refresh(value => value + 1)
    const off = ctx.clientComposition.subscribe(update)
    const status = ctx.on('internal/status', update)
    const configurations = ctx.slots.subscribe('plugins.bundle.config', update)
    const timer = setInterval(update, 1000)
    return () => { off(); status(); configurations(); clearInterval(timer) }
  }, [ctx])
  const local = ctx.clientComposition.rows()
  const rows: InspectRow[] = local.map(row => ({ ...row,
    meta: { ...row.meta, ...(localPluginInfo[row.moduleName] ? { title: clientT(localPluginInfo[row.moduleName].title), description: clientT(localPluginInfo[row.moduleName].description) } : {}) },
    ...(row.readOnlyReason ? { readOnlyReason: 'management-required' as const } : {}),
  }))
  const row = rows.find(row => row.entryId === selected)
  const scope = clientT('This device')
  const pkg: PackageView = { name: scope, meta: { title: clientT('Local plugins') },
    official: false, installed: false, availability: 'profile', optional: false, removable: false,
    updatable: false, enabled: true, rows: rows as PackageRow[] }
  const change = (row: InspectRow, enabled: boolean) => {
    if (busy || !row.entryId) return
    setBusy(true); setError('')
    void ctx.clientComposition.change(row.entryId, { disabled: !enabled }, ctx.clientComposition.status().revision)
      .catch(error => setError(clientError(ctx, error)))
      .finally(() => setBusy(false))
  }
  const packageFor = (row: InspectRow): PackageView => ({ ...pkg, name: row.moduleName,
    enabled: row.enabled, rows: [row as PackageRow], meta: row.meta,
    ...(row.readOnlyReason ? { readOnlyReason: row.readOnlyReason } : {}),
  })
  const itemFor = (row: InspectRow) => ({ id: row.rowId, label: clientT(localPluginInfo[row.moduleName]?.title ?? row.moduleName) })
  const renderLocal: PluginManagerPageProps['renderSlot'] = (key, owner, options) => {
    if (!row) return null
    if (key === 'plugins.detail.section') return <RuntimeDetails ctx={ctx} facts={facts} modules={[row.moduleName]} local />
    if (key === 'plugins.detail.badge') return <Tag tone="neutral">{clientT('Local')}</Tag>
    if (key === 'plugins.bundle.config' || key === 'plugins.row.config') return renderConfiguration(key, owner, options)
    if (key !== 'plugins.item') return null
    if (owner.view === 'summary') return localPluginInfo[row.moduleName]?.description ? clientT(localPluginInfo[row.moduleName].description) : null
    return null
  }
  const back = () => select(undefined)
  if (row) {
    if (localPluginInfo[row.moduleName]?.group === 'basic') return <><ItemDetail
      item={itemFor(row)} t={t} form={undefined} renderSlot={renderLocal} onBack={back} /></>
    const selectedPackage = packageFor(row)
    if (component) return <><RowDetail pkg={selectedPackage} row={row as PackageRow} t={t}
      resolveText={resolveText} form={undefined} renderSlot={renderLocal} onBack={() => setComponent(false)} /></>
    return <><PackageDetail pkg={selectedPackage} t={t} resolveText={resolveText}
      busy={busy || ctx.clientComposition.status().busy} rowBusy={() => busy} configured={ctx.slots.entries('plugins.bundle.config').some(entry => entry.options.key === row.moduleName)}
      configure={{ has: () => true, open: () => setComponent(true) }} renderSlot={renderLocal}
      inMore={false} versions={undefined} detail={null} onBack={back}
      onSetEnabled={enabled => change(row, enabled)} onSetRowEnabled={(entry, enabled) => change(entry, enabled)}
      onUninstall={() => {}} onUpdate={() => {}} onEnsureVersions={() => {}}
      onCheckVersions={() => {}} onUpdateVersion={() => {}} /></>
  }
  return <div className={css.installedPanel} data-mygo-plugin-source="LOCAL">
    {error && <p role="alert" className={css.reason}>{error}</p>}
    {(['basic', 'extensions', 'bundles'] as const).map(group => {
      const members = rows.filter(row => (localPluginInfo[row.moduleName]?.group ?? 'bundles') === group)
      if (!members.length) return null
      return <section key={group} className={css.group} data-local-plugin-group={group}>
        <div className={css.groupHead}><h3 className={css.groupTitle}>{t(group === 'basic' ? 'basicTitle' : group === 'extensions' ? 'extensionsTitle' : 'bundlesTitle')}</h3></div>
        <ul className={css.cards}>{members.map(row => group === 'basic'
          ? <ItemCard key={row.entryId ?? row.rowId} item={itemFor(row)} t={t}
              renderSlot={(key, owner) => key === 'plugins.item' && owner.view === 'summary'
                ? localPluginInfo[row.moduleName]?.description ? clientT(localPluginInfo[row.moduleName].description) : null : null}
              onOpen={() => select(row.entryId)} />
          : <PackageCard key={row.entryId ?? row.rowId} pkg={packageFor(row)} t={t}
              resolveText={resolveText} busy={busy || ctx.clientComposition.status().busy}
              highlighted={false} newer={undefined} onOpen={() => select(row.entryId)}
              onSetEnabled={enabled => change(row, enabled)} />)}</ul>
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
    yield ctx.slots.register({ name: 'plugins.tab', id: 'mygo-local', label: () => ctx.mygoLocale.text('Local'), order: -20, locale: 'pluginManager',
      children: {
        'plugins.bundle.config': { kind: 'keyed', scope: 'root' },
        'plugins.row.config': { kind: 'keyed', scope: 'root' },
      },
    }, ({ t, renderSlot }) => <LocalPlugins ctx={ctx} t={t} facts={facts} renderConfiguration={renderSlot} />)
  })
}

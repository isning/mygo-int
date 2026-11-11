// Read-only override of the pinned original Plugins surface, in the shared root.
import React, { useEffect, useState } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/cordis-plugin-loader'
import type {} from '@deepseek-ai/dsh-client-modules/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type { MainPanelId } from '@deepseek-ai/dsh-client-ui-layout/client'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import { RowsSection } from '../../../.scratch/upstream/deepseek-harness/packages/client/ui-plugin-manager/src/client/PluginManagerPage.tsx?mygo-rows'
import { en } from '../../../.scratch/upstream/deepseek-harness/packages/client/ui-plugin-manager/src/client/locales.ts'
import css from '../../../.scratch/upstream/deepseek-harness/packages/client/ui-plugin-manager/src/client/PluginManagerPage.module.css'
import type { PackageRow } from '../../../.scratch/upstream/deepseek-harness/packages/client/ui-plugin-manager/src/client/manager-store.ts'

type InspectRow = Omit<PackageRow, 'entryId'> & { readonly entryId?: string }
type LocalRow = Pick<InspectRow, 'entryId' | 'rowId' | 'moduleName' | 'enabled' | 'phase' | 'diagnostic'>
type Instance = { id: string; name: string; authenticationViewId: string }
type Services = {
  clientComposition: { rows(): LocalRow[]; subscribe(fn: () => void): () => void }
  instanceManager: {
    snapshot(): { catalog: Instance[]; connectedId: string; selectedId: string }
    availability(instance: Instance): string
    subscribe(fn: () => void): () => void
  }
  mygoStartup: { ownsEntry(entry: unknown): boolean; configuration: { selectedInstance: { id: string; authenticationViewId: string } } }
}
type SurfaceContext = Context & Services
type Source = 'LOCAL' | 'INSTANCE CLIENT' | 'HOST'
type InventoryRow = { source: Source; instance: string; owner: string; key: string; row: InspectRow }
const phases = ['pending', 'loading', 'active', 'failed', null, 'unloading'] as const
const translate = (key: keyof typeof en, params: Record<string, string> = {}) =>
  Object.entries(params).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, value), en[key] ?? key)
const resolveText = (text: string | Record<string, string> | undefined) => typeof text === 'string' ? text : text?.en ?? ''

function PluginInventory({ ctx }: { ctx: SurfaceContext }) {
  const [, update] = useState(0)
  const [source, setSource] = useState('all'), [instance, setInstance] = useState('all')
  const [hostRows, setHostRows] = useState<InspectRow[]>([])
  const [hostStatus, setHostStatus] = useState('Loading Host inventory…')
  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    const notify = () => update(value => value + 1)
    const local = ctx.clientComposition.subscribe(notify)
    const catalog = ctx.instanceManager.subscribe(notify)
    const status = ctx.on('internal/status', notify)
    // Loader entries and manifest can change even while this page is hidden.
    const timer = setInterval(notify, 1000)
    return () => { local(); catalog(); status(); clearInterval(timer) }
  }, [ctx])
  useEffect(() => {
    let live = true
    setHostStatus('Loading Host inventory…')
    void ctx.remote.pluginInventory.list().then(answer => {
      if (!live) return
      if (!answer.ok) { setHostStatus('Host inventory unavailable: original Remote denied or failed'); return }
      setHostRows(answer.value.entries.map(entry => ({
        entryId: entry.entryId, rowId: entry.entryId, moduleName: entry.moduleName,
        enabled: entry.enabled, phase: entry.fiberPhase,
        ...(entry.meta ? { meta: entry.meta } : {}),
        ...(entry.diagnostic ? { diagnostic: entry.diagnostic } : {}),
      })))
      setHostStatus('Host inventory read through original Remote')
    }).catch(() => { if (live) setHostStatus('Host inventory unavailable: original Remote read failed') })
    return () => { live = false }
  }, [ctx, refresh])
  const catalog = ctx.instanceManager.snapshot()
  const bound = ctx.mygoStartup.configuration.selectedInstance
  const rows: InventoryRow[] = []
  const add = (source: Source, row: InspectRow) => {
    const local = source === 'LOCAL'
    rows.push({ source, instance: local ? 'device' : bound.id,
      owner: local ? 'Device client runtime' : source === 'HOST' ? `Host runtime · ${bound.id} · ${bound.authenticationViewId}` : `Device client runtime · instance ${bound.id} · ${bound.authenticationViewId}`,
      key: JSON.stringify([source, local ? null : bound.id, local ? null : bound.authenticationViewId, row.entryId ?? row.rowId]), row })
  }
  for (const row of ctx.clientComposition.rows()) add('LOCAL', row)
  const supplied = new Set(ctx.modules.manifest.plugins.map(plugin => plugin.id))
  for (const entry of ctx.loader.entries()) {
    if (ctx.mygoStartup.ownsEntry(entry) || !supplied.has(entry.options.name)) continue
    add('INSTANCE CLIENT', {
      entryId: entry.id, rowId: entry.options.id, moduleName: entry.options.name,
      enabled: !entry.disabled, phase: entry.fiber ? phases[entry.fiber.state] ?? null : null,
    })
  }
  for (const row of hostRows) add('HOST', row)
  const shown = rows.filter(row => (source === 'all' || row.source === source) && (instance === 'all' || row.instance === instance))
  return <section className={css.page} data-mygo-unified-plugins="" style={{ overflow: 'auto', fontFamily: 'var(--dsw-font-family, system-ui)' }}>
    <h1 className={css.pageTitle}>Plugins</h1>
    <p>Inspect actual LOCAL, INSTANCE CLIENT and HOST entries. Lifecycle actions are not available on this page yet.</p>
    <p>Connected instance: {catalog.connectedId} · authentication view: {bound.authenticationViewId}</p>
    <label>Source <select aria-label="Plugin source" value={source} onChange={event => setSource(event.target.value)}>
      <option value="all">All sources</option>{(['LOCAL', 'INSTANCE CLIENT', 'HOST'] as const).map(value => <option key={value}>{value}</option>)}
    </select></label>{' '}
    <label>Instance <select aria-label="Plugin instance" value={instance} onChange={event => setInstance(event.target.value)}>
      <option value="all">All instances and device</option><option value="device">Device local</option>
      {catalog.catalog.map(row => <option key={row.id} value={row.id}>{row.name} · {row.id}</option>)}
    </select></label>{' '}
    <Button onClick={() => setRefresh(value => value + 1)}>Refresh inventory</Button>
    <p role="status">{hostStatus}</p>
    {catalog.catalog.filter(row => row.id !== catalog.connectedId).map(row => <p key={row.id}>{row.name}: {ctx.instanceManager.availability(row)}</p>)}
    {catalog.selectedId !== catalog.connectedId && <p>Catalog preference differs from the connected instance; the connection has not switched.</p>}
    <p>{shown.length} entries</p>
    {shown.length === 0 && <p>No entries match these filters.</p>}
    {shown.map(({ source, owner, key, row }) => <article key={key} data-plugin-source={source} data-plugin-key={key} data-module-name={row.moduleName} data-runtime-owner={owner}>
      <p><strong>{source}</strong> · {owner} · Entry <code>{row.entryId ?? row.rowId}</code></p>
      <RowsSection rows={[{ ...row, entryId: key }]} t={translate} resolveText={resolveText} />
    </article>)}
  </section>
}

export function register(ctx: SurfaceContext) {
  ctx.slots.inject('main', () => ctx.slots.register({
    name: 'main', key: 'plugins' as MainPanelId, priority: -100,
  }, () => <PluginInventory ctx={ctx} />))
}

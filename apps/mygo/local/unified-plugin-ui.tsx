// Extend the original Plugins page through its native tab contract. The original
// main registration, page, Host controller, cards and dialogs stay in charge.
import { useClientText, clientError } from './i18n'
import { useEffect, useState } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/cordis-plugin-loader'
import type {} from '@deepseek-ai/dsh-client-modules/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { PluginDetailProps, PluginTabCollection, PluginTabProps, ConfigPageForm } from '@deepseek-ai/dsh-client-ui-plugin-manager/src/client/slot-contract.ts'
import type { PackageRow, PackageView } from '@deepseek-ai/dsh-client-ui-plugin-manager/src/client/manager-store.ts'
import { installPluginSideBadges } from './plugin-side-badges'
import { installRuntimeDetails, RuntimeDetails } from './plugin-runtime-details'
import type { MygoContext } from './types'

type ClientContext = MygoContext & Context & {
  clientComposition: {
    rows(): InspectRow[]
    status(): { revision: number; busy: boolean; diagnostic: string }
    subscribe(listener: () => void): () => void
    change(id: string, patch: { disabled?: boolean }, revision?: number): Promise<void>
    configForm(id: string): ConfigPageForm | undefined
  }
  mygoStartup: {
    admit(): Promise<void>
    ownsEntry(entry: unknown): boolean
    configuration: { selectedInstance: { id: string; authenticationViewId: string } }
  }
}
type InspectRow = Omit<PackageRow, 'entryId'> & { entryId?: string }
const localItemId = (moduleName: string) => `mygo-local:${encodeURIComponent(moduleName)}`

const localPluginInfo: Record<string, { title: string; description: string; group: 'basic' | 'extensions' }> = {
  './plugins/client-composition.js': { title: 'Startup preferences', description: 'Remembers enabled plugins and their options on this device.', group: 'basic' },
  './plugins/instance-manager.js': { title: 'Instance profiles', description: 'Stores your remote connection profiles. Manage them in Settings → Instances.', group: 'basic' },
  './plugins/unified-plugin-manager.js': { title: 'Plugin manager', description: 'Adds this Local tab and plugin runtime details.', group: 'basic' },
  './plugins/local-navigation.js': { title: 'Instance switcher', description: 'Shows the instance selector in the sidebar.', group: 'basic' },
  './plugins/ui-client-manager.js': { title: 'Settings integration', description: 'Adds device preferences and instance profiles to Settings.', group: 'basic' },
  './plugins/touch-feedback.js': { title: 'Touch feedback', description: 'Removes the browser’s tap highlight while preserving keyboard focus indicators.', group: 'extensions' },
}

function LocalPlugins({ ctx, renderCollection }: { ctx: ClientContext; renderCollection: PluginTabProps['renderCollection'] }) {
  const clientT = useClientText(ctx)
  const [, refresh] = useState(0)
  const [view, setView] = useState<{ entryId?: string; component?: boolean }>({})
  const selected = view.entryId
  const component = view.component ?? false
  const select = (entryId?: string) => setView(entryId === undefined ? {} : { entryId })
  const setComponent = (value: boolean) => setView(selected === undefined ? { component: value } : { entryId: selected, component: value })
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
  const rows: InspectRow[] = local.map((row) => { const info = localPluginInfo[row.moduleName]; return ({ ...row,
    meta: { ...row.meta, ...(info ? { title: clientT(info.title), description: clientT(info.description) } : {}) },
    ...(row.readOnlyReason ? { readOnlyReason: 'management-required' as const } : {}),
  }) })
  const pkg: PackageView = { name: clientT('This device'), meta: { title: clientT('Local plugins') },
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
    enabled: row.enabled, rows: [row as PackageRow], ...(row.meta === undefined ? {} : { meta: row.meta }),
    ...(row.readOnlyReason ? { readOnlyReason: row.readOnlyReason } : {}),
  })
  const groups: PluginTabCollection['groups'] = (['basic', 'extensions', 'bundles'] as const).map(group => ({
    id: group,
    title: clientT(group === 'basic' ? 'Built-in plugin settings' : group === 'extensions' ? 'Experimental plugins' : 'Plugins'),
    entries: rows.filter(row => (localPluginInfo[row.moduleName]?.group ?? 'bundles') === group).map((row) => {
      const key = row.entryId ?? row.rowId
      const info = localPluginInfo[row.moduleName]
      const form = row.entryId ? ctx.clientComposition.configForm(row.entryId) : undefined
      return group === 'basic'
        ? { kind: 'item' as const, key, id: localItemId(row.moduleName), label: clientT(info?.title ?? row.moduleName),
          ...(info === undefined ? {} : { summary: clientT(info.description) }) }
        : { kind: 'package' as const, key, pkg: packageFor(row), row: row as PackageRow,
          configured: ctx.slots.entries('plugins.bundle.config').some(entry => entry.options.key === row.moduleName),
          ...(form === undefined ? {} : { form }) }
    }),
  }))
  return renderCollection({ groups, ...(selected === undefined ? {} : { selected }), component,
    busy: busy || ctx.clientComposition.status().busy,
    ...(error ? { error } : {}), resolveText, onSelect: select, onSetComponent: setComponent,
    onSetEnabled: (entry, enabled) => { change(entry as InspectRow, enabled) } })
}

export function register(ctx: ClientContext) {
  const facts = installPluginSideBadges(ctx, entry => ctx.mygoStartup.ownsEntry(entry))
  installRuntimeDetails(ctx, facts)
  ctx.slots.inject('plugins.detail.section', () => ctx.slots.register({ name: 'plugins.detail.section', id: 'mygo-local-runtime' }, ({ subject }: PluginDetailProps) => {
    if (subject.kind !== 'item' || !subject.id.startsWith('mygo-local:')) return null
    return <RuntimeDetails ctx={ctx} facts={facts} modules={[decodeURIComponent(subject.id.slice('mygo-local:'.length))]} local />
  }))
  // The original main entry owns the page and its child-slot declarations.
  // Contributions use those declarations rather than replacing the page or
  // duplicating its controller, navigation state, header, CSS or dialogs.
  ctx.slots.inject('plugins.tab', function* () {
    const LocalTab = (props: unknown) => {
      const { renderCollection } = props as PluginTabProps
      return <LocalPlugins ctx={ctx} renderCollection={renderCollection} />
    }
    yield ctx.slots.register({
      name: 'plugins.tab', id: 'mygo-local', label: () => ctx.mygoLocale.text('Local'), order: -20,
      locale: 'pluginManager', inject: () => ({}),
    }, LocalTab as never)
  })
}

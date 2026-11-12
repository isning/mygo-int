// Read-only runtime information contributed to the original detail Slots.
import { useClientText } from './i18n'
import React, { useEffect, useState, useSyncExternalStore } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/cordis-plugin-loader'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import { pluginManagerStyles as css } from '@deepseek-ai/dsh-client-ui-plugin-manager/client'
import type { PluginDetailProps } from '@deepseek-ai/dsh-client-ui-plugin-manager/client'
import { builtinModules, type PluginRuntimeFacts } from './plugin-side-badges'

type RuntimeContext = Context & {
  mygoStartup: { ownsEntry(entry: unknown): boolean; configuration: { selectedInstance: { id: string; authenticationViewId: string } } }
}
const phases = ['pending', 'loading', 'active', 'failed', 'disposed', 'unloading'] as const
const normalize = (name: string) => name.replace(/\/client$/, '')
const rowConfigKey = (bundle: string, rowId: string) => `${bundle}#${rowId}`

export function RuntimeDetails({ ctx, facts, modules, local = false }: {
  ctx: RuntimeContext
  facts: PluginRuntimeFacts
  modules: readonly string[]
  local?: boolean
}) {
  const t = useClientText(ctx)
  const snapshot = useSyncExternalStore(facts.subscribe, facts.getSnapshot)
  const [, refresh] = useState(0)
  const [failures, setFailures] = useState<Record<string, string>>({})
  useEffect(() => {
    let live = true, revision = 0
    const update = () => {
      const current = ++revision
      refresh(value => value + 1)
      const failed = [...ctx.loader.entries()].filter(entry => entry.fiber?.state === 3)
      void Promise.all(failed.map(async (entry) => {
        try { await entry.fiber!.await(); return [entry.id, ''] }
        catch (error) { return [entry.id, String(error)] }
      })).then((values) => { if (live && current === revision) setFailures(Object.fromEntries(values)) })
    }
    const status = ctx.on('internal/status', update)
    const manifest = ctx.modules.entries.state.subscribe(update)
    update()
    return () => { live = false; revision++; status(); manifest() }
  }, [ctx])
  const names = new Set(modules.map(normalize))
  const remote = local ? [] : snapshot.plugins.filter(entry => names.has(normalize(entry.moduleName)))
  const client = [...ctx.loader.entries()].filter(entry => names.has(normalize(entry.options.name))
    && ctx.mygoStartup.ownsEntry(entry) === local)
  const factsRow = (label: string, value: React.ReactNode) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
  return <section className={css.detailSection} data-mygo-runtime-details="">
    <h4 className={css.sectionTitle}>{t('Runtime details')}</h4>
    <dl className={css.facts}>
      {factsRow(local ? t('Location') : t('Instance'), local ? t('This device') : ctx.mygoStartup.configuration.selectedInstance.id)}
      {!local && factsRow(t('Authentication view'), ctx.mygoStartup.configuration.selectedInstance.authenticationViewId)}
      {factsRow(t('Module'), modules.map(name => <code key={name}>{name}</code>))}
    </dl>
    {!local && <>
      <h4 className={css.sectionTitle}>{t('Remote')}</h4>
      {remote.length === 0 && <p className={css.status}>{t('No matching remote Entry is available.')}</p>}
      {remote.map(entry => <React.Fragment key={entry.entryId}>
        <dl className={css.facts}>
          {factsRow(t('Entry'), <code>{entry.entryId}</code>)}
          {factsRow(t('Enabled'), entry.enabled ? t('Yes') : t('No'))}
          {factsRow(t('Runtime state'), entry.fiberPhase ? t(entry.fiberPhase) : t('No fiber'))}
        </dl>
        {entry.diagnostic && <pre className={css.rowFailure}>{entry.diagnostic}</pre>}
      </React.Fragment>)}
    </>}
    <h4 className={css.sectionTitle}>{t('Client')}</h4>
    {client.length === 0 && <p className={css.status}>{t('No matching client Entry is loaded.')}</p>}
    {client.map(entry => <React.Fragment key={entry.id}>
      <dl className={css.facts}>
        {factsRow(t('Entry'), <code>{entry.id}</code>)}
        {factsRow(t('Enabled'), entry.disabled ? t('No') : t('Yes'))}
        {factsRow(t('Runtime state'), entry.fiber ? t(phases[entry.fiber.state]) : t('No fiber'))}
        {factsRow(t('Dependencies'), Object.keys(entry.fiber?.inject ?? {}).join(', ') || t('None'))}
      </dl>
      {(failures[entry.id] || ctx.modules.importError(entry.options.name)) && <pre className={css.rowFailure}>
        {failures[entry.id] || String(ctx.modules.importError(entry.options.name))}
      </pre>}
    </React.Fragment>)}
  </section>
}

export function installRuntimeDetails(ctx: RuntimeContext, facts: PluginRuntimeFacts) {
  ctx.slots.inject('plugins.row.config', () => {
    const registrations = new Map<string, () => void>()
    const update = () => {
      const keys = new Set(facts.getSnapshot().bundles.flatMap(bundle => bundle.rows.map(row => rowConfigKey(bundle.name, row.rowId))))
      for (const [key, dispose] of registrations) if (!keys.has(key)) { dispose(); registrations.delete(key) }
      for (const key of keys) {
        if (registrations.has(key) || ctx.slots.entries('plugins.row.config').some(entry => entry.options.key === key && (entry.options.priority ?? 0) >= 100)) continue
        // A low-priority read-only page makes Components navigable. Existing
        // real configuration contributions keep priority and render unchanged.
        registrations.set(key, ctx.slots.register({ name: 'plugins.row.config', key, priority: 100 }, () => null))
      }
    }
    const off = facts.subscribe(update)
    update()
    return () => { off(); for (const dispose of registrations.values()) dispose(); registrations.clear() }
  })
  ctx.slots.inject('plugins.detail.section', () => ctx.slots.register({ name: 'plugins.detail.section', id: 'mygo-runtime-details' }, ({ subject }: PluginDetailProps) => {
    const modules = subject.kind === 'row' ? [subject.row.moduleName] : subject.kind === 'item' ? builtinModules[subject.id] : undefined
    return modules ? <RuntimeDetails ctx={ctx} facts={facts} modules={modules} /> : null
  }))
}

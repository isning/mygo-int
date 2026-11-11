// Read-only runtime information contributed to the original detail Slots.
import React, { useEffect, useState, useSyncExternalStore } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/cordis-plugin-loader'
import type { PluginDetailProps } from '../../../.scratch/upstream/deepseek-harness/packages/client/ui-plugin-manager/src/client/slot-contract.ts'
import { rowConfigKey } from '../../../.scratch/upstream/deepseek-harness/packages/client/ui-plugin-manager/src/client/config-ledger.ts'
import css from '../../../.scratch/upstream/deepseek-harness/packages/client/ui-plugin-manager/src/client/PluginManagerPage.module.css'
import { builtinModules, type PluginRuntimeFacts } from './plugin-side-badges'

type RuntimeContext = Context & {
  mygoStartup: { ownsEntry(entry: unknown): boolean; configuration: { selectedInstance: { id: string; authenticationViewId: string } } }
}
const phases = ['pending', 'loading', 'active', 'failed', 'disposed', 'unloading'] as const
const normalize = (name: string) => name.replace(/\/client$/, '')

export function RuntimeDetails({ ctx, facts, modules, local = false }: {
  ctx: RuntimeContext; facts: PluginRuntimeFacts; modules: readonly string[]; local?: boolean
}) {
  const snapshot = useSyncExternalStore(facts.subscribe, facts.getSnapshot)
  const [, refresh] = useState(0)
  const [failures, setFailures] = useState<Record<string, string>>({})
  useEffect(() => {
    let live = true, revision = 0
    const update = () => {
      const current = ++revision
      refresh(value => value + 1)
      const failed = [...ctx.loader.entries()].filter(entry => entry.fiber?.state === 3)
      void Promise.all(failed.map(async entry => {
        try { await entry.fiber!.await(); return [entry.id, ''] }
        catch (error) { return [entry.id, String(error)] }
      })).then(values => { if (live && current === revision) setFailures(Object.fromEntries(values)) })
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
    <h4 className={css.sectionTitle}>Runtime details</h4>
    <dl className={css.facts}>
      {factsRow('Instance', local ? 'This device' : ctx.mygoStartup.configuration.selectedInstance.id)}
      {!local && factsRow('Authentication view', ctx.mygoStartup.configuration.selectedInstance.authenticationViewId)}
      {factsRow('Module', modules.map(name => <code key={name}>{name}</code>))}
    </dl>
    {!local && <>
      <h4 className={css.sectionTitle}>Remote</h4>
      {remote.length === 0 && <p className={css.status}>No matching remote Entry is available.</p>}
      {remote.map(entry => <React.Fragment key={entry.entryId}>
        <dl className={css.facts}>
          {factsRow('Entry', <code>{entry.entryId}</code>)}
          {factsRow('Enabled', entry.enabled ? 'Yes' : 'No')}
          {factsRow('Runtime state', entry.fiberPhase ?? 'No fiber')}
        </dl>
        {entry.diagnostic && <pre className={css.rowFailure}>{entry.diagnostic}</pre>}
      </React.Fragment>)}
    </>}
    <h4 className={css.sectionTitle}>Client</h4>
    {client.length === 0 && <p className={css.status}>No matching client Entry is loaded.</p>}
    {client.map(entry => <React.Fragment key={entry.id}>
      <dl className={css.facts}>
        {factsRow('Entry', <code>{entry.id}</code>)}
        {factsRow('Enabled', entry.disabled ? 'No' : 'Yes')}
        {factsRow('Runtime state', entry.fiber ? phases[entry.fiber.state] : 'No fiber')}
        {factsRow('Dependencies', Object.keys(entry.fiber?.inject ?? {}).join(', ') || 'None')}
      </dl>
      {(failures[entry.id] || ctx.modules.importError(entry.options.name)) && <pre className={css.rowFailure}>{failures[entry.id] || String(ctx.modules.importError(entry.options.name))}</pre>}
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

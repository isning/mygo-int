// Instance-supplied client actions in the original Plugins article and React tree.
import React, { useEffect, useRef, useState } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/cordis-plugin-loader'
import type {} from '@deepseek-ai/dsh-client-modules/client'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PackageRow } from '../../../.scratch/upstream/deepseek-harness/packages/client/ui-plugin-manager/src/client/manager-store.ts'

export type InstanceInspectRow = Omit<PackageRow, 'entryId'> & { readonly entryId?: string }
type InstanceContext = Context & {
  mygoStartup: {
    ownsEntry(entry: unknown): boolean
    admit(): Promise<void>
    configuration: { selectedInstance: { id: string; authenticationViewId: string } }
  }
}
export type InstanceClientActionsProps = {
  ctx: InstanceContext
  row: InstanceInspectRow
  onChanged(): void
}

const diagnosticStyle = { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } as const

export function InstanceClientActions({ ctx, row, onChanged }: InstanceClientActionsProps) {
  const entries = ctx.modules.entries
  const [, render] = useState(0)
  const [diagnostic, setDiagnostic] = useState('')
  const [outcome, setOutcome] = useState('')
  const [busy, setBusy] = useState(false)
  const lifetime = useRef({ live: false, running: false })
  const ownedEntry = () => {
    const entry = [...ctx.loader.entries()].find(entry => entry.id === row.entryId)
    return entry && entry.options.name === row.moduleName
      && !ctx.mygoStartup.ownsEntry(entry)
      && ctx.modules.manifest.plugins.some(plugin => plugin.id === row.moduleName) ? entry : undefined
  }
  const entry = ownedEntry()
  const snapshot = entries.state.getSnapshot()
  const failures = snapshot.failures.filter(failure => failure.id === row.moduleName || failure.id === 'graph')
  const inactive = entry !== undefined && entry.fiber?.state !== 2
  const importError = entry && !entry.fiber ? ctx.modules.importError(row.moduleName) : undefined
  const originalDiagnostic = !entry || entry.fiber?.state === 2 ? '' : !entry.fiber
    ? importError ? `import failed: ${importError.message}` : 'import failed (see console for the original import error)'
    : diagnostic
  const bound = ctx.mygoStartup.configuration.selectedInstance

  useEffect(() => {
    const life = { live: true, running: false }
    lifetime.current = life
    let revision = 0
    const observe = () => {
      if (!life.live) return
      const current = ++revision
      render(value => value + 1)
      const entry = ownedEntry()
      setDiagnostic('')
      if (!entry) return
      if (!entry.fiber) {
        const error = ctx.modules.importError(row.moduleName)
        setDiagnostic(error ? `import failed: ${error.message}` : 'import failed (see console for the original import error)')
      } else if (entry.fiber.state === 3) {
        void entry.fiber.await().then(() => {
          if (life.live && current === revision) setDiagnostic('Original failed activation settled; refresh inventory for current state.')
        }, error => {
          if (life.live && current === revision) setDiagnostic(String(error))
        })
      } else if (entry.fiber.state === 0) {
        const missing = Object.keys(entry.fiber.inject).filter(service => ctx.get(service) === undefined)
        setDiagnostic(`pending (waiting for services: ${missing.join(', ') || 'unknown'})`)
      }
    }
    const unsubscribe = entries.state.subscribe(observe)
    const offStatus = ctx.on('internal/status', observe)
    observe()
    return () => { life.live = false; revision++; unsubscribe(); offStatus() }
  }, [ctx, entries, row.entryId, row.moduleName])

  async function retry() {
    const life = lifetime.current
    if (!life.live || life.running || entries.state.getSnapshot().syncing) return
    const target = ownedEntry()
    if (!target || target.fiber?.state === 2) return
    life.running = true
    setBusy(true)
    setOutcome('Retrying the current instance client roster…')
    try {
      await ctx.mygoStartup.admit()
      if (!life.live) return
      if (ownedEntry() !== target) throw Error('Instance client ownership changed; refresh inventory before retrying.')
      // The original public API is roster-wide, with its own queue and ownership.
      await entries.retry()
      if (!life.live) return
      const remaining = entries.state.getSnapshot().failures.length
      const active = ownedEntry()?.fiber?.state === 2
      setOutcome(`Retry completed: ${remaining} remaining failure(s) in the current instance roster. This entry is ${active ? 'ACTIVE' : 'not ACTIVE'}.`)
      onChanged()
    } catch (error) {
      if (life.live) setOutcome(`Retry rejected: ${String(error)}`)
    } finally {
      life.running = false
      if (life.live) setBusy(false)
    }
  }

  return <div data-instance-client-actions="">
    <p>Manifest owner: instance {bound.id} · authentication view {bound.authenticationViewId} · execution: device client.</p>
    <p>Original Entry <code>{row.entryId ?? '(absent)'}</code> · manifest module <code>{row.moduleName}</code></p>
    {!entry && <p role="alert">This row no longer identifies a manifest-owned client Entry. Refresh inventory.</p>}
    {row.diagnostic && <pre style={diagnosticStyle}>{row.diagnostic}</pre>}
    {originalDiagnostic && <pre style={diagnosticStyle} data-instance-diagnostic="">{originalDiagnostic}</pre>}
    {failures.map(failure => <pre style={diagnosticStyle} key={failure.id}>Original reconciliation · {failure.id}: {failure.message}</pre>)}
    <Button data-instance-retry="" disabled={!entry || !inactive || busy || snapshot.syncing} onClick={() => void retry()}>
      {busy ? 'Retrying current instance client roster…' : 'Retry current instance client roster'}
    </Button>
    <p>Retries the original managed roster for this instance, including other failed client entries. It may retouch other managed entries; it does not change Host bundle enablement.</p>
    <Button disabled>Install independently unavailable</Button>{' '}
    <Button disabled>Upgrade independently unavailable</Button>{' '}
    <Button disabled>Host enable unavailable here</Button>
    <p>Client delivery follows the instance manifest. Independent installation and upgrade are unsupported. Explicit Host actions belong to HOST rows.</p>
    <p>The original queued retry has no cancellation API; navigating away stops observation but may leave reconciliation running.</p>
    <p role="status">{outcome || (snapshot.syncing ? 'Original instance client reconciliation is running.' : 'No retry requested from this row.')}</p>
  </div>
}

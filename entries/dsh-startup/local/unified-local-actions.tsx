// Local actions over the original Context's device-overlay/lifecycle adapter.
import React, { useEffect, useRef, useState } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import { Button, SettingsForm } from '@deepseek-ai/dsh-client-ui-primitives'

type InspectRow = { readonly entryId?: string; readonly rowId: string; readonly moduleName: string }
type LocalRow = InspectRow & {
  enabled: boolean; phase: string | null; config: Record<string, unknown>
  readOnlyReason?: string; diagnostic?: string
  desired: { disabled?: boolean; config?: Record<string, unknown> }
}
export type LocalCompositionService = {
  rows(): LocalRow[]
  status(): { revision: number; busy: boolean; diagnostic: string }
  subscribe(listener: () => void): () => void
  change(id: string, patch: { config?: Record<string, unknown>; disabled?: boolean }, revision?: number): Promise<void>
}
type Props = { ctx: Context & { clientComposition: LocalCompositionService }; row: InspectRow; onChanged: () => void }
const labels = { unavailable: 'Local entry unavailable', readOnly: 'Protected startup service', saveFailed: 'Local configuration was rejected', save: 'Save and apply locally', saving: 'Applying…' }

export function LocalPluginActions({ ctx, row, onChanged }: Props) {
  const service = ctx.clientComposition
  const [, refresh] = useState(0)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const alive = useRef(false)
  useEffect(() => {
    alive.current = true
    const dispose = service.subscribe(() => refresh(value => value + 1))
    return () => { alive.current = false; dispose() }
  }, [service])
  // Resolve concrete local ownership again; never use the presentation-qualified key.
  const current = service.rows().find(value => value.entryId === row.entryId && value.rowId === row.rowId && value.moduleName === row.moduleName)
  const status = service.status()
  async function run(patch: Parameters<LocalCompositionService['change']>[1], revision = status.revision) {
    if (!current?.entryId || current.readOnlyReason) return
    setError('')
    try {
      await service.change(current.entryId, patch, revision)
      if (alive.current) onChanged()
    } catch (failure) {
      if (alive.current) setError(failure instanceof Error ? failure.message : String(failure))
    }
  }
  return <div data-local-plugin-actions="">
    <p>LOCAL · device only · runtime: {current?.phase ?? 'no fiber'} · desired: {current?.desired.disabled ? 'disabled' : 'enabled'}</p>
    {status.diagnostic && <p role="alert">{status.diagnostic}</p>}
    {current?.diagnostic && <p role="alert">{current.diagnostic}</p>}
    {error && error !== status.diagnostic && <p role="alert">{error}</p>}
    {!current?.entryId ? <p>Local entry unavailable. Refresh inventory.</p> : current.readOnlyReason ?
      <p>Protected startup service. Replace through the operator startup composition.</p> : <>
        <Button disabled={status.busy} aria-label={current.enabled ? 'Disable local plugin' : 'Enable local plugin'} onClick={() => void run({ disabled: current.enabled })}>{current.enabled ? 'Disable locally' : 'Enable locally'}</Button>{' '}
        <Button aria-label="Configure local plugin" onClick={() => setOpen(value => !value)}>{open ? 'Close local configuration' : 'Configure locally'}</Button>
        {open && <LocalConfig key={current.entryId + ':' + status.revision} row={current} status={status} run={run} />}
      </>}
  </div>
}

function LocalConfig({ row, status, run }: { row: LocalRow; status: ReturnType<LocalCompositionService['status']>; run(patch: { config: Record<string, unknown> }, revision: number): Promise<void> }) {
  const [draft, setDraft] = useState(() => JSON.stringify(row.config, null, 2))
  const [revision] = useState(status.revision)
  let value: Record<string, unknown> = {}, invalid = false
  try { value = JSON.parse(draft); invalid = !value || Array.isArray(value) || typeof value !== 'object' } catch { invalid = true }
  return <SettingsForm labels={labels} state={{ available: true, writable: true, dirty: draft !== JSON.stringify(row.config, null, 2), invalid, saving: status.busy, failed: false }} onSave={() => void run({ config: value }, revision)} onDiscard={() => {}}>
    <label>Local plugin configuration<textarea aria-label="Local plugin configuration" rows={7} style={{ width: '100%', fontFamily: 'monospace' }} value={draft} onChange={event => setDraft(event.target.value)} /></label>
    {invalid && <p role="alert">Enter a JSON object.</p>}
    {JSON.stringify(row.desired.config ?? {}) !== JSON.stringify(row.config) && <p>Saved desired configuration differs from runtime.</p>}
  </SettingsForm>
}

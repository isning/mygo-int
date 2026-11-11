// Local actions over the original Context's device-overlay/lifecycle adapter.
import React, { useEffect, useRef, useState } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import { SettingsForm, SettingsValueField } from '@deepseek-ai/dsh-client-ui-primitives'

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
export const hasLocalPluginConfiguration = (row: InspectRow) => row.moduleName === './plugins/marker.js'

type Props = { ctx: Context & { clientComposition: LocalCompositionService }; row: InspectRow; onChanged: () => void }
const labels = { unavailable: 'Local entry unavailable', readOnly: 'Read only', saveFailed: 'Local configuration was rejected', save: 'Save', saving: 'Saving…' }

export function LocalPluginActions({ ctx, row, onChanged }: Props) {
  const service = ctx.clientComposition
  const [, refresh] = useState(0)
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
    {status.diagnostic && <p role="alert">{status.diagnostic}</p>}
    {current?.diagnostic && <p role="alert">{current.diagnostic}</p>}
    {error && error !== status.diagnostic && <p role="alert">{error}</p>}
    {!current?.entryId ? <p>Local entry unavailable. Refresh inventory.</p> : current.readOnlyReason || !hasLocalPluginConfiguration(current) ?
      null : <LocalConfig key={current.entryId + ':' + status.revision} row={current} status={status} run={run} />}
  </div>
}

function LocalConfig({ row, status, run }: { row: LocalRow; status: ReturnType<LocalCompositionService['status']>; run(patch: { config: Record<string, unknown> }, revision: number): Promise<void> }) {
  const [text, setText] = useState(() => typeof row.config.label === 'string' ? row.config.label : '')
  const [revision] = useState(status.revision)
  const invalid = !text.trim() || text.length > 160
  return <SettingsForm labels={labels}
    state={{ available: true, writable: true, dirty: text !== row.config.label, invalid, saving: status.busy, failed: false }}
    onSave={() => void run({ config: { ...row.config, label: text } }, revision)} onDiscard={() => {}}>
    <SettingsValueField id="local-note-text" label="Text" text={text}
      disabled={status.busy} overridden={false} invalid={invalid} overriddenLabel="Modified"
      resetLabel="Reset" invalidLabel="Enter 1–160 characters."
      onEdit={setText} onReset={() => setText(typeof row.config.label === 'string' ? row.config.label : '')} />
  </SettingsForm>
}

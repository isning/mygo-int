// Host-only controls for an original inventory row. The parent owns source routing.
import React, { useEffect, useRef, useState } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type { PluginInfo } from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-plugin-manager/types'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'

export type HostActionRow = {
  readonly entryId?: string
  readonly rowId: string
  readonly moduleName: string
}
type Snapshot = { rows: readonly PluginInfo[]; error?: string; loading: boolean }
const message = (error: unknown): string => {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object') {
    const value = error as { code?: unknown; message?: unknown }
    return [value.code, value.message].filter(value => value !== undefined).map(String).join(': ') || String(error)
  }
  return String(error)
}
const remoteError = (error: { code?: unknown; message?: unknown }) =>
  [error.code, error.message].filter(value => value !== undefined).map(String).join(': ')

// One original Host read/event subscription per Context while rows are mounted.
// Never enumerates or mutates the client's local Loader.
class HostRows {
  snapshot: Snapshot = { rows: [], loading: true }
  private listeners = new Set<() => void>()
  private cleanup: (() => void)[] = []
  private generation = 0
  constructor(private ctx: Context) {}
  subscribe(listener: () => void) {
    this.listeners.add(listener)
    if (this.listeners.size === 1) {
      this.cleanup = [
        this.ctx.remote.$on('plugin-manager/changed', () => { void this.refresh() }),
        this.ctx.on('connection/reset', () => { void this.refresh() }),
      ]
      void this.refresh()
    }
    return () => {
      this.listeners.delete(listener)
      if (this.listeners.size) return
      this.generation++
      for (const stop of this.cleanup) stop()
      this.cleanup = []
    }
  }
  private publish(snapshot: Snapshot) {
    this.snapshot = snapshot
    for (const listener of this.listeners) listener()
  }
  async refresh() {
    const generation = ++this.generation
    try {
      const answer = await this.ctx.remote.pluginManager.listPlugins()
      if (generation !== this.generation) return
      this.publish(answer.ok ? { rows: answer.value, loading: false }
        : { rows: [], loading: false, error: remoteError(answer.error) })
    } catch (error) {
      if (generation === this.generation) this.publish({ rows: [], loading: false, error: message(error) })
    }
  }
}
const stores = new WeakMap<Context, HostRows>()
function hostRows(ctx: Context) {
  let store = stores.get(ctx)
  if (!store) { store = new HostRows(ctx); stores.set(ctx, store) }
  return store
}

export function HostPluginActions({ ctx, row, onChanged }: {
  ctx: Context
  row: HostActionRow
  onChanged: () => void
}) {
  const store = hostRows(ctx)
  const [snapshot, setSnapshot] = useState(store.snapshot)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ error: boolean; text: string }>()
  const generation = useRef(0)
  const pending = useRef(false)
  useEffect(() => {
    generation.current++
    setBusy(false); pending.current = false; setNotice(undefined)
    const stop = store.subscribe(() => setSnapshot(store.snapshot))
    setSnapshot(store.snapshot)
    return () => { generation.current++; stop() }
  }, [store, row.entryId, row.moduleName])
  const matches = snapshot.rows.filter(item => item.entryId === row.entryId && item.moduleName === row.moduleName)
  const current = matches.length === 1 ? matches[0] : undefined
  const reason = snapshot.error ?? (snapshot.loading ? 'Loading original Host controls…'
    : !row.entryId ? 'No concrete Host Entry id'
    : !current ? 'Entry is not uniquely addressable by the original Host controller'
    : current.readOnlyReason)
  async function toggle() {
    if (pending.current || reason || !current) return
    const epoch = generation.current
    const live = () => epoch === generation.current
    pending.current = true
    setBusy(true); setNotice(undefined)
    try {
      // Re-resolve immediately before writing. Never guess a patch id or a bundle.
      const answer = await ctx.remote.pluginManager.listPlugins()
      if (!live()) return
      if (!answer.ok) throw Error(remoteError(answer.error))
      const candidates = answer.value.filter(item => item.entryId === row.entryId && item.moduleName === row.moduleName)
      const target = candidates.length === 1 ? candidates[0] : undefined
      if (!target) throw Error('Host Entry is no longer uniquely addressable; refresh inventory')
      if (target.readOnlyReason) throw Error(target.readOnlyReason)
      const enabled = !target.enabled
      const result = await ctx.remote.pluginManager.setPluginEnabled(target.entryId, enabled)
      if (!live()) return
      if (!result.ok) throw Error(remoteError(result.error))
      const value = result.value
      const text = [
        `Host ${enabled ? 'enable' : 'disable'}: ${value.application}`,
        value.error?.code, value.error?.diagnostic, value.restartReason,
        ...(value.warnings ?? []),
      ].filter(Boolean).join(' · ')
      setNotice({ error: value.application === 'failed', text })
    } catch (error) {
      if (live()) setNotice({ error: true, text: `Host action refused or failed: ${message(error)}` })
    } finally {
      if (live()) {
        pending.current = false
        await store.refresh()
        if (live()) { setBusy(false); onChanged() }
      }
    }
  }
  return <div data-mygo-host-actions="">
    <p>Host operation · changes the connected Host profile</p>
    {reason ? <p role={snapshot.error ? 'alert' : 'status'}>Host read-only: {reason}</p>
      : <Button disabled={busy} aria-busy={busy} onClick={() => { void toggle() }}>
        {current?.enabled ? 'Disable on Host' : 'Enable on Host'}
      </Button>}
    {notice && <p role={notice.error ? 'alert' : 'status'}>{notice.text}</p>}
  </div>
}

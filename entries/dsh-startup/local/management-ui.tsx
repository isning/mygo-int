// Original DSH UI components are imported from the verified pin by the build adapter.
// The injected face below is local only; no Host PluginManagerController/ConfigForms.
import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Button, ConnectionIndicator, SettingsForm, SettingsValueField } from '@deepseek-ai/dsh-client-ui-primitives'
import { SlotCore } from '@deepseek-ai/dsh-client-ui-slots'
import { RowsSection } from '../../../.scratch/upstream/deepseek-harness/packages/client/ui-plugin-manager/src/client/PluginManagerPage.tsx?mygo-rows'
import { SettingsPanel } from '../../../.scratch/upstream/deepseek-harness/packages/client/ui-settings-general/src/client/SettingsRoot.tsx?mygo-panel'
import { en } from '../../../.scratch/upstream/deepseek-harness/packages/client/ui-plugin-manager/src/client/locales.ts'

const translate = (key, params = {}) => Object.entries(params).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, String(value)), key === undefined ? 'Protected local startup service' : en[key] ?? key)
const labels = { unavailable: 'Local entry unavailable', readOnly: 'Protected startup service', saveFailed: 'Local configuration was rejected', save: 'Save and apply locally', saving: 'Applying…' }
class LocalUIBoundary extends React.Component {
  state = { error: '' }
  static getDerivedStateFromError(error) { return { error: error.message } }
  render() { return this.state.error ? <div role="alert">Local settings failed: {this.state.error}. Reload to recover.</div> : this.props.children }
}

function useRefresh(service) {
  const [, update] = useState(0)
  useEffect(() => service.subscribe(() => update(value => value + 1)), [service])
}

function ConfigEditor({ service, row, run }) {
  const [draft, setDraft] = useState(() => JSON.stringify(row.config, null, 2))
  const [revision] = useState(() => service.status().revision)
  let value, invalid = false
  try { value = JSON.parse(draft); invalid = !value || Array.isArray(value) || typeof value !== 'object' } catch { invalid = true }
  return <div>
    <h3>{row.rowId}</h3>
    <p>Local Loader entry: <code>{row.entryId}</code> · parent: {row.parentId ?? 'local root'}</p>
    <p>Runtime: {row.phase ?? 'no fiber'} · desired startup: {row.desired.disabled ? 'disabled' : 'enabled'}</p>
    <p>Required services: {row.dependencies.join(', ') || 'none'}</p>
    {JSON.stringify(row.desired.config ?? {}) !== JSON.stringify(row.config) && <details><summary>Saved desired configuration differs from runtime</summary><pre>{JSON.stringify(row.desired.config ?? {}, null, 2)}</pre></details>}
    {row.readOnlyReason ? <p>Protected service. Replace through the operator startup composition.</p> :
      <SettingsForm labels={labels} state={{ available: true, writable: true, dirty: draft !== JSON.stringify(row.config, null, 2), invalid, saving: service.status().busy, failed: false }}
        onSave={() => run(() => service.change(row.entryId, { config: value }, revision))} onDiscard={() => {}}>
        <label>Local plugin configuration
          <textarea aria-label="Local plugin configuration" rows={9} style={{ width: '100%', fontFamily: 'monospace' }} value={draft} onChange={event => setDraft(event.target.value)} />
        </label>
        {invalid && <p role="alert">Enter a JSON object.</p>}
      </SettingsForm>}
  </div>
}

function LocalPlugins({ ctx, run }) {
  const service = ctx.clientComposition
  useRefresh(service)
  const [selected, select] = useState(null)
  const rows = service.rows(), status = service.status()
  const row = rows.find(row => row.entryId === selected)
  return <div>
    <p>LOCAL composition · actual Cordis Loader tree. Changes apply here and persist on this browser device, scoped to this origin and authentication view.</p>
    <p>Saved revision {status.revision}. Runtime phases below come from fibers; desired startup is separate.</p>
    {status.diagnostic && <p role="alert">{status.diagnostic}</p>}
    <RowsSection rows={rows} t={translate} resolveText={text => typeof text === 'string' ? text : text?.en ?? ''}
      toggle={{ busy: () => status.busy, onSetEnabled: (row, enabled) => run(() => service.change(row.entryId, { disabled: !enabled })) }}
      configure={{ has: () => true, open: row => select(row.entryId) }} />
    {row && <ConfigEditor key={row.entryId + ':' + status.revision} row={row} service={service} run={run} />}
    <p>Startup overlay changes only config/enablement of curated operator entries. It cannot install modules or change paths.</p>
    <Button onClick={() => run(() => service.reload())}>Reload saved composition</Button>{' '}
    <Button onClick={() => run(() => service.reset())}>Reset this device to operator startup</Button>
  </div>
}

function Instances({ ctx, run }) {
  const service = ctx.instanceManager
  useRefresh(service)
  const snapshot = service.snapshot()
  const empty = { id: '', name: '', address: '', authenticationViewId: 'owner' }
  const [draft, setDraft] = useState(empty), [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const selected = snapshot.catalog.find(row => row.id === snapshot.selectedId)
  return <div>
    <h2>Instance connections</h2>
    <ConnectionIndicator state={snapshot.connectionStatus === 'checking' ? 'connecting' : snapshot.connectionStatus === 'unavailable' ? 'disconnected' : undefined}
      disconnectedLabel="Bound carrier unavailable or browser admission expired" connectingLabel="Checking original DSH admission" recoveredLabel="DSH admission accepted"
      reconnectActionLabel="Check again" restartActionLabel="Reload" onReconnect={service.refresh} />
    <Button onClick={() => run(service.refresh)}>Refresh connection status</Button>
    <p>Catalog selection: <strong>{selected?.name}</strong>. Connected DSH outlet: <strong>{snapshot.connectedId}</strong>.</p>
    {snapshot.selectedId !== snapshot.connectedId && <p role="status">Selected target is unavailable. The existing DSH outlet remains bound to {snapshot.connectedId}; no connection was switched.</p>}
    <p>One operator-configured carrier and owner browser session. External addresses are saved metadata; this client does not probe or connect to them.</p>
    {snapshot.diagnostic && <p role="alert">{snapshot.diagnostic}</p>}
    <ul>{snapshot.catalog.map(row => <li key={row.id} data-instance-id={row.id}>
      <h3>{row.name}</h3><p><code>{row.id}</code> · {row.address} · authentication view: {row.authenticationViewId}</p>
      <p>{service.availability(row)}</p>
      <Button onClick={() => { setDraft({ ...row }); setEditingId(row.id) }}>Edit {row.name}</Button>{' '}
      <Button disabled={row.id === snapshot.selectedId} onClick={() => run(() => service.select(row.id))}>Select {row.name}</Button>
    </li>)}</ul>
    <h3>{editingId ? 'Edit connection profile' : 'Add instance profile'}</h3>
    <SettingsForm labels={{ ...labels, save: 'Save connection profile' }} state={{ available: true, writable: true, dirty: true, invalid: false, saving, failed: false }}
      onSave={() => run(async () => { setSaving(true); try { await service.save(draft, editingId); setDraft(empty); setEditingId(null) } finally { setSaving(false) } })} onDiscard={() => {}}>
      {['id', 'name', 'address', 'authenticationViewId'].map(key => <SettingsValueField key={key} id={`mygo-instance-${key}`} label={`Instance ${key}`}
        text={draft[key]} disabled={key === 'id' && !!editingId} overridden={false} invalid={false}
        overriddenLabel="Device override" resetLabel="Reset draft" invalidLabel="Invalid value"
        onEdit={text => setDraft({ ...draft, [key]: text })} onReset={() => setDraft({ ...draft, [key]: empty[key] })} />)}
      <p>Do not enter credentials. Launch tokens and cookies remain in original DSH authentication; this catalog stores none.</p>
    </SettingsForm>
    <Button onClick={() => { setEditingId(null); setDraft(empty) }}>New profile</Button>
  </div>
}

export function mount(ctx) {
  ctx.effect(() => {
    const node = document.createElement('div')
    node.dataset.localManagement = ''
    document.body.append(node)
    // Same public SlotCore class as the original client, owned by this local plugin.
    const slots = new SlotCore()
    const rootOff = slots.register({ name: 'root', children: { 'mygo.management.section': { kind: 'list', scope: 'root' } } }, () => null)
    const offLocal = slots.register({ name: 'mygo.management.section', id: 'local', label: 'LOCAL plugins' }, LocalPlugins)
    const offInstances = slots.register({ name: 'mygo.management.section', id: 'instances', label: 'Instances' }, Instances)
    function Manager() {
      const [open, setOpen] = useState(false), [active, setActive] = useState('local'), [error, setError] = useState('')
      const run = async operation => { setError(''); try { await operation() } catch (error) { setError(error.message) } }
      const entries = slots.entries('mygo.management.section')
      const render = (name, props, options) => {
        if (name === 'settings.header') return 'Local client settings'
        if (name === 'settings.close') return 'Close local settings'
        if (name === 'settings.section') {
          const entry = entries.find(entry => entry.options.id === options.only)
          if (!entry) return null
          const Component = entry.component
          return <>{error && <p role="alert">{error}</p>}<Component ctx={ctx} run={run} /></>
        }
        return null
      }
      return <><div style={{ position: 'fixed', bottom: 14, left: 14, zIndex: 90, background: 'var(--dsw-alias-bg-base, white)', borderRadius: 12 }}><Button aria-label="Local client settings" onClick={() => setOpen(true)}>Local client settings</Button></div>
        {open && <SettingsPanel rows={entries.map(entry => ({ id: entry.options.id, label: entry.options.label }))} renderSlot={render} activeId={active} onSelect={setActive} onClose={() => setOpen(false)} />}
      </>
    }
    const root = createRoot(node)
    root.render(<LocalUIBoundary><Manager /></LocalUIBoundary>)
    return () => { root.unmount(); offInstances(); offLocal(); rootOff(); node.remove() }
  })
}

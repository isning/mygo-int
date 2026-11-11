export { installClientI18n } from './plugins/client-i18n.js'
// Original implementation exposed to the navigation plugin; unchanged upstream.
export { installWindowDragRecall } from '../../../.scratch/upstream/deepseek-harness/packages/client/web/src/window-drag/recall.ts'
export { registerInstanceNavigation } from './instance-navigation'
// Original DSH UI components are imported from the verified pin by the build adapter.
// The injected face below is local only; no Host PluginManagerController/ConfigForms.
import { useClientText, clientError } from './i18n'
import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Button, ConnectionIndicator, IconPlusOutlineRegular, Modal, StateDot, Tag, closeTopModal, SettingsForm, SettingsValueField } from '@deepseek-ai/dsh-client-ui-primitives'
import { SlotCore } from '@deepseek-ai/dsh-client-ui-slots'
import { RowsSection } from '../../../.scratch/upstream/deepseek-harness/packages/client/ui-plugin-manager/src/client/PluginManagerPage.tsx?mygo-rows'
import { SettingsPanel } from '../../../.scratch/upstream/deepseek-harness/packages/client/ui-settings-general/src/client/SettingsRoot.tsx?mygo-panel'
import generalCSS from '../../../.scratch/upstream/deepseek-harness/packages/client/ui-settings-general/src/client/GeneralSection.module.css'
import rowCSS from '../../../.scratch/upstream/deepseek-harness/packages/client/ui-settings-general/src/client/DesktopChannelRow.module.css'
import modelsCSS from '../../../.scratch/upstream/deepseek-harness/packages/client/ui-settings-models/src/client/ModelsSection.module.css'
import { en } from '../../../.scratch/upstream/deepseek-harness/packages/client/ui-plugin-manager/src/client/locales.ts'
import deviceCSS from './device-ui.module.css'

export function registerLocalNote(ctx, label) {
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action', id: 'mygo-local-note', order: 100,
  }, ({ wide }) => wide ? <aside className={deviceCSS.note} data-mygo-local-plugin="marker">
    <Tag tone="neutral"><span className={deviceCSS.noteText}>{label}</span></Tag>
  </aside> : null))
}

const translate = (key, params = {}) => Object.entries(params).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, String(value)), key === undefined ? 'Protected local startup service' : en[key] ?? key)
const labels = { unavailable: 'Local entry unavailable', readOnly: 'Protected startup service', saveFailed: 'Local configuration was rejected', save: 'Save and apply locally', saving: 'Applying…' }
class LocalUIBoundary extends React.Component {
  state = { error: '' }
  static getDerivedStateFromError(error) { return { error: error.message } }
  render() { return this.state.error ? <p role="alert" className={modelsCSS.error}>{this.props.ctx.mygoLocale.text('Local settings failed: {error}. Reload to recover.', { error: this.state.error })}</p> : this.props.children }
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

export function ClientSettings({ ctx, run }) {
  const t = useClientText(ctx)
  const service = ctx.clientComposition
  useRefresh(service)
  const [confirmReset, setConfirmReset] = useState(false)
  const [openPlugins, setOpenPlugins] = useState(null)
  useEffect(() => {
    let live = true
    const fiber = ctx.inject(['pluginNavigation'], scope => {
      if (live) setOpenPlugins(() => () => {
        scope.pluginNavigation.openTab('mygo-local')
        closeTopModal(document)
      })
      scope.effect(() => () => { if (live) setOpenPlugins(null) })
    })
    return () => { live = false; void fiber.dispose() }
  }, [ctx])
  const status = service.status()
  return <div className={generalCSS.section} data-mygo-client-settings="">
    {status.diagnostic && <p role="alert" className={modelsCSS.error}>{status.diagnostic}</p>}
    <div className={rowCSS.row}>
      <div className={rowCSS.rowText}>
        <div className={rowCSS.title}>{t('Plugins')}</div>
        <div className={rowCSS.description}>{t('Manage plugins installed on this device.')}</div>
      </div>
      <Button variant="outline" size="sm" disabled={!openPlugins} onClick={openPlugins}>{t('Manage plugins')}</Button>
    </div>
    <details className={modelsCSS.customized} data-client-advanced="">
      <summary className={modelsCSS.customizedSummary}>{t('Advanced')}</summary>
      <div className={rowCSS.row}>
        <div className={rowCSS.rowText}>
          <div className={rowCSS.title}>{t('Restore defaults')}</div>
          <div className={rowCSS.description}>{t('Reset this device’s plugin preferences.')}</div>
        </div>
        <Button variant="outline" size="sm" disabled={status.busy} onClick={() => setConfirmReset(true)}>{t('Restore defaults')}</Button>
      </div>
    </details>
    <Modal open={confirmReset} title={t('Restore client defaults?')} closeLabel={t('Close')}
      description={t('Reset local plugin options and enabled states. The page will reload.')}
      onClose={() => setConfirmReset(false)} footer={<>
        <Button variant="outline" onClick={() => setConfirmReset(false)}>{t('Cancel')}</Button>
        <Button variant="primary" disabled={status.busy} onClick={() => run(() => service.reset())}>{t('Restore defaults')}</Button>
      </>} />
  </div>
}

function InstanceEditor({ ctx, service, target, onClose }) {
  const t = useClientText(ctx)
  const [draft, setDraft] = useState(() => ({ ...target.draft }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const field = (key, label, disabled = false) => <label className={modelsCSS.field} key={key}>
    <span className={modelsCSS.fieldLabel}>{label}</span>
    <input className={modelsCSS.input} aria-label={label} value={draft[key]}
      disabled={saving || disabled} required onChange={event => setDraft({ ...draft, [key]: event.target.value })} />
  </label>
  return <form className={modelsCSS.editor} data-instance-editor="" onSubmit={async event => {
    event.preventDefault(); setSaving(true); setError('')
    try { await service.save(draft, target.id); onClose() }
    catch (error) { setError(clientError(ctx, error)) }
    finally { setSaving(false) }
  }}>
    <div className={modelsCSS.editorHeader}><span className={modelsCSS.editorTitle}>{target.id ? t('Edit instance') : t('Add instance')}</span></div>
    {field('name', t('Name'))}
    {field('address', t('Address'))}
    <details className={modelsCSS.customized}>
      <summary className={modelsCSS.customizedSummary}>{t('Advanced')}</summary>
      <div className={modelsCSS.customizedBody}>
        {field('id', t('Instance ID'), !!target.id)}
      </div>
    </details>
    {error && <p className={modelsCSS.error} role="alert">{error}</p>}
    <div className={modelsCSS.editorActions}>
      <button type="button" className={modelsCSS.secondaryButton} disabled={saving} onClick={onClose}>{t('Cancel')}</button>
      <button type="submit" className={modelsCSS.primaryButton} disabled={saving}>{saving ? t('Saving…') : t('Save')}</button>
    </div>
  </form>
}

export function Instances({ ctx, run }) {
  const t = useClientText(ctx)
  const service = ctx.instanceManager
  useRefresh(service)
  const snapshot = service.snapshot()
  const isConnected = service.isConnectedProfile
  const [editing, setEditing] = useState(null)
  const [selecting, setSelecting] = useState(false)
  const status = row => !isConnected(row) ? t('Not connected')
    : snapshot.connectionStatus === 'checking' ? t('Checking…')
    : snapshot.connectionStatus === 'authenticated' ? t('Available') : t('Unavailable')
  return <div className={modelsCSS.section} data-mygo-instances="">
    <h2 className={modelsCSS.title}>{t('Instances')}</h2>
    <p className={modelsCSS.intro}>{t('Manage your instance connections.')}</p>
    {snapshot.diagnostic && <p className={modelsCSS.error} role="alert">{snapshot.diagnostic}</p>}
    {!isConnected(snapshot.catalog.find(row => row.id === snapshot.selectedId)) && <p className={modelsCSS.notice} role="status">{t('The selected profile is saved. Your active connection has not changed.')}</p>}
    <ul className={modelsCSS.rows}>
      {snapshot.catalog.map(row => <li key={row.id} className={`${modelsCSS.rowCard} ${deviceCSS.instanceCard}`} data-instance-id={row.id}>
        <div className={`${modelsCSS.rowHead} ${deviceCSS.instanceHead}`}>
          <span className={`${modelsCSS.rowIdentity} ${deviceCSS.instanceIdentity}`}>
            <span className={modelsCSS.rowName}>{row.name}</span>
            {isConnected(row) && <span className={modelsCSS.rowTag}>{snapshot.connectionStatus === 'authenticated' ? t('Current') : t('Configured')}</span>}
            {row.id === snapshot.selectedId && !isConnected(row) && <span className={modelsCSS.rowTag}>{t('Selected')}</span>}
          </span>
          <span className={modelsCSS.rowActions}>
            {!isConnected(row) && <button type="button" className={modelsCSS.secondaryButton}
              aria-label={t('Connect {name}', { name: row.name })} disabled={selecting} onClick={() => run(async () => {
                setSelecting(true); try { await service.select(row.id) } finally { setSelecting(false) }
              })}>{t('Connect')}</button>}
            <button type="button" className={modelsCSS.secondaryButton} aria-label={t('Edit {name}', { name: row.name })}
              onClick={() => setEditing(editing?.id === row.id ? null : { id: row.id, draft: { ...row } })}>{t('Edit')}</button>
          </span>
        </div>
        <span className={`${modelsCSS.editorRoute} ${deviceCSS.address}`}>{row.address}</span>
        <div className={modelsCSS.editorHeader}>
          <StateDot state={!isConnected(row) ? 'idle' : snapshot.connectionStatus === 'checking' ? 'ongoing' : snapshot.connectionStatus === 'authenticated' ? 'done' : 'error'} size={8} />
          <span className={modelsCSS.editorRoute}>{status(row)}</span>
          {isConnected(row) && <button type="button" className={modelsCSS.linkButton}
            disabled={snapshot.connectionStatus === 'checking'} onClick={() => run(service.refresh)}>{t('Check connection')}</button>}
        </div>
        {editing?.id === row.id && <InstanceEditor ctx={ctx} key={row.id} service={service} target={editing} onClose={() => setEditing(null)} />}
      </li>)}
    </ul>
    <div className={modelsCSS.addBlock}>
      {editing?.id === null ? <InstanceEditor ctx={ctx} key="new-instance" service={service} target={editing} onClose={() => setEditing(null)} />
        : <div className={modelsCSS.addActions}><button type="button" className={modelsCSS.addButton}
            disabled={snapshot.catalog.length >= 32} onClick={() => setEditing({ id: null, draft: {
              id: 'instance-' + Array.from(crypto.getRandomValues(new Uint8Array(12)), value => value.toString(16).padStart(2, '0')).join(''), name: '', address: '', authenticationViewId: snapshot.connectedProfile.authenticationViewId,
            } })}><IconPlusOutlineRegular size={14} />{t('Add instance')}</button></div>}
    </div>
  </div>
}

// Rendered by the original Settings outlet, under its existing React providers.
function NativeSection({ ctx, component: Component }) {
  useClientText(ctx)
  const [error, setError] = useState('')
  const run = async operation => {
    setError('')
    try { await operation() } catch (error) { setError(clientError(ctx, error)) }
  }
  return <LocalUIBoundary ctx={ctx}>{error && <p role="alert" className={modelsCSS.error}>{error}</p>}<Component ctx={ctx} run={run} /></LocalUIBoundary>
}

export function registerSettings(ctx) {
  for (const [id, label, order, Component] of [
    ['mygo-local-plugins', 'Client', 40, ClientSettings],
    ['mygo-instances', 'Instances', 41, Instances],
  ]) {
    ctx.slots.inject('settings.section', () => ctx.slots.register({
      name: 'settings.section', id, label: () => ctx.mygoLocale.text(label), order,
    }, () => <NativeSection ctx={ctx} component={Component} />))
  }
}

// Opt-in legacy composition only; the supplied-root path uses registerSettings.
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
    root.render(<LocalUIBoundary ctx={ctx}><Manager /></LocalUIBoundary>)
    return () => { root.unmount(); offInstances(); offLocal(); rootOff(); node.remove() }
  })
}

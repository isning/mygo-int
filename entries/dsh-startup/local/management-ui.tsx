// Original implementation exposed to the navigation plugin; unchanged upstream.
export { installWindowDragRecall } from '../../../.scratch/upstream/deepseek-harness/packages/client/web/src/window-drag/recall.ts'
export { registerInstanceNavigation } from './instance-navigation'
// Original DSH UI components are imported from the verified pin by the build adapter.
// The injected face below is local only; no Host PluginManagerController/ConfigForms.
import { useClientText, clientError } from './i18n'
import React, { useEffect, useState } from 'react'
import { Button, IconPlusOutlineRegular, IconTrashOutlineRegular, Modal, StateDot, closeTopModal } from '@deepseek-ai/dsh-client-ui-primitives'
import generalCSS from '../../../.scratch/upstream/deepseek-harness/packages/client/ui-settings-general/src/client/GeneralSection.module.css'
import rowCSS from '../../../.scratch/upstream/deepseek-harness/packages/client/ui-settings-general/src/client/DesktopChannelRow.module.css'
import modelsCSS from '../../../.scratch/upstream/deepseek-harness/packages/client/ui-settings-models/src/client/ModelsSection.module.css'
import deviceCSS from './device-ui.module.css'
import { MAX_INSTANCE_PROFILES } from './profile-identity'

class LocalUIBoundary extends React.Component {
  state = { error: '' }
  static getDerivedStateFromError(error) { return { error: error.message } }
  render() { return this.state.error ? <p role="alert" className={modelsCSS.error}>{this.props.ctx.mygoLocale.text('Local settings failed: {error}. Reload to recover.', { error: this.state.error })}</p> : this.props.children }
}

function useRefresh(service) {
  const [, update] = useState(0)
  useEffect(() => service.subscribe(() => update(value => value + 1)), [service])
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
        scope.pluginNavigation.openList()
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
    try { await service.save(draft, target.original); onClose() }
    catch (error) { setError(clientError(ctx, error)) }
    finally { setSaving(false) }
  }}>
    <div className={modelsCSS.editorHeader}><span className={modelsCSS.editorTitle}>{target.original ? t('Edit instance') : t('Add instance')}</span></div>
    {field('name', t('Name'))}
    {field('address', t('Address'))}
    <details className={modelsCSS.customized}>
      <summary className={modelsCSS.customizedSummary}>{t('Advanced')}</summary>
      <div className={modelsCSS.customizedBody}>
        {field('id', t('Instance ID'), !!target.original)}
        {field('authenticationViewId', t('Authentication view'), !!target.original)}
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
  const isCurrent = service.isCurrentProfile
  const [editing, setEditing] = useState(null)
  const [selecting, setSelecting] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(null)
  const status = row => !isCurrent(row) ? t('Not connected')
    : snapshot.connectionStatus === 'checking' ? t('Checking…')
    : snapshot.connectionStatus === 'authenticated' ? t('Connection successful') : t('Connection failed')
  return <div className={modelsCSS.section} data-mygo-instances="">
    <h2 className={modelsCSS.title}>{t('Instances')}</h2>
    <p className={modelsCSS.intro}>{t('Manage your instance connections.')}</p>
    <ul className={modelsCSS.rows}>
      {snapshot.catalog.map(row => { const identity = `${row.id}:${row.authenticationViewId}`; return <li key={identity} className={`${modelsCSS.rowCard} ${deviceCSS.instanceCard}`} data-instance-id={row.id} data-authentication-view={row.authenticationViewId}>
        <div className={`${modelsCSS.rowHead} ${deviceCSS.instanceHead}`}>
          <span className={`${modelsCSS.rowIdentity} ${deviceCSS.instanceIdentity}`}>
            <span className={modelsCSS.rowName}>{row.name}</span>
            {isCurrent(row) && <span className={modelsCSS.rowTag}>{snapshot.connectionStatus === 'authenticated' ? t('Current') : t('Configured')}</span>}
          </span>
          <span className={modelsCSS.rowActions}>
            {!isCurrent(row) && <button type="button" className={modelsCSS.secondaryButton}
              aria-label={t('Connect {name}', { name: row.name })} disabled={selecting} onClick={() => run(async () => {
                setSelecting(true); try { await service.select(row) } finally { setSelecting(false) }
              })}>{t('Connect')}</button>}
            <button type="button" className={modelsCSS.secondaryButton} aria-label={t('Edit {name}', { name: row.name })}
              onClick={() => setEditing(editing?.key === identity ? null : { key: identity, original: row, draft: { ...row } })}>{t('Edit')}</button>
            {!isCurrent(row) && <button type="button" className={modelsCSS.secondaryButton} aria-label={t('Remove {name}', { name: row.name })}
              disabled={removing} onClick={() => setConfirmRemove(row)}><IconTrashOutlineRegular size={13} />{t('Remove')}</button>}
          </span>
        </div>
        <span className={`${modelsCSS.editorRoute} ${deviceCSS.address}`}>{row.address}</span>
        <div className={modelsCSS.editorHeader}>
          <StateDot state={!isCurrent(row) ? 'idle' : snapshot.connectionStatus === 'checking' ? 'ongoing' : snapshot.connectionStatus === 'authenticated' ? 'done' : 'error'} size={8} />
          <span className={modelsCSS.editorRoute}>{status(row)}</span>
          {isCurrent(row) && <button type="button" className={modelsCSS.linkButton}
            disabled={snapshot.connectionStatus === 'checking'} onClick={() => run(service.refresh)}>{snapshot.connectionStatus === 'checking' ? t('Checking…') : t('Check again')}</button>}
        </div>
        {isCurrent(row) && snapshot.connectionStatus === 'unavailable' && snapshot.connectionDiagnostic
          && <p className={modelsCSS.error} role="alert">{t('Connection failed: {reason}', { reason: snapshot.connectionDiagnostic })}</p>}
        {editing?.key === identity && <InstanceEditor ctx={ctx} key={identity} service={service} target={editing} onClose={() => setEditing(null)} />}
      </li>})}
    </ul>
    <div className={modelsCSS.addBlock}>
      {editing?.key === null ? <InstanceEditor ctx={ctx} key="new-instance" service={service} target={editing} onClose={() => setEditing(null)} />
        : <div className={modelsCSS.addActions}><button type="button" className={modelsCSS.addButton}
            disabled={snapshot.catalog.length >= MAX_INSTANCE_PROFILES} onClick={() => setEditing({ key: null, original: null, draft: {
              id: 'instance-' + Array.from(crypto.getRandomValues(new Uint8Array(12)), value => value.toString(16).padStart(2, '0')).join(''), name: '', address: '', authenticationViewId: snapshot.currentProfile?.authenticationViewId ?? 'owner',
            } })}><IconPlusOutlineRegular size={14} />{t('Add instance')}</button></div>}
    </div>
    <Modal open={!!confirmRemove} title={t('Remove instance?')} closeLabel={t('Close')}
      description={t('Its saved connection and credentials will be deleted.')}
      onClose={() => { if (!removing) setConfirmRemove(null) }} footer={<>
        <Button variant="outline" disabled={removing} onClick={() => setConfirmRemove(null)}>{t('Cancel')}</Button>
        <Button variant="primary" disabled={removing} onClick={() => {
          const target = confirmRemove
          if (!target) return
          void run(async () => {
            setRemoving(true)
            try { await service.remove(target); setEditing(null); setConfirmRemove(null) }
            finally { setRemoving(false) }
          })
        }}>{t('Remove')}</Button>
      </>} />
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

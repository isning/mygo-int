// Offline device surface: original controls, original Instances forms and Settings panel.
import React, { useState, useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import { Button, StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import { Instances, ClientSettings } from './management-ui'
import { SettingsPanel } from '../../../.scratch/upstream/deepseek-harness/packages/client/ui-settings-general/src/client/SettingsRoot.tsx?mygo-panel'
import css from '../../../.scratch/upstream/deepseek-harness/packages/client/ui-settings-models/src/client/ModelsSection.module.css'
import { installThemeStyles } from '../../../.scratch/upstream/deepseek-harness/packages/client/ui-theme/src/client/styles.ts'

export function mountLocalShell(ctx) {
  const container = ctx.clientHost.container
  installThemeStyles(ctx)
  let root, error = '', version = 0
  const listeners = new Set<() => void>()
  const notify = () => { version++; for (const listener of listeners) listener() }
  const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener) }
  function Shell() {
    useSyncExternalStore(subscribe, () => version)
    const [settings, setSettings] = useState(false)
    const [active, setActive] = useState('instances')
    const [formError, setFormError] = useState('')
    const run = async operation => { setFormError(''); try { await operation() } catch (reason) { setFormError(reason.message) } }
    return <div data-mygo-local-shell="" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <nav aria-label="Client navigation" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <span className={css.title}>mygo</span>
        <Button variant="outline" onClick={() => setSettings(true)}>Instances</Button>
      </nav>
      <main className={css.section}>
        <h1 className={css.title}>{error ? 'Not connected' : 'Connecting…'}</h1>
        <p className={css.intro}>Your instance profiles and device settings are available here.</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <StateDot state={error ? 'error' : 'ongoing'} size={8} />
          <span className={css.intro}>{error ? 'The instance is unavailable.' : 'Loading the instance client.'}</span>
        </div>
        {error && <><p role="alert" className={css.error}>{error}</p><div><Button variant="outline" onClick={() => location.reload()}>Retry connection</Button></div></>}
      </main>
      {settings && <SettingsPanel rows={[{ id: 'instances', label: 'Instances' }, { id: 'client', label: 'Client' }]} activeId={active} onSelect={setActive}
        onClose={() => setSettings(false)} renderSlot={(key) => key === 'settings.header' ? 'Settings'
          : key === 'settings.close' ? 'Close settings'
          : key === 'settings.section' ? <>{formError && <p role="alert">{formError}</p>}{active === 'instances' ? <Instances ctx={ctx} run={run} /> : <ClientSettings ctx={ctx} run={run} />}</> : null} />}
    </div>
  }
  const show = () => { if (!root) { root = createRoot(container); root.render(<Shell />) } }
  const handoff = () => { root?.unmount(); root = undefined }
  show()
  ctx.provide('localShell', {
    handoff,
    showError(reason) { error = reason instanceof Error ? reason.message : String(reason); show(); notify() },
  })
  ctx.effect(() => () => { handoff(); listeners.clear() })
}

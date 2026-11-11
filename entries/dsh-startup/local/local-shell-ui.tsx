// Offline device surface: original controls, original Instances forms and Settings panel.
import { useClientText, clientError } from './i18n'
import React, { useState, useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import { Button, StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import { Instances, ClientSettings } from './management-ui'
import { SettingsPanel } from '../../../.scratch/upstream/deepseek-harness/packages/client/ui-settings-general/src/client/SettingsRoot.tsx?mygo-panel'
import css from '../../../.scratch/upstream/deepseek-harness/packages/client/ui-settings-models/src/client/ModelsSection.module.css'
import { installThemeStyles } from '../../../.scratch/upstream/deepseek-harness/packages/client/ui-theme/src/client/styles.ts'
import { LanguageRow } from '../../../.scratch/upstream/deepseek-harness/packages/client/locale/src/client/LanguageRow.tsx'
import shellCSS from './local-shell.module.css'

// The original row owns its menu, selection chrome and keyboard behavior.
// Only its preference source differs before the remote locale service exists.
function LocalLanguage({ ctx }) {
  const t = useClientText(ctx)
  const useStore = selector => {
    useSyncExternalStore(ctx.mygoLocale.subscribe, ctx.mygoLocale.getSnapshot)
    const language = ctx.mygoLocale.locale()
    return selector({ active: language.active, options: language.locales })
  }
  return <div data-mygo-language=""><LanguageRow useStore={useStore}
    t={() => t('Language')} setLocale={id => ctx.mygoLocale.setLocale(id)} /></div>
}

export function mountLocalShell(ctx) {
  const container = ctx.clientHost.container
  installThemeStyles(ctx)
  let root, error = '', authenticationRequired = false, version = 0
  const listeners = new Set<() => void>()
  const notify = () => { version++; for (const listener of listeners) listener() }
  const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener) }
  function Shell() {
    const t = useClientText(ctx)
    useSyncExternalStore(subscribe, () => version)
    const [settings, setSettings] = useState(false)
    const [active, setActive] = useState('instances')
    const [formError, setFormError] = useState('')
    const run = async operation => { setFormError(''); try { await operation() } catch (reason) { setFormError(clientError(ctx, reason)) } }
    return <div data-mygo-local-shell="" className={shellCSS.shell}>
      <nav aria-label={t('Client navigation')} className={shellCSS.navigation}>
        <span className={css.title}>mygo</span>
        <div className={shellCSS.actions}>
          <LocalLanguage ctx={ctx} />
          <Button data-mygo-open-settings="" variant="outline" onClick={() => setSettings(true)}>{t('Instances')}</Button>
        </div>
      </nav>
      <main className={css.section}>
        <h1 className={css.title}>{error ? t('Not connected') : t('Connecting…')}</h1>
        <p className={css.intro}>{t('Your instance profiles and device settings are available here.')}</p>
        <div className={shellCSS.status} role="status">
          <StateDot state={error ? 'error' : 'ongoing'} size={8} />
          <span className={css.intro}>{authenticationRequired ? t('Sign in required') : error ? t('The instance is unavailable.') : t('Loading the instance client.')}</span>
        </div>
        {error && <><p role="alert" className={`${authenticationRequired ? css.intro : css.error} ${shellCSS.error}`}>{authenticationRequired ? t('Open the private launch link provided by your instance to sign in.') : error}</p><div><Button variant="outline" onClick={() => location.reload()}>{t('Retry connection')}</Button></div></>}
      </main>
      {settings && <SettingsPanel rows={[{ id: 'instances', label: t('Instances') }, { id: 'client', label: t('Client') }]} activeId={active} onSelect={setActive}
        onClose={() => setSettings(false)} renderSlot={(key) => key === 'settings.header' ? t('Settings')
          : key === 'settings.close' ? t('Close settings')
          : key === 'settings.section' ? <>{formError && <p role="alert" className={css.error}>{formError}</p>}{active === 'instances' ? <Instances ctx={ctx} run={run} /> : <ClientSettings ctx={ctx} run={run} />}</> : null} />}
    </div>
  }
  const show = () => { if (!root) { root = createRoot(container); root.render(<Shell />) } }
  const handoff = () => { root?.unmount(); root = undefined }
  show()
  ctx.provide('localShell', {
    handoff,
    showError(reason) { authenticationRequired = reason?.status === 401; error = reason instanceof Error ? reason.message : String(reason); show(); notify() },
  })
  ctx.effect(() => () => { handoff(); listeners.clear() })
}

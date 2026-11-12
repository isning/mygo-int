// Offline device surface: original controls, original Instances forms and Settings panel.
import { useClientText, clientError } from './i18n'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Button, StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import { Instances, ClientSettings } from './management-ui'
import { SettingsPanel } from '@deepseek-ai/dsh-client-ui-settings-general/client'
import css from '@deepseek-ai/dsh-client-ui-settings-models/src/client/ModelsSection.module.css'
import shellCSS from './local-shell.module.css'
import type { MygoContext } from './types'

// The original row owns its menu, selection chrome and keyboard behavior.
// Only its preference source differs before the remote locale service exists.
function LocalLanguage({ ctx }: { ctx: MygoContext }) {
  const t = useClientText(ctx)
  useSyncExternalStore(ctx.mygoLocale.subscribe, ctx.mygoLocale.getSnapshot)
  const language = ctx.mygoLocale.locale()
  return <label data-mygo-language=""><span>{t('Language')}</span>{' '}
    <select value={language.active} onChange={event => ctx.mygoLocale.setLocale(event.target.value)}>
      {language.locales.map((option: { id: string; label: string }) => <option key={option.id} value={option.id}>{option.label}</option>)}
    </select></label>
}

export function mountLocalShell(ctx: MygoContext) {
  const container = ctx.clientHost.container
  const hasInstanceRoute = /^\/mygo-instance\/[a-f0-9]{64}(?:\/|$)/.test(location.pathname)
  ctx.effect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)')
    const update = () => {
      document.documentElement.style.colorScheme = media.matches ? 'dark' : 'light'
      document.body.toggleAttribute('data-ds-dark-theme', media.matches)
    }
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, 'mygo: follow the system DSH palette before an instance is connected')
  let root: Root | undefined, error = '', authenticationRequired = false, version = 0
  const listeners = new Set<() => void>()
  const notify = () => { version++; for (const listener of listeners) listener() }
  const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
  function Shell() {
    const t = useClientText(ctx)
    useSyncExternalStore(subscribe, () => version)
    const [settings, setSettings] = useState(false)
    const [active, setActive] = useState('instances')
    const [formError, setFormError] = useState('')
    const [token, setToken] = useState('')
    const [signingIn, setSigningIn] = useState(false)
    const [restoreChecked, setRestoreChecked] = useState(false)
    const run = async (operation: () => void | Promise<void>) => { setFormError(''); try { await operation() } catch (reason) { setFormError(clientError(ctx, reason)) } }
    useEffect(() => {
      if (!authenticationRequired) { setRestoreChecked(false); return }
      let active = true
      void fetch('/mygo-local/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
        .then((response) => {
          if (!active) return
          if (response.status === 204) location.reload()
          else setRestoreChecked(true)
        }, () => { if (active) setRestoreChecked(true) })
      return () => { active = false }
    }, [authenticationRequired])
    return <div data-mygo-local-shell="" className={shellCSS.shell}>
      <div className={shellCSS.frame}>
        <nav aria-label={t('Client navigation')} className={shellCSS.navigation}>
          <span className={css.title}>mygo</span>
          <div className={shellCSS.actions}>
            <LocalLanguage ctx={ctx} />
            <Button data-mygo-open-settings="" variant="outline" onClick={() => { setFormError(''); setSettings(true) }}>{t('Instances')}</Button>
          </div>
        </nav>
        <main className={`${css.section} ${shellCSS.content}`}>
          <h1 className={css.title}>{!hasInstanceRoute ? t('Connect to an instance') : error ? t('Not connected') : t('Connecting…')}</h1>
          <p className={css.intro}>{t('Your instance profiles and device settings are available here.')}</p>
          <div className={`${css.rowCard} ${shellCSS.connectionCard}`}>
            <div className={shellCSS.status} role="status">
              <StateDot state={!hasInstanceRoute ? 'idle' : error ? 'error' : 'ongoing'} size={8} />
              <span className={css.intro}>{!hasInstanceRoute ? t('Choose an instance to connect.') : authenticationRequired ? t('Sign in required') : error ? t('The instance is unavailable.') : t('Loading the instance client.')}</span>
            </div>
            {!hasInstanceRoute && <Button variant="primary" onClick={() => { setFormError(''); setSettings(true); setActive('instances') }}>{t('Open instances')}</Button>}
            {hasInstanceRoute && error && (!authenticationRequired || restoreChecked) && <><p role="alert" className={`${authenticationRequired ? css.intro : css.error} ${shellCSS.error}`}>{authenticationRequired ? t('Open the private launch link provided by your instance to sign in.') : error}</p><div><Button variant="outline" onClick={() => location.reload()}>{t('Retry connection')}</Button></div></>}
            {authenticationRequired && restoreChecked && <form className={css.editor} onSubmit={(event) => {
              event.preventDefault()
              void run(async () => {
                setSigningIn(true)
                try {
                  let value = token.trim()
                  if (/^https?:\/\//.test(value)) {
                    const link = new URL(value)
                    const configuration = ctx.clientHost.configuration
                    const prefix = (path: string) => /^\/mygo-instance\/[a-f0-9]{64}/.exec(path)?.[0] ?? ''
                    const sameRoute = link.origin === location.origin && prefix(link.pathname) === prefix(location.pathname)
                    if (link.origin !== configuration.selectedInstance.address && !sameRoute) throw Error(t('Invalid login link'))
                    value = link.searchParams.get('token') ?? ''
                  }
                  const response = await fetch('/mygo-local/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: value }) })
                  if (!response.ok) throw Error(t('Sign in failed'))
                  setToken('')
                  location.reload()
                } finally { setSigningIn(false) }
              })
            }}>
              <label className={css.field}><span className={css.fieldLabel}>{t('Private launch link or token')}</span>
                <input className={css.input} type="password" autoComplete="off" value={token} required disabled={signingIn}
                  onChange={event => setToken(event.target.value)} /></label>
              {formError && <p role="alert" className={css.error}>{formError}</p>}
              <div className={css.editorActions}><Button variant="primary" type="submit" disabled={signingIn || !token.trim()}>{t('Sign in')}</Button></div>
            </form>}
          </div>
        </main>
        {settings && <SettingsPanel rows={[{ id: 'instances', label: t('Instances'), order: 0 }, { id: 'client', label: t('Client'), order: 1 }]} activeId={active} onSelect={setActive}
          onClose={() => setSettings(false)} renderSlot={key => key === 'settings.header' ? t('Settings')
            : key === 'settings.close' ? t('Close settings')
              : key === 'settings.section' ? <>{formError && <p role="alert" className={css.error}>{formError}</p>}{active === 'instances' ? <Instances ctx={ctx} run={run} /> : <ClientSettings ctx={ctx} run={run} />}</> : null} />}
      </div>
    </div>
  }
  const show = () => { if (!root) { root = createRoot(container); root.render(<Shell />) } }
  const handoff = () => { root?.unmount(); root = undefined }
  show()
  ctx.provide('localShell', {
    handoff,
    showError(reason: unknown) {
      authenticationRequired = typeof reason === 'object' && reason !== null && Reflect.get(reason, 'status') === 401
      error = ctx.mygoLocale.text(reason instanceof Error ? reason.message : String(reason))
      show()
      notify()
    },
  })
  ctx.effect(() => () => { handoff(); listeners.clear() })
}

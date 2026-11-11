// Reuse the official registry offline, then adopt the connected instance's locale.
import { LocaleRuntime } from '../../../../.scratch/upstream/deepseek-harness/packages/client/locale/src/client/index.ts'
import { namespace, dictionaries } from '../locales/index.js'
export const inject = ['clientHost']
export function apply(ctx) { installClientI18n(ctx, ctx.clientHost.configuration) }
export function installClientI18n(ctx, configuration) {
  const selected = configuration.deviceInstance ?? configuration.selectedInstance
  const storage = localStorage
  const key = `mygo.locale.v1:${location.origin}:${selected.id}:${selected.authenticationViewId}`
  let preference = null
  try { const saved = storage.getItem(key); if (saved && Object.hasOwn(dictionaries, saved)) preference = saved } catch {}
  const offline = new LocaleRuntime(ctx, undefined, { languages: navigator.languages, preference })
  for (const [id, label] of [['ja', '日本語'], ['es', 'Español'], ['fr', 'Français'], ['de', 'Deutsch'], ['ru', 'Русский'], ['pt', 'Português']]) {
    ctx.effect(() => offline.addLanguage({ id, label, fallback: 'en' }))
  }
  ctx.effect(() => offline.register(namespace, dictionaries))
  let current = offline, revision = 0, off
  const listeners = new Set()
  const notify = () => {
    revision++
    document.documentElement.lang = current.getSnapshot().active === 'zh' ? 'zh-CN' : current.getSnapshot().active
    try { storage.setItem(key, current.getSnapshot().active) } catch {}
    for (const listener of listeners) listener()
  }
  const adopt = source => { off?.(); current = source; off = current.subscribe(notify); notify() }
  adopt(offline)
  ctx.provide('mygoLocale', {
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    getSnapshot: () => revision,
    locale: () => current.getSnapshot(),
    canSelect: () => current === offline,
    text(key, params) {
      if (!Object.hasOwn(dictionaries.en, key)) return key
      return current.bind(namespace)(key, params)
    },
    // Offline selection belongs to this device. Connected language settings
    // continue to use the original locale service and its original persistence.
    setLocale(id) { if (current !== offline) throw Error('Use the connected Language setting'); offline.setLocale(id) },
  })
  ctx.inject(['locale'], scope => {
    scope.effect(() => scope.locale.register(namespace, dictionaries))
    adopt(scope.locale)
    scope.effect(() => () => { offline.setLocale(current.getSnapshot().active); adopt(offline) })
  })
  ctx.effect(() => () => { off?.(); listeners.clear() })
}

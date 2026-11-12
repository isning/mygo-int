// Reuse the official registry offline, then adopt the connected instance's locale.
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { namespace, dictionaries } from '../locales/index.js'
import { createLocaleForm } from '../locale-form.js'
export const inject = ['clientHost']
export function apply(ctx) { installClientI18n(ctx) }
function installClientI18n(ctx) {
  const offline = new LocaleRuntime(ctx, createLocaleForm(), { languages: navigator.languages })
  for (const [id, label] of [['ja', '日本語'], ['es', 'Español'], ['fr', 'Français'], ['de', 'Deutsch'], ['ru', 'Русский'], ['pt', 'Português']]) {
    ctx.effect(() => offline.addLanguage({ id, label, fallback: 'en' }))
  }
  ctx.effect(() => offline.register(namespace, dictionaries))
  let current = offline, revision = 0, off
  const listeners = new Set()
  const notify = () => {
    revision++
    document.documentElement.lang = current.getSnapshot().active === 'zh' ? 'zh-CN' : current.getSnapshot().active
    for (const listener of listeners) listener()
  }
  const adopt = source => { off?.(); current = source; off = current.subscribe(notify); notify() }
  adopt(offline)
  ctx.provide('mygoLocale', {
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    getSnapshot: () => revision,
    locale: () => current.getSnapshot(),
    text(key, params) {
      if (!Object.hasOwn(dictionaries.en, key)) return key
      return current.bind(namespace)(key, params)
    },
    // Root selection uses the same durable settings semantics as DSH. Once an
    // instance is connected, its original Language setting remains authoritative.
    setLocale(id) { if (current !== offline) throw Error('Use the connected Language setting'); offline.setLocale(id) },
  })
  ctx.inject(['locale'], scope => {
    scope.effect(() => scope.locale.register(namespace, dictionaries))
    adopt(scope.locale)
    scope.effect(() => () => { adopt(offline) })
  })
  ctx.effect(() => () => { off?.(); listeners.clear() })
}

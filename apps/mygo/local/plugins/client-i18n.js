// Reuse the official registry offline, then adopt the connected instance's locale.
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { namespace, dictionaries } from '../locales/index.js'
export const inject = ['clientHost']
export function apply(ctx) { installClientI18n(ctx) }
function createLocaleForm() {
  let snapshot = { status: 'loading', value: undefined, base: undefined, user: undefined, revision: undefined, writable: false }
  const listeners = new Set()
  const publish = value => {
    snapshot = value
    for (const listener of listeners) listener()
  }
  const request = async (method = 'GET', body) => {
    const response = await fetch('/mygo-local/locale', {
      method,
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (![200, 409].includes(response.status)) throw Error(`locale settings HTTP ${response.status}`)
    return { status: response.status, value: await response.json() }
  }
  const accept = value => publish({
    status: 'ready', value: value.preference === null ? {} : { preference: value.preference },
    base: {}, user: value.preference === null ? {} : { preference: value.preference },
    revision: value.revision, writable: true,
  })
  const loaded = request().then(({ value }) => { accept(value) }, () => {
    publish({ ...snapshot, status: 'unavailable' })
  })
  let tail = loaded
  const mutate = (ops, expectedRevision) => {
    let accepted = false
    const operation = tail.catch(() => {}).then(async () => {
      if (snapshot.status !== 'ready') return
      let preference = snapshot.value?.preference
      for (const op of ops) {
        if (op.path?.length !== 1 || op.path[0] !== 'preference') return
        if (op.op === 'set') preference = op.value
        else if (op.op === 'unset') preference = null
        else return
      }
      const result = await request('PUT', { expectedRevision: expectedRevision ?? snapshot.revision, preference })
      accept(result.value)
      accepted = result.status === 200
    })
    tail = operation.catch(() => {})
    return operation.then(() => accepted)
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    mutate,
    set(field, value) { return mutate([{ op: 'set', path: [field], value }]) },
    unset(field) { return mutate([{ op: 'unset', path: [field] }]) },
  }
}
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

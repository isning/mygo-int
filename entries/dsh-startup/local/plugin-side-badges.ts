// Small decoration for the pinned original card DOM: no replacement page/list.
// This pin has a detail badge Slot, but no card badge Slot. Keep the adapter
// scoped to its existing card anchors and dispose every addition.
import type {} from './i18n'
import type { Context } from '@deepseek-ai/cordis'
import type { BundleInfo, PluginInfo } from '@deepseek-ai/dsh-api-remotes/client'

// Explicit identities from the four pinned plugins.item providers; these cards
// are settings contributions, not bundles, so they have no bundle row table.
export const builtinModules: Record<string, readonly string[]> = {
  subagent: ['@deepseek-ai/dsh-client-ui-settings-subagent'],
  'web-search': ['@deepseek-ai/dsh-client-ui-settings-web-search'],
  'agent-loop': ['@deepseek-ai/dsh-client-ui-settings-agent-loop'],
  shell: ['@deepseek-ai/dsh-client-ui-settings-shell'],
}
export type PluginRuntimeFacts = {
  getSnapshot(): { bundles: readonly BundleInfo[]; plugins: readonly PluginInfo[] }
  subscribe(listener: () => void): () => void
}

export function installPluginSideBadges(ctx: Context, ownsLocalEntry: (entry: unknown) => boolean) {
  let bundles: BundleInfo[] = [], plugins: PluginInfo[] = []
  let snapshot = { bundles, plugins }
  const listeners = new Set<() => void>()
  let live = true, revision = 0, scheduled = false
  const mounts = new Map<Element, HTMLElement>()
  const normalize = (name: string) => name.replace(/\/client$/, '')
  function badge(label: string, active: boolean, description: string) {
    const element = document.createElement('span')
    element.dataset.pluginSide = label
    element.dataset.active = String(active)
    element.title = description
    element.setAttribute('aria-label', `${label}: ${description}`)
    element.style.cssText = 'display:inline-flex;align-items:center;gap:4px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary);white-space:nowrap'
    const dot = document.createElement('span')
    dot.setAttribute('aria-hidden', 'true')
    dot.style.cssText = `width:5px;height:5px;border-radius:50%;background:${active ? 'var(--dsw-alias-state-success-primary, #22a06b)' : 'var(--dsw-alias-label-tertiary, #90959c)'}`
    element.append(dot, label)
    return element
  }
  function update() {
    const t = ctx.mygoLocale.text
    scheduled = false
    if (!live) return
    for (const [card, mount] of mounts) if (!card.isConnected) { mount.remove(); mounts.delete(card) }
    const clientEntries = [...ctx.loader.entries()].filter(entry => !ownsLocalEntry(entry))
    for (const card of document.querySelectorAll('[data-plugin-panel] [data-plugin-package], [data-plugin-panel] [data-plugin-item]')) {
      const bundle = bundles.find(item => item.name === card.getAttribute('data-plugin-package'))
      const title = card.querySelector('button')?.parentElement
      const builtin = builtinModules[card.getAttribute('data-plugin-item') ?? '']
      if ((!bundle && !builtin) || !title || !plugins.length) continue
      const modules = new Set(builtin ?? bundle!.rows.map(row => normalize(row.moduleName)))
      const remote = plugins.filter(entry => modules.has(normalize(entry.moduleName)))
      const client = clientEntries.filter(entry => modules.has(normalize(entry.options.name)))
      const remoteActive = ctx.connection.state.getSnapshot() === 'connected' && (bundle?.enabled ?? true) && remote.length > 0 && remote.every(entry => entry.enabled && entry.fiberPhase === 'active')
      const clientActive = client.length > 0 && client.every(entry => !entry.disabled && entry.fiber?.state === 2)
      const clientState = clientActive ? t('Loaded') : client.some(entry => entry.fiber?.state === 3) ? t('Load failed') : t('Not ready')
      const signature = JSON.stringify([remoteActive, client.length > 0, clientActive, clientState])
      let mount = mounts.get(card)
      if (!mount || mount.parentElement !== title) {
        mount?.remove()
        mount = document.createElement('span')
        mount.dataset.mygoPluginSides = ''
        mount.style.cssText = 'display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap'
        title.append(mount)
        mounts.set(card, mount)
      }
      if (mount.dataset.signature === signature) continue
      mount.dataset.signature = signature
      mount.replaceChildren(badge('Remote', remoteActive, remoteActive ? t('Running') : t('Not running')))
      if (client.length) mount.append(badge('Client', clientActive, clientState))
    }
  }
  function schedule() { if (!scheduled && live) { scheduled = true; queueMicrotask(update) } }
  async function refresh() {
    const current = ++revision
    try {
      const [bundleReply, pluginReply] = await Promise.all([ctx.remote.pluginManager.listBundles(), ctx.remote.pluginManager.listPlugins()])
      if (!live || current !== revision) return
      bundles = bundleReply.ok && pluginReply.ok ? bundleReply.value : []
      plugins = bundleReply.ok && pluginReply.ok ? pluginReply.value : []
    } catch { if (current === revision) { bundles = []; plugins = [] } }
    if (!live || current !== revision) return
    snapshot = { bundles, plugins }
    for (const listener of listeners) listener()
    // Never leave a stale green state after a denied or failed read.
    if (!bundles.length) { for (const mount of mounts.values()) mount.remove(); mounts.clear() }
    schedule()
  }
  ctx.effect(() => {
    const observer = new MutationObserver(schedule)
    observer.observe(document.getElementById('root')!, { childList: true, subtree: true })
    const status = ctx.on('internal/status', schedule)
    const connection = ctx.connection.state.subscribe(schedule)
    const locale = ctx.mygoLocale.subscribe(schedule)
    const manifest = ctx.modules.entries.state.subscribe(schedule)
    const changed = ctx.remote.$on('plugin-manager/changed', () => { void refresh() })
    const reset = ctx.on('connection/reset', () => { void refresh() })
    void refresh()
    return () => { live = false; revision++; observer.disconnect(); status(); connection(); locale(); manifest(); changed(); reset(); for (const mount of mounts.values()) mount.remove(); mounts.clear(); listeners.clear() }
  })
  return { getSnapshot: () => snapshot, subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } } } satisfies PluginRuntimeFacts
}

// Explicit migration entry for the pinned single-instance Web composition.
import * as managementUI from './local/management-ui.tsx'
import * as unifiedUI from './local/unified-plugin-ui.tsx'
import * as pluginManagerClient from '../../.scratch/upstream/deepseek-harness/packages/client/ui-plugin-manager/src/client/index.ts?mygo-plugin-manager'
import { FIBER_STATE as FiberState } from '../../.scratch/upstream/deepseek-harness/packages/client/web/src/loader-status.ts'
import { getStaticModules } from '@deepseek-ai/dsh-client-web'
import { protectLocalEntryModules } from './local-entry-boundary.js'
import { bootClient, assertEntriesActive } from '../../.scratch/upstream/deepseek-harness/packages/client/web/src/boot-client.ts'
import { mountClient } from '../../.scratch/upstream/deepseek-harness/packages/client/web/src/mount.ts'
import { BootPage } from '../../.scratch/upstream/deepseek-harness/packages/client/web/src/boot-page.ts'
import { createSharedRuntimeDiagnostics } from './local/plugins/shared-runtime-diagnostics.js'
import '../../.scratch/upstream/deepseek-harness/packages/client/web/src/base.css'
import '@deepseek-ai/dsh-client-ui-theme/brand-font.css'

export async function startSingleClient() {
  const container = document.getElementById('root')
  if (!container) throw Error('mygo single client: missing #root')
  const page = new BootPage(container)
  const staticModules = getStaticModules()
  staticModules['mygo/dsh-management-ui'] = managementUI
  staticModules['mygo/dsh-unified-plugin-ui'] = unifiedUI
  // A local client-half override: retain the pinned plugin's apply/controller
  // and registration, extending only contributed-tab page navigation.
  staticModules['@deepseek-ai/dsh-client-ui-plugin-manager'] = pluginManagerClient
  staticModules['@deepseek-ai/dsh-client-ui-plugin-manager/client'] = pluginManagerClient
  const { Context } = staticModules['@deepseek-ai/cordis']
  const React = staticModules.react
  const ctx = new Context()
  const diagnosticName = '@mygo/single-client-contribution'
  const localEntries = new Set()
  let configuration
  const dispose = async () => {
    await ctx.fiber.dispose()
    localEntries.clear()
    page.dispose()
  }
  addEventListener('pagehide', event => { if (!event.persisted) void dispose() })
  staticModules[diagnosticName] = createSharedRuntimeDiagnostics({ React, Context, getConfiguration: () => configuration })
  try {
    const response = await fetch('/mygo-local/startup.json', { cache: 'no-store' })
    if (!response.ok) throw Error(`Local startup configuration HTTP ${response.status}`)
    configuration = await response.json()
    // ClientModuleSystem's original seed-first import/require contract composes
    // trusted native local modules with unchanged Host bundle resolution. Keep
    // the startup specifiers intact; do not replace loader.internal or ctx.modules.
    for (const { name } of configuration.entries) {
      if (Object.hasOwn(staticModules, name)) continue
      const url = new URL(name, new URL('/mygo-local/', location.href)).href
      try {
        staticModules[name] = await import(/* @vite-ignore */ url)
      } catch (reason) {
        throw Error(`Local module ${name} failed to import: ${String(reason)}`)
      }
    }
    ctx.provide('mygoStartup', Object.freeze({
      configuration, FiberState, sharedClient: true,
      ownsEntry: entry => localEntries.has(entry),
      async admit() {
        const response = await fetch('/mygo-local/admission', { cache: 'no-store', credentials: 'same-origin' })
        if (!response.ok) throw Error(`DSH browser admission required (${response.status}); reopen the private launch entry`)
      },
    }))
    ctx.reflect.provide('mygoPlatform', Object.freeze({ modules: Object.freeze(staticModules) }))
    const bootstrapUrl = '/mygo-boot/bootstrap.js'
    await import(/* @vite-ignore */ bootstrapUrl)
    await globalThis.__DSH_BOOT_READY__?.promise
    const facade = globalThis.__ModuleLoader__
    if (!facade) throw Error('web boot: window.__ModuleLoader__ bootstrap facade is missing')
    const transport = globalThis.__DSH_TRANSPORT__
    const modules = facade.create({
      boot: globalThis.__DSH_BOOT__, staticModules,
      ...(transport?.loadBundle ? { loadBundle: transport.loadBundle } : {}),
      ...(transport?.resolveAsset ? { resolveAsset: transport.resolveAsset } : {}),
    })
    const manifest = modules.manifest
    const releaseBoundary = protectLocalEntryModules(modules, [
      ...configuration.entries.map(entry => entry.name), diagnosticName,
    ])
    ctx.effect(() => releaseBoundary, 'mygo: local module ownership boundary')
    for (const { id, name } of configuration.entries) {
      if (manifest.modules.some(row => row.id === name) || id === 'mygo-single-client') {
        throw Error(`Local startup identity conflicts with client entry: ${id} (${name})`)
      }
    }
    page.setTotal(manifest.plugins.length + configuration.entries.filter(entry => !entry.disabled).length + 1)
    await Promise.all(manifest.plugins.filter(row => row.immediately).map(row => modules.prefetch(row.id).catch(() => {})))
    await bootClient({ ctx, modules, manifest, onEntryState: (name, state) => {
      if (state !== 'failed') page.setState(name, state)
    } })
    // Host ClientEntries owns only its managed roster. These configured entries
    // belong to local startup and retain original Loader config/inject semantics.
    for (const options of configuration.entries) {
      if ([...ctx.loader.entries()].some(entry => entry.options.id === options.id)) {
        throw Error(`Local startup Entry id already exists: ${options.id}`)
      }
      const desired = await ctx.waterfall('mygo/startup-entry', options, () => options)
      await ctx.loader.create(desired)
      // Keep concrete Entry identity; the shared Loader also contains the Host
      // roster, which must never become the local management service's scope.
      localEntries.add(ctx.loader.resolve(options.id))
    }
    await ctx.loader.await()
    for (const entry of localEntries) {
      if (entry.disabled || entry.fiber?.state === FiberState.ACTIVE) continue
      await ctx.serial('mygo/startup-failed', entry)
    }
    await ctx.loader.create({ id: 'mygo-single-client', name: diagnosticName })
    await ctx.loader.await()
    const warnings = []
    await assertEntriesActive(ctx, modules, message => { warnings.push(message); console.warn(message) })
    if ([...ctx.loader.entries()].some(entry => configuration.entries.some(options => options.id === entry.options.id)
      && !entry.disabled && entry.fiber?.state !== 2)) {
      throw Error(warnings.join('\n') || 'Local startup entries did not activate')
    }
    await mountClient(ctx, container)
  } catch (reason) {
    console.error(reason)
    await ctx.fiber.dispose()
    page.fail(reason instanceof Error ? reason.message : String(reason))
  }
}

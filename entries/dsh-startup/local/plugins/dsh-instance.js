import { FIBER_STATE as FiberState, STATE_LABELS } from '../../../../.scratch/upstream/deepseek-harness/packages/client/web/src/loader-status.ts'
import { protectLocalEntryModules } from '../../local-entry-boundary.js'
import { assertEntriesActive } from '../../../../.scratch/upstream/deepseek-harness/packages/client/web/src/boot-client.ts'
import { mountClient } from '../../../../.scratch/upstream/deepseek-harness/packages/client/web/src/mount.ts'
import { BootPage } from '../../../../.scratch/upstream/deepseek-harness/packages/client/web/src/boot-page.ts'
import { createSharedRuntimeDiagnostics } from './shared-runtime-diagnostics.js'
import '../../../../.scratch/upstream/deepseek-harness/packages/client/web/src/base.css'
import '@deepseek-ai/dsh-client-ui-theme/brand-font.css'

// Local harness integration; never creates a Context or installs another Loader.
export const inject = ['clientHost', 'loader']
export function apply(scope) {
  const { root: ctx, container, configuration, modules: staticModules, localEntries } = scope.clientHost
  const page = new BootPage(container)
  const { Context } = staticModules['@deepseek-ai/cordis']
  const React = staticModules.react
  const diagnosticName = '@mygo/single-client-contribution'
  let modules
  staticModules[diagnosticName] = createSharedRuntimeDiagnostics({ React, Context, getConfiguration: () => configuration })
  ctx.provide('mygoStartup', Object.freeze({
    configuration, FiberState, sharedClient: true,
    ownsEntry: entry => localEntries.has(entry),
    async admit() {
      const response = await fetch('/mygo-local/admission', { cache: 'no-store', credentials: 'same-origin' })
      if (!response.ok) throw Error(`DSH browser admission required (${response.status}); reopen the private launch entry`)
    },
  }))
  scope.provide('clientRuntime', {
    async prepare() {
      ctx.reflect.provide('mygoPlatform', Object.freeze({ modules: Object.freeze(staticModules) }))
      const bootstrapUrl = '/mygo-boot/bootstrap.js'
      await import(/* @vite-ignore */ bootstrapUrl)
      await globalThis.__DSH_BOOT_READY__?.promise
      const facade = globalThis.__ModuleLoader__
      if (!facade) throw Error('web boot: window.__ModuleLoader__ bootstrap facade is missing')
      const transport = globalThis.__DSH_TRANSPORT__
      modules = facade.create({
        boot: globalThis.__DSH_BOOT__, staticModules,
        ...(transport?.loadBundle ? { loadBundle: transport.loadBundle } : {}),
        ...(transport?.resolveAsset ? { resolveAsset: transport.resolveAsset } : {}),
      })
      const manifest = modules.manifest
      const configured = [...(configuration.bootstrap ?? []), ...configuration.entries]
      const releaseBoundary = protectLocalEntryModules(modules, [...configured.map(entry => entry.name), diagnosticName])
      scope.effect(() => releaseBoundary, 'mygo: local module ownership boundary')
      for (const { id, name } of configured) {
        if (manifest.modules.some(row => row.id === name) || id === 'mygo-single-client') throw Error(`Local startup identity conflicts with client entry: ${id} (${name})`)
      }
      page.setTotal(manifest.plugins.length + configuration.entries.filter(entry => !entry.disabled).length + 1)
      await Promise.all(manifest.plugins.filter(row => row.immediately).map(row => modules.prefetch(row.id).catch(() => {})))
      // Original managed roster, attached to the base's existing Loader. Calling
      // bootClient here would install a Loader; the base already owns that step.
      ctx.loader.internal = modules
      scope.on('internal/status', fiber => {
        const entry = fiber.entry
        if (entry?.fiber && STATE_LABELS[entry.fiber.state] !== 'failed') page.setState(entry.options.name, STATE_LABELS[entry.fiber.state])
      })
      await modules.entries.start(ctx.loader, manifest)
      await ctx.loader.await()
      await assertEntriesActive(ctx, modules)
    },
    async mount() {
      await ctx.loader.create({ id: 'mygo-single-client', name: diagnosticName })
      await ctx.loader.await()
      await assertEntriesActive(ctx, modules)
      await mountClient(ctx, container)
    },
    fail(reason) { page.fail(reason instanceof Error ? reason.message : String(reason)) },
    dispose() { page.dispose() },
  })
}

import { FIBER_STATE as FiberState, STATE_LABELS } from '@deepseek-ai/dsh-client-web/src/loader-status.ts'
import { protectLocalEntryModules } from '../../local-entry-boundary.js'
import { assertEntriesActive } from '@deepseek-ai/dsh-client-web/src/boot-client.ts'
import { mountClient } from '@deepseek-ai/dsh-client-web/src/mount.ts'
import { BootPage } from '@deepseek-ai/dsh-client-web/src/boot-page.ts'
import { installInstanceRoute, partitionRemoteStorage } from '../../instance-route.js'
import '@deepseek-ai/dsh-client-web/src/base.css'
import '@deepseek-ai/dsh-client-ui-theme/brand-font.css'

// Local harness integration; never creates a Context or installs another Loader.
export const inject = ['clientHost', 'loader']
export function apply(scope) {
  installInstanceRoute()
  const { root: ctx, container, configuration, modules: staticModules, localEntries } = scope.clientHost
  const bootContainer = document.createElement('div')
  const page = new BootPage(bootContainer)
  let modules
  ctx.reflect.provide('mygoPlatform', Object.freeze({ modules: staticModules }))
  ctx.provide('mygoStartup', Object.freeze({
    configuration, FiberState,
    ownsEntry: entry => localEntries.has(entry),
    async admit() {
      const response = await fetch('/mygo-local/admission', { cache: 'no-store', credentials: 'same-origin' })
      if (!response.ok) {
        const detail = (await response.text()).trim()
        throw Error(detail || (response.status === 401 ? 'Sign in to this instance' : response.status === 403 ? 'This instance refused access' : 'The selected instance is unavailable'))
      }
    },
  }))
  if (!configuration.selectedInstance) return
  scope.provide('clientRuntime', {
    async prepare() {
      const bootstrapUrl = '/mygo-boot/bootstrap.js'
      await import(/* @vite-ignore */ bootstrapUrl)
      await globalThis.__DSH_BOOT_READY__?.promise
      const selected = configuration.selectedInstance
      Object.defineProperty(window, 'localStorage', { configurable: true,
        value: partitionRemoteStorage(localStorage, [selected.address, selected.id, selected.authenticationViewId]) })
      Object.defineProperty(window, 'sessionStorage', { configurable: true,
        value: partitionRemoteStorage(sessionStorage, [selected.address, selected.id, selected.authenticationViewId]) })
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
      const releaseBoundary = protectLocalEntryModules(modules, configured.map(entry => entry.name))
      scope.effect(() => releaseBoundary, 'mygo: local module ownership boundary')
      for (const { id, name } of configured) {
        if (manifest.modules.some(row => row.id === name) || id === 'mygo-single-client') throw Error(`Local startup identity conflicts with client entry: ${id} (${name})`)
      }
      page.setTotal(manifest.plugins.length + configuration.entries.filter(entry => !entry.disabled).length)
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
      await assertEntriesActive(ctx, modules)
      ctx.localShell?.handoff()
      await mountClient(ctx, container)
    },
    recover(reason) {
      if (!ctx.localShell) return false
      ctx.localShell.showError(reason)
      return true
    },
    fail(reason) {
      page.fail(reason instanceof Error ? reason.message : String(reason))
      container.replaceChildren(bootContainer)
    },
    dispose() { page.dispose() },
  })
}

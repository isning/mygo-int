// Explicit migration entry for the pinned single-instance Web composition.
import { getStaticModules } from '@deepseek-ai/dsh-client-web'
import { bootClient, assertEntriesActive } from '../../.scratch/upstream/deepseek-harness/packages/client/web/src/boot-client.ts'
import { mountClient } from '../../.scratch/upstream/deepseek-harness/packages/client/web/src/mount.ts'
import { BootPage } from '../../.scratch/upstream/deepseek-harness/packages/client/web/src/boot-page.ts'
import { installWindowDragRecall } from '../../.scratch/upstream/deepseek-harness/packages/client/web/src/window-drag/recall.ts'
import '../../.scratch/upstream/deepseek-harness/packages/client/web/src/base.css'
import '@deepseek-ai/dsh-client-ui-theme/brand-font.css'

export async function startSingleClient() {
  const container = document.getElementById('root')
  if (!container) throw Error('mygo single client: missing #root')
  const page = new BootPage(container)
  const staticModules = getStaticModules()
  const { Context } = staticModules['@deepseek-ai/cordis']
  const React = staticModules.react
  const ctx = new Context()
  const localName = '@mygo/single-client-contribution'
  let stopDragRecall
  const dispose = async () => {
    stopDragRecall?.()
    await ctx.fiber.dispose()
    page.dispose()
  }
  addEventListener('pagehide', event => { if (!event.persisted) void dispose() })
  // This service belongs to the MYGO-created root, before official boot.
  ctx.reflect.provide('mygoMigration', Object.freeze({ label: 'MYGO supplied Context service' }))
  staticModules[localName] = {
    inject: ['slots', 'modules', 'mygoMigration'],
    async apply(scope) {
      const react = await scope.modules.import('react')
      const cordis = await scope.modules.import('@deepseek-ai/cordis')
      scope.slots.inject('shell.bottom', () => scope.slots.register({ name: 'shell.bottom' }, () => {
        const [label] = React.useState(scope.mygoMigration.label)
        const entries = [...scope.loader.entries()]
        return React.createElement('aside', {
          'data-mygo-shared-client': '',
          'data-local-active': String(entries.some(entry => entry.options.name === localName && entry.fiber?.state === 2)),
          'data-session-active': String(entries.some(entry => entry.options.name === '@deepseek-ai/dsh-client-ui-session' && entry.fiber?.state === 2)),
          'data-platform-singletons': String(react === React && cordis.Context === Context && scope instanceof Context && scope.modules === scope.loader.internal),
        }, label)
      }))
    },
  }
  try {
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
    page.setTotal(manifest.plugins.length + 1)
    await Promise.all(manifest.plugins.filter(row => row.immediately).map(row => modules.prefetch(row.id).catch(() => {})))
    await bootClient({ ctx, modules, manifest, onEntryState: (name, state) => {
      if (state !== 'failed') page.setState(name, state)
    } })
    // Use the same module seed and original Loader; Host ClientEntries retains
    // its own managed roster. Migrating the existing local entries is ticket 48.
    await ctx.loader.create({ id: 'mygo-single-client', name: localName })
    await ctx.loader.await()
    await assertEntriesActive(ctx, modules)
    stopDragRecall = installWindowDragRecall({ document: container.ownerDocument })
    await mountClient(ctx, container)
  } catch (reason) {
    console.error(reason)
    await ctx.fiber.dispose()
    page.fail(reason instanceof Error ? reason.message : String(reason))
  }
}

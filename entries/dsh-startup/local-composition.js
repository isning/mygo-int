import { createEntryOwnership } from './entry-ownership.js'
// Platform mechanism only: the selected plugins own their presentation and semantics.
export async function startLocalComposition({ Context, Loader, FiberState, staticModules }) {
  const ctx = new Context()
  try {
    const response = await fetch('/mygo-local/startup.json', { cache: 'no-store' })
    if (!response.ok) throw new Error(`Local startup configuration HTTP ${response.status}`)
    const configuration = await response.json()
    const ownership = createEntryOwnership()
    // The same Cordis class and platform objects used by AppWebEntry, in a separate tree.
    ctx.reflect.provide('mygoPlatform', Object.freeze({ modules: Object.freeze(staticModules) }))
    await ctx.plugin(Loader, { baseUrl: new URL('/mygo-local/', location.href).href })
    const localEntries = ownership.attach(ctx.loader, { kind: 'local' })
    for (const entry of configuration.entries) await ctx.loader.create(entry)
    await ctx.loader.await()
    for (const entry of ctx.loader.entries()) {
      if (entry.disabled) continue
      if (entry.fiber?.state !== FiberState.ACTIVE) {
        await entry.fiber?.await()
        throw new Error(`Local startup entry did not activate: ${entry.options.id}`)
      }
    }
    const dispose = () => ctx.fiber.dispose()
    addEventListener('pagehide', event => { if (!event.persisted) void dispose() })
    return { ctx, dispose, ownership, localEntries, selectedInstance: configuration.selectedInstance }
  } catch (error) {
    await ctx.fiber.dispose()
    const report = document.createElement('pre')
    report.textContent = `Local startup failed: ${error.message}`
    document.body.append(report)
    throw error
  }
}

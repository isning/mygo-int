// Platform-neutral Cordis composition. Harness behavior is supplied by plugins.
export async function startClient({ Context, Loader, modules, container, readConfiguration, importLocal }) {
  const ctx = new Context()
  const localEntries = new Set()
  let runtime
  const dispose = async () => {
    await ctx.fiber.dispose()
    localEntries.clear()
    runtime?.dispose?.()
  }
  addEventListener('pagehide', event => { if (!event.persisted) void dispose() })
  try {
    const configuration = await readConfiguration()
    for (const { name } of [...(configuration.bootstrap ?? []), ...configuration.entries]) {
      if (!Object.hasOwn(modules, name)) modules[name] = await importLocal(name)
    }
    await ctx.plugin(Loader)
    ctx.loader.internal = {
      async import(name) {
        if (!Object.hasOwn(modules, name)) throw Error(`Unknown local module: ${name}`)
        return modules[name]
      },
    }
    ctx.provide('clientHost', Object.freeze({ root: ctx, container, configuration, modules, localEntries }))
    for (const options of configuration.bootstrap ?? []) await ctx.loader.create(options)
    await ctx.loader.await()
    for (const options of configuration.bootstrap ?? []) {
      const entry = ctx.loader.resolve(options.id)
      if (entry.disabled || entry.fiber?.state !== 2) throw Error(`Bootstrap plugin did not activate: ${options.id}`)
    }
    runtime = ctx.clientRuntime
    await runtime?.prepare?.()
    for (const options of configuration.entries) {
      if ([...ctx.loader.entries()].some(entry => entry.options.id === options.id)) throw Error(`Local startup Entry id already exists: ${options.id}`)
      const desired = await ctx.waterfall('mygo/startup-entry', options, () => options)
      await ctx.loader.create(desired)
      localEntries.add(ctx.loader.resolve(options.id))
    }
    await ctx.loader.await()
    for (const entry of localEntries) {
      if (entry.disabled || entry.fiber?.state === 2) continue
      await ctx.serial('mygo/startup-failed', entry)
    }
    const failures = []
    for (const entry of localEntries) {
      if (entry.disabled || entry.fiber?.state === 2) continue
      let reason = 'inactive or missing dependency'
      if (entry.fiber?.state === 3) {
        try { await entry.fiber.await() } catch (error) { reason = String(error) }
      }
      failures.push(`${entry.options.id}: ${reason}`)
    }
    if (failures.length) throw Error(`Local startup entries did not activate\n${failures.join('\n')}`)
    await runtime?.mount?.()
    return ctx
  } catch (reason) {
    console.error(reason)
    await ctx.fiber.dispose()
    if (runtime?.fail) runtime.fail(reason)
    else container.textContent = `Client startup failed: ${reason instanceof Error ? reason.message : String(reason)}`
  }
}

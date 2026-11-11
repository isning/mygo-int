import test from 'node:test'
import assert from 'node:assert/strict'
import { Context } from '../../.scratch/upstream/deepseek-harness/vendor/cordis/lib/index.js'
import Loader from '../../.scratch/upstream/deepseek-harness/vendor/loader/lib/index.js'
import { startClient } from '../../entries/dsh-startup/client-base.js'

// The actual Cordis and Loader, with only the browser's page lifecycle stubbed.
globalThis.addEventListener = () => {}

test('base starts an empty Cordis composition without DSH or a renderer', async () => {
  const ctx = await startClient({ Context, Loader, modules: {}, container: {},
    readConfiguration: async () => ({ entries: [] }), importLocal: async () => { throw Error('Unexpected import') } })
  assert.ok(ctx instanceof Context)
  assert.equal([...ctx.loader.entries()].length, 0)
  await ctx.fiber.dispose()
})

test('bootstrap plugin and local features share the base Context/Loader and dispose normally', async () => {
  const events = []
  let loaderCount = 0
  class CountedLoader extends Loader { constructor(...args) { super(...args); loaderCount++ } }
  const modules = {
    './plugins/integration.js': { inject: ['clientHost', 'loader'], apply(scope) {
      assert.equal([...scope.loader.entries()].length, 1)
      scope.provide('clientRuntime', {
        prepare() { events.push('prepare') },
        mount() { events.push('mount') },
      })
      scope.effect(() => () => events.push('disposed'))
    } },
    './plugins/feature.js': { inject: ['clientHost', 'loader'], apply(scope) {
      assert.equal([...scope.loader.entries()].some(entry => entry.options.id === 'integration'), true)
      events.push('feature')
    } },
  }
  const ctx = await startClient({ Context, Loader: CountedLoader, modules, container: {},
    readConfiguration: async () => ({ bootstrap: [{ id: 'integration', name: './plugins/integration.js' }], entries: [{ id: 'feature', name: './plugins/feature.js' }] }),
    importLocal: async () => { throw Error('Unexpected import') } })
  assert.ok(ctx)
  assert.equal(loaderCount, 1)
  assert.deepEqual(events, ['prepare', 'feature', 'mount'])
  assert.equal([...ctx.loader.entries()].length, 2)
  await ctx.fiber.dispose()
  assert.deepEqual(events, ['prepare', 'feature', 'mount', 'disposed'])
})

test('override mode selects a module for a remote entry without activating another local entry', async () => {
  let applications = 0
  const modules = {
    './plugins/instance.js': { inject: ['clientHost'], apply(scope) {
      scope.provide('clientRuntime', {
        prepare: () => scope.clientHost.root.loader.create({ id: 'remote-feature', name: '@remote/feature' }),
      })
    } },
    './plugins/replacement.js': { apply() { applications++ } },
  }
  const configuration = { bootstrap: [
    { id: 'instance', name: './plugins/instance.js' },
    { id: 'replacement', name: './plugins/replacement.js', mode: 'override', target: '@remote/feature' },
  ], entries: [] }
  const ctx = await startClient({ Context, Loader, modules, container: {}, readConfiguration: async () => configuration })
  assert.ok(ctx)
  assert.equal(applications, 1)
  assert.deepEqual([...ctx.loader.entries()].map(entry => entry.options.id).sort(), ['instance', 'remote-feature'])
  assert.equal(modules['@remote/feature'], modules['@remote/feature/client'])
  await ctx.fiber.dispose()
})

test('recoverable instance failure retains the local runtime rather than disposing the Context', async () => {
  let recovered = false, disposed = false
  const modules = { './plugins/instance.js': { apply(scope) {
    scope.effect(() => () => { disposed = true })
    scope.provide('clientRuntime', { prepare() { throw Error('Instance unavailable') }, recover() { recovered = true } })
  } } }
  const ctx = await startClient({ Context, Loader, modules, container: {}, readConfiguration: async () => ({ bootstrap: [{ id: 'instance', name: './plugins/instance.js' }], entries: [] }) })
  assert.ok(ctx)
  assert.equal(recovered, true)
  assert.equal(disposed, false)
  await ctx.fiber.dispose()
  assert.equal(disposed, true)
})

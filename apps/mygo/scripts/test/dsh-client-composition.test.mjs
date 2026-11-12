import test from 'node:test'
import assert from 'node:assert/strict'
import { apply } from '../../local/plugins/client-composition.js'

function fixture(t) {
  const original = { id: 'configurable', name: './plugins/configurable.js', config: { color: 'blue', nested: { count: 1 } } }
  const entry = {
    id: 'configurable', disabled: false, options: structuredClone(original),
    fiber: { state: 2, inject: {}, await: async () => {} }, parent: { ctx: { fiber: {} } },
  }
  let saved = { revision: 0, base: null, overrides: {} }, service
  t.mock.method(globalThis, 'fetch', async (_url, options = {}) => {
    if (!options.method) return { ok: true, json: async () => structuredClone(saved) }
    const request = JSON.parse(options.body)
    assert.equal(request.expectedRevision, saved.revision)
    saved = { revision: saved.revision + 1, base: JSON.stringify([original]), overrides: request.overrides }
    return { ok: true, json: async () => structuredClone(saved) }
  })
  const listeners = new Map()
  const ctx = {
    mygoStartup: {
      configuration: { entries: [original] }, FiberState: { ACTIVE: 2, FAILED: 3 }, ownsEntry: value => value === entry,
    },
    loader: {
      entries: () => [entry], resolve: id => { assert.equal(id, entry.id); return entry },
      async update(_id, patch) {
        entry.options = { ...entry.options, ...structuredClone(patch) }
        entry.disabled = Boolean(entry.options.disabled)
      },
      await: async () => {},
    },
    provide(name, value) { assert.equal(name, 'clientComposition'); service = value },
    on(name, callback) { listeners.set(name, callback); return () => listeners.delete(name) },
  }
  return apply(ctx).then(() => ({ service, entry, getSaved: () => saved }))
}

test('local config form uses the official snapshot and mutation contract', async t => {
  const { service, entry, getSaved } = await fixture(t)
  const form = service.configForm('configurable')
  assert.deepEqual(form.getSnapshot(), {
    status: 'ready', value: { color: 'blue', nested: { count: 1 } },
    base: { color: 'blue', nested: { count: 1 } }, user: undefined, revision: 0, writable: true,
  })
  assert.equal(form.getSnapshot(), form.getSnapshot(), 'external-store snapshots stay referentially stable')

  assert.equal(await form.mutate([
    { op: 'set', path: ['color'], value: 'green' },
    { op: 'set', path: ['nested', 'count'], value: 2 },
  ], 0), true)
  assert.deepEqual(entry.options.config, { color: 'green', nested: { count: 2 } })
  assert.deepEqual(getSaved().overrides.configurable.config, entry.options.config)
  assert.equal(form.getSnapshot().revision, 1)
  assert.deepEqual(form.getSnapshot().user, entry.options.config)
  assert.equal(await form.mutate([{ op: 'set', path: ['color'], value: 'stale' }], 0), false)

  assert.equal(await form.unset('color'), true)
  assert.deepEqual(entry.options.config, { nested: { count: 2 } })
  await assert.rejects(form.mutate([{ op: 'set', path: ['__proto__', 'polluted'], value: true }]), /Invalid local configuration operation/)
  await assert.rejects(form.mutate([{ op: 'set', path: ['nested', 'count', 'invalid'], value: true }]), /not an object/)
})

test('unknown entries do not expose a writable local config form', async t => {
  const { service } = await fixture(t)
  assert.equal(service.configForm('missing'), undefined)
})

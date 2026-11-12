import test from 'node:test'
import assert from 'node:assert/strict'
import { validateLocalStartup as validate, readLocalStartup } from '../dsh-local-startup-config.mjs'
const selectedInstance = { id: 'test-instance', authenticationViewId: 'owner' }
const validateLocalStartup = value => validate({ selectedInstance, ...value })

test('the shipped composition is local-only and starts without an instance', async () => {
  const config = await readLocalStartup(process.cwd(), 'apps/mygo/local/single-root.json')
  assert.equal(config.selectedInstance, undefined)
  assert.ok(config.bootstrap.length > 0)
  assert.ok(config.entries.length > 0)
  assert.ok([...config.bootstrap, ...config.entries].every(entry => entry.name.startsWith('./plugins/')))
})

test('startup rejects remote entries, traversal, duplicate ids and unsupported schema', () => {
  const valid = { id: 'touch', name: './plugins/touch-feedback.js' }
  for (const name of ['https://remote.invalid/plugin.js', '../plugins/touch-feedback.js', './plugins/../touch-feedback.js', './plugins/touch-feedback.js?remote=1']) {
    assert.throws(() => validateLocalStartup({ schemaVersion: 1, entries: [{ ...valid, name }] }))
  }
  assert.throws(() => validateLocalStartup({ schemaVersion: 1, entries: [valid, valid] }))
  assert.throws(() => validateLocalStartup({ schemaVersion: 2, entries: [] }))
})

test('instance and authentication view are explicit local identities, not endpoint URLs', () => {
  assert.equal(validate({ schemaVersion: 1, entries: [], selectedInstance: undefined }).selectedInstance, undefined)
  for (const selectedInstance of [{}, { id: 'https://host.invalid', authenticationViewId: 'owner' }, { id: 'test' }]) {
    assert.throws(() => validate({ schemaVersion: 1, entries: [], selectedInstance }))
  }
})


test('bootstrap plugins use original Entry options and cannot collide with feature entries', () => {
  const bootstrap = [{ id: 'instance', name: './plugins/dsh-instance.js' }]
  const value = validateLocalStartup({ schemaVersion: 1, bootstrap, entries: [] })
  assert.deepEqual(value.bootstrap, bootstrap)
  assert.throws(() => validateLocalStartup({ schemaVersion: 1, bootstrap, entries: bootstrap }))
  assert.throws(() => validateLocalStartup({ schemaVersion: 1, bootstrap: [{ id: 'instance', name: 'https://remote.invalid/plugin.js' }], entries: [] }))
  assert.throws(() => validateLocalStartup({ schemaVersion: 1, bootstrap: {}, entries: [] }))
})


test('override application has an explicit package target and is limited to bootstrap descriptors', () => {
  const entry = { id: 'override', name: './plugins/replacement.js', mode: 'override', target: '@remote/feature' }
  assert.deepEqual(validateLocalStartup({ schemaVersion: 1, bootstrap: [entry], entries: [] }).bootstrap, [entry])
  for (const patch of [{ mode: 'unknown' }, { target: 'https://remote.invalid' }, { target: undefined }, { disabled: true }]) {
    assert.throws(() => validateLocalStartup({ schemaVersion: 1, bootstrap: [{ ...entry, ...patch }], entries: [] }))
  }
  assert.throws(() => validateLocalStartup({ schemaVersion: 1, entries: [entry] }))
})

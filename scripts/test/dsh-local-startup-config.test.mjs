import test from 'node:test'
import assert from 'node:assert/strict'
import { validateLocalStartup as validate, readLocalStartup, bindLocalStartup } from '../dsh-local-startup-config.mjs'
const selectedInstance = { id: 'test-instance', authenticationViewId: 'owner' }
const validateLocalStartup = value => validate({ selectedInstance, ...value })

test('deployment binds the instance to its remote origin without changing composition or carrying credentials', () => {
  const config = { schemaVersion: 1, selectedInstance, entries: [] }
  const bound = bindLocalStartup(config, 'http://127.0.0.1:40369/')
  assert.equal(bound.selectedInstance.address, 'http://127.0.0.1:40369')
  assert.deepEqual(config.selectedInstance, selectedInstance)
  assert.equal(bound.entries, config.entries)
  for (const address of ['http://user:secret@localhost:40369/', 'http://localhost/?token=private', 'http://localhost/path', 'file:///tmp/test']) {
    assert.throws(() => bindLocalStartup(config, address))
  }
})

test('local composition selects distinct Loader entries without changing the base', async () => {
  const first = await readLocalStartup(process.cwd(), 'entries/dsh-startup/local/startup.json')
  const second = await readLocalStartup(process.cwd(), 'entries/dsh-startup/local/alternate.json')
  const firstShell = first.entries.find(entry => entry.id === 'local-shell')
  const secondShell = second.entries.find(entry => entry.id === 'local-shell')
  assert.notEqual(firstShell.name, secondShell.name)
  assert.notEqual(firstShell.config.label, secondShell.config.label)
  assert.deepEqual(validateLocalStartup({ schemaVersion: 1, entries: [] }).entries, [])
})

test('startup rejects remote entries, traversal, duplicate ids and unsupported schema', () => {
  const valid = { id: 'marker', name: './plugins/marker.js' }
  for (const name of ['https://remote.invalid/plugin.js', '../plugins/marker.js', './plugins/../marker.js', './plugins/marker.js?remote=1']) {
    assert.throws(() => validateLocalStartup({ schemaVersion: 1, entries: [{ ...valid, name }] }))
  }
  assert.throws(() => validateLocalStartup({ schemaVersion: 1, entries: [valid, valid] }))
  assert.throws(() => validateLocalStartup({ schemaVersion: 2, entries: [] }))
})

test('instance and authentication view are explicit local identities, not endpoint URLs', () => {
  for (const selectedInstance of [undefined, {}, { id: 'https://host.invalid', authenticationViewId: 'owner' }, { id: 'test' }]) {
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

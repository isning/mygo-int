import test from 'node:test'
import assert from 'node:assert/strict'
import { validateLocalStartup, readLocalStartup } from '../dsh-local-startup-config.mjs'

test('local composition selects distinct Loader entries without changing the base', async () => {
  const first = await readLocalStartup(process.cwd(), 'entries/dsh-startup/local/startup.json')
  const second = await readLocalStartup(process.cwd(), 'entries/dsh-startup/local/alternate.json')
  assert.notEqual(first.entries[0].name, second.entries[0].name)
  assert.notEqual(first.entries[0].config.label, second.entries[0].config.label)
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

import test from 'node:test'
import assert from 'node:assert/strict'
import { apply } from '../../entries/dsh-startup/local/plugins/instance-manager.js'

function fixture(t) {
  const values = new Map()
  for (const [key, value] of Object.entries({
    location: { origin: 'http://mygo.test:4224' },
    localStorage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) },
  })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key)
    Object.defineProperty(globalThis, key, { value, configurable: true })
    t.after(() => previous ? Object.defineProperty(globalThis, key, previous) : delete globalThis[key])
  }
  const key = 'mygo.instances.v1:http://mygo.test:4224:seed:owner'
  const start = (address = 'http://127.0.0.1:4001') => {
    let service
    apply({
      mygoStartup: { configuration: { selectedInstance: { id: 'seed', address, authenticationViewId: 'owner' } }, admit: async () => {} },
      provide(name, value) { assert.equal(name, 'instanceManager'); service = value },
    })
    return service
  }
  return { values, key, start }
}

test('seed and added profiles are equally editable; changed profiles do not masquerade as the running connection', async t => {
  const { start, values, key } = fixture(t)
  let service = start()
  const seed = service.snapshot().catalog[0]
  assert.equal(service.isConnectedProfile(seed), true)
  const edited = { ...seed, name: 'Personal DSH', address: 'https://personal.example' }
  await service.save(edited, seed.id)
  assert.equal(service.isConnectedProfile(service.snapshot().catalog[0]), false)
  assert.equal(service.snapshot().connectedProfile.address, seed.address)
  await service.save({ ...edited, id: 'other', name: 'Other DSH' })
  assert.equal(JSON.parse(values.get(key)).version, 2)
  service = start('http://127.0.0.1:4002')
  assert.equal(service.snapshot().catalog.find(row => row.id === seed.id).address, edited.address)
  assert.equal(service.snapshot().catalog.find(row => row.id === 'other').address, edited.address)
  assert.equal(service.snapshot().catalog.find(row => row.id === seed.id).name, edited.name)
})

test('legacy addresses migrate, but subsequent explicit edits survive reload and deployment changes', async t => {
  const { start, values, key } = fixture(t)
  values.set(key, JSON.stringify({ version: 1, revision: 7, selectedId: 'seed', catalog: [
    { id: 'seed', name: 'Renamed', address: location.origin, authenticationViewId: 'owner' },
  ] }))
  let service = start()
  assert.equal(service.snapshot().catalog[0].address, 'http://127.0.0.1:4001')
  await service.select('seed')
  service = start('http://127.0.0.1:4002')
  assert.equal(service.snapshot().catalog[0].address, 'http://127.0.0.1:4002')
  await service.save({ ...service.snapshot().catalog[0], address: location.origin }, 'seed')
  service = start('http://127.0.0.1:4003')
  assert.equal(service.snapshot().catalog[0].address, location.origin)
  assert.equal(service.snapshot().catalog[0].name, 'Renamed')
  assert.equal(service.isConnectedProfile(service.snapshot().catalog[0]), false)
})

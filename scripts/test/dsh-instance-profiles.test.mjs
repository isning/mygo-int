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
  const key = 'mygo.instances.v2:http://mygo.test:4224'
  const start = (address = 'http://127.0.0.1:4001') => {
    let service
    apply({
      mygoStartup: { configuration: { selectedInstance: { id: 'first', address, authenticationViewId: 'owner' } }, admit: async () => {} },
      provide(name, value) { assert.equal(name, 'instanceManager'); service = value },
    })
    return service
  }
  return { values, key, start }
}

test('connected and added profiles are equally editable; changed profiles do not masquerade as the running connection', async t => {
  const { start, values, key } = fixture(t)
  let service = start()
  const connected = service.snapshot().catalog[0]
  assert.equal(service.isConnectedProfile(connected), true)
  const edited = { ...connected, name: 'Personal DSH', address: 'https://personal.example' }
  await service.save(edited, connected.id)
  assert.equal(service.isConnectedProfile(service.snapshot().catalog[0]), false)
  assert.equal(service.snapshot().connectedProfile.address, connected.address)
  await service.save({ ...edited, id: 'other', name: 'Other DSH' })
  assert.equal(JSON.parse(values.get(key)).version, 2)
  service = start(location.origin)
  assert.equal(service.snapshot().catalog.find(row => row.id === connected.id).address, edited.address)
  assert.equal(service.snapshot().catalog.find(row => row.id === 'other').address, edited.address)
  assert.equal(service.snapshot().catalog.find(row => row.id === connected.id).name, edited.name)
})

test('explicit profile edits survive reload', async t => {
  const { start } = fixture(t)
  let service = start()
  await service.save({ ...service.snapshot().catalog[0], name: 'Renamed', address: location.origin }, 'first')
  service = start(location.origin)
  assert.equal(service.snapshot().catalog.find(row => row.id === 'first').address, location.origin)
  assert.equal(service.snapshot().catalog.find(row => row.id === 'first').name, 'Renamed')
  assert.equal(service.snapshot().catalog.some(row => service.isConnectedProfile(row)), true)
})

test('select registers an explicit route before navigation; refusal leaves current connection unchanged', async t => {
  const { start } = fixture(t)
  const navigations = []
  location.assign = url => navigations.push(url)
  const service = start()
  const other = { ...service.snapshot().catalog[0], id: 'other', name: 'Other', address: 'https://other.example' }
  await service.save(other)
  const path = '/mygo-instance/' + 'a'.repeat(64) + '/'
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/mygo-local/connection')
    assert.deepEqual(JSON.parse(options.body), other)
    return { ok: true, json: async () => ({ url: path }) }
  })
  await service.select('other')
  assert.deepEqual(navigations, [path])
  assert.equal(service.snapshot().connectedProfile.id, 'first')
  t.mock.method(globalThis, 'fetch', async () => ({ ok: false, status: 403 }))
  await assert.rejects(service.select('other'), /HTTP 403/)
  assert.deepEqual(navigations, [path])
})

test('removing a saved instance deletes its route and keeps the connected instance', async t => {
  const { start } = fixture(t)
  const service = start()
  const connected = service.snapshot().connectedProfile
  const other = { ...connected, id: 'other', name: 'Other', address: 'https://other.example' }
  await service.save(other)
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/mygo-local/connection')
    assert.equal(options.method, 'DELETE')
    assert.deepEqual(JSON.parse(options.body), other)
    return { ok: true, status: 204 }
  })
  await service.remove('other')
  assert.deepEqual(service.snapshot().catalog, [connected])
  await assert.rejects(service.remove(connected.id), /connected instance/)
})

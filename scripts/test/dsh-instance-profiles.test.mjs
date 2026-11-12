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
  const start = (address = 'http://127.0.0.1:4001', admit = async () => {}) => {
    let service
    const selectedInstance = address === null ? undefined : { id: 'first', address, authenticationViewId: 'owner' }
    apply({
      mygoStartup: { configuration: { selectedInstance }, admit },
      provide(name, value) { assert.equal(name, 'instanceManager'); service = value },
    })
    return service
  }
  return { values, key, start }
}

test('an empty client has no implicit instance and treats the first saved profile like every later profile', async t => {
  const { start, values, key } = fixture(t)
  const service = start(null)
  assert.deepEqual(service.snapshot().catalog, [])
  assert.equal(service.snapshot().currentProfile, null)
  assert.equal(service.snapshot().connectionStatus, 'idle')
  await service.save({ id: 'first', name: 'First', address: 'https://first.example', authenticationViewId: 'owner' })
  assert.equal(service.snapshot().catalog.length, 1)
  assert.equal(service.isCurrentProfile(service.snapshot().catalog[0]), false)
  assert.deepEqual(JSON.parse(values.get(key)), { version: 3, revision: 1, catalog: service.snapshot().catalog })
})

test('version 2 catalogs migrate without restoring the obsolete selected profile state', async t => {
  const { start, values, key } = fixture(t)
  const saved = {
    version: 2,
    revision: 4,
    selectedId: 'other',
    catalog: [
      { id: 'first', name: 'First', address: 'https://first.example', authenticationViewId: 'owner' },
      { id: 'other', name: 'Other', address: 'https://other.example', authenticationViewId: 'owner' },
    ],
  }
  values.set(key, JSON.stringify(saved))
  const service = start('https://first.example')
  assert.equal(service.snapshot().diagnostic, '')
  assert.deepEqual(service.snapshot().catalog, saved.catalog)
  assert.equal(service.snapshot().currentProfile.id, 'first')
  assert.equal('selectedId' in service.snapshot(), false)
  await service.save({ ...saved.catalog[1], name: 'Renamed' }, 'other')
  assert.deepEqual(JSON.parse(values.get(key)), {
    version: 3,
    revision: 5,
    catalog: [saved.catalog[0], { ...saved.catalog[1], name: 'Renamed' }],
  })
})

test('connection checks expose success and the original failure diagnostic', async t => {
  const { start } = fixture(t)
  let service = start()
  await service.refresh()
  assert.equal(service.snapshot().connectionStatus, 'authenticated')
  assert.equal(service.snapshot().connectionDiagnostic, '')

  service = start('http://127.0.0.1:4002', async () => { throw Error('index injections HTTP 502') })
  await service.refresh()
  assert.equal(service.snapshot().connectionStatus, 'unavailable')
  assert.equal(service.snapshot().connectionDiagnostic, 'index injections HTTP 502')
})

test('connected and added profiles are equally editable; changed profiles do not masquerade as the running connection', async t => {
  const { start, values, key } = fixture(t)
  let service = start()
  const connected = service.snapshot().catalog[0]
  assert.equal(service.isCurrentProfile(connected), true)
  const edited = { ...connected, name: 'Personal DSH', address: 'https://personal.example' }
  await service.save(edited, connected.id)
  assert.equal(service.isCurrentProfile(service.snapshot().catalog[0]), false)
  assert.equal(service.snapshot().currentProfile.address, connected.address)
  await service.save({ ...edited, id: 'other', name: 'Other DSH' })
  assert.equal(JSON.parse(values.get(key)).version, 3)
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
  assert.equal(service.snapshot().catalog.some(row => service.isCurrentProfile(row)), true)
})

test('select registers an explicit route before navigation; refusal leaves current connection unchanged', async t => {
  const { start, values, key } = fixture(t)
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
  assert.equal(service.snapshot().currentProfile.id, 'first')
  assert.equal(JSON.parse(values.get(key)).catalog.find(row => row.id === 'other').name, 'Other')
  t.mock.method(globalThis, 'fetch', async () => ({ ok: false, status: 403 }))
  await assert.rejects(service.select('other'), /HTTP 403/)
  assert.deepEqual(navigations, [path])
})

test('removing a saved instance deletes its route and keeps the connected instance', async t => {
  const { start } = fixture(t)
  const service = start()
  const connected = service.snapshot().currentProfile
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
  await assert.rejects(service.remove(connected.id), /current instance/)
})

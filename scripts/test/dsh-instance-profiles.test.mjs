import test from 'node:test'
import assert from 'node:assert/strict'
import { apply } from '../../entries/dsh-startup/local/plugins/instance-manager.js'

const first = { id: 'first', name: 'First', address: 'https://first.example', authenticationViewId: 'owner' }
const other = { id: 'other', name: 'Other', address: 'https://other.example', authenticationViewId: 'owner' }

function fixture(t, { selectedInstance, instances = [], admit = async () => {} } = {}) {
  const requests = [], navigations = []
  for (const [key, value] of Object.entries({
    location: { assign: url => navigations.push(url) },
    localStorage: new Proxy({}, { get() { throw Error('instance catalog must not use browser storage') } }),
  })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key)
    Object.defineProperty(globalThis, key, { value, configurable: true })
    t.after(() => previous ? Object.defineProperty(globalThis, key, previous) : delete globalThis[key])
  }
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    requests.push({ url, options, body: JSON.parse(options.body) })
    if (options.method === 'DELETE') return { ok: true, status: 204 }
    return { ok: true, json: async () => ({ url: '/mygo-instance/' + 'a'.repeat(64) + '/' }) }
  })
  let service
  apply({
    mygoStartup: { configuration: { selectedInstance, instances }, admit },
    provide(name, value) { assert.equal(name, 'instanceManager'); service = value },
  })
  return { service, requests, navigations }
}

test('the browser presents the reverse proxy catalog without local persistence', t => {
  const { service } = fixture(t, { instances: [first, other] })
  assert.deepEqual(service.snapshot().catalog, [first, other])
  assert.equal(service.snapshot().currentProfile, null)
  assert.equal(service.snapshot().connectionStatus, 'idle')
})

test('the current route is explicit and its admission result is observable', async t => {
  let { service } = fixture(t, { selectedInstance: first, instances: [first] })
  await service.refresh()
  assert.equal(service.isCurrentProfile(first), true)
  assert.equal(service.snapshot().connectionStatus, 'authenticated')

  ;({ service } = fixture(t, { selectedInstance: first, instances: [first], admit: async () => { throw Error('The selected instance is unavailable') } }))
  await service.refresh()
  assert.equal(service.snapshot().connectionStatus, 'unavailable')
  assert.equal(service.snapshot().connectionDiagnostic, 'The selected instance is unavailable')
})

test('saving an instance writes the mygo proxy catalog', async t => {
  const { service, requests, navigations } = fixture(t, { instances: [first] })
  await service.save(other)
  assert.deepEqual(service.snapshot().catalog, [first, other])
  assert.equal(requests.length, 1)
  assert.equal(requests[0].url, '/mygo-local/connection')
  assert.equal(requests[0].options.method, 'POST')
  assert.deepEqual(requests[0].body, other)

  const renamed = { ...other, name: 'Renamed' }
  await service.save(renamed, other)
  assert.deepEqual(service.snapshot().catalog, [first, renamed])
  assert.deepEqual(navigations, [], 'renaming a profile keeps its existing route')
})

test('selecting an instance registers its current profile and navigates to its route', async t => {
  const { service, requests, navigations } = fixture(t, { selectedInstance: first, instances: [first, other] })
  await service.select(other)
  assert.deepEqual(requests[0].body, other)
  assert.deepEqual(navigations, ['/mygo-instance/' + 'a'.repeat(64) + '/'])
  assert.equal(service.snapshot().currentProfile.id, first.id)

  const moved = { ...first, address: 'https://moved.example' }
  await service.save(moved, first)
  assert.deepEqual(requests[1].body, moved)
  assert.deepEqual(navigations, ['/mygo-instance/' + 'a'.repeat(64) + '/', '/mygo-instance/' + 'a'.repeat(64) + '/'],
    'editing the connected address navigates explicitly to its new route')
})

test('removing an instance deletes it from the proxy while protecting the current route', async t => {
  const { service, requests } = fixture(t, { selectedInstance: first, instances: [first, other] })
  await service.remove(other)
  assert.equal(requests[0].options.method, 'DELETE')
  assert.deepEqual(service.snapshot().catalog, [first])
  await assert.rejects(service.remove(first), /current instance/)
})

test('invalid server catalogs fail closed', t => {
  assert.throws(() => fixture(t, { instances: [{ ...first, address: 'file:///tmp/dsh' }] }), /HTTP\(S\) origin/)
  assert.throws(() => fixture(t, { instances: [first, { ...first }] }), /Invalid instance catalog/)
})

test('authentication views of one instance remain independent profiles', async t => {
  const restricted = { ...first, name: 'First restricted', address: 'https://restricted.example', authenticationViewId: 'restricted' }
  const { service, requests } = fixture(t, { instances: [first, restricted] })
  assert.deepEqual(service.snapshot().catalog, [first, restricted])
  await service.remove(restricted)
  assert.deepEqual(requests[0].body, restricted)
  assert.deepEqual(service.snapshot().catalog, [first])
})

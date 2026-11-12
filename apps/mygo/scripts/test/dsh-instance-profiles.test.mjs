import test from 'node:test'
import assert from 'node:assert/strict'
import { apply } from '../../local/plugins/instance-manager.js'

const first = { id: 'first', name: 'First', address: 'https://first.example', authenticationViewId: 'owner' }
const other = { id: 'other', name: 'Other', address: 'https://other.example', authenticationViewId: 'owner' }

function fixture(t, { selectedInstance, instances = [], admit = async () => {} } = {}) {
  const requests = [], navigations = [], contexts = new Map()
  for (const [key, value] of Object.entries({
    open: (url, target) => {
      if (contexts.has(target)) return contexts.get(target)
      const window = {
        location: { href: url || 'about:blank', replace(next) { window.url = next; window.location.href = new URL(next, 'http://mygo.local/').href; window.replacements++ } },
        focus() { window.focused = (window.focused ?? 0) + 1 }, url, replacements: 0,
      }
      contexts.set(target, window); navigations.push({ target, window }); return window
    },
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

test('selecting an instance preserves the current tree and opens a stable per-instance context', async t => {
  const { service, requests, navigations } = fixture(t, { selectedInstance: first, instances: [first, other] })
  await service.select(other)
  assert.deepEqual(requests[0].body, other)
  assert.deepEqual(navigations.map(({ target, window }) => ({ url: window.url, target, focused: window.focused })), [{
    url: '/mygo-instance/' + 'a'.repeat(64) + '/', target: 'mygo-instance-other-owner', focused: 1,
  }])
  assert.equal(service.snapshot().currentProfile.id, first.id)

  await service.select(first)
  assert.equal(navigations.length, 1, 'selecting the already-current instance never reloads its client tree')

  await service.select(other)
  assert.equal(navigations.length, 1, 'selecting an open instance reuses its named context')
  assert.equal(navigations[0].window.replacements, 1, 'an open instance at the same route is focused without reload')
  assert.equal(navigations[0].window.focused, 2)

  const moved = { ...first, address: 'https://moved.example' }
  await service.save(moved, first)
  assert.deepEqual(requests[2].body, moved)
  assert.deepEqual(navigations.at(-1).target, 'mygo-instance-first-owner')
  assert.equal(navigations.at(-1).window.url, '/mygo-instance/' + 'a'.repeat(64) + '/')
  assert.equal(navigations.length, 2, 'editing the connected address opens its replacement without destroying the current tree')
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

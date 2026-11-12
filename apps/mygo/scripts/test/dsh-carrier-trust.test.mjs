import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createCarrierTrust } from '../dsh-carrier-trust.mjs'
const publicOrigin = 'http://100.97.207.47:4181'
const request = (host, origin, site) => ({ socket: { localPort: 4181 }, headers: { host, origin, 'sec-fetch-site': site } })
test('explicit public origin and loopback admit matching HTTP and WebSocket requests', () => {
  const trust = createCarrierTrust({ publicOrigins: [publicOrigin] })
  for (const origin of [publicOrigin, 'http://127.0.0.1:4181']) {
    assert.ok(trust(request(new URL(origin).host)))
    assert.ok(trust(request(new URL(origin).host, origin, 'same-origin'), true))
  }
  for (const r of [
    request('evil.example:4181', publicOrigin), request('100.97.207.47:4181', 'http://evil.example'),
    request('100.97.207.47:4181', 'null'), request('100.97.207.47:4181', 'http://127.0.0.1:4181'),
    request('100.97.207.47:4181', publicOrigin, 'cross-site'),
  ]) assert.equal(trust(r), false)
  assert.equal(trust(request('100.97.207.47:4181'), true), false)
  assert.equal(createCarrierTrust()(request('100.97.207.47:4181', publicOrigin)), false)
})
test('configuration rejects ambiguous origins and credentials', () => {
  for (const origin of [publicOrigin+'/', publicOrigin+'/path', publicOrigin+'?x', 'http://user:secret@localhost', 'file:///tmp', '*']) {
    assert.throws(() => createCarrierTrust({ publicOrigins: [origin] }))
  }
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { createAuthenticatedEventsTransport } from '../dsh-events-transport.mjs'

class Socket extends EventEmitter {
  constructor(url, options) { super(); this.url = url; this.options = options; this.sent = [] }
  send(text) { this.sent.push(text) }
  close() { this.closed = true }
}
const options = { origin: 'http://127.0.0.1:1234', cookie: 'private=test', WebSocket: Socket }
test('credential capability is confined to the exact event socket and event frames', () => {
  for (const origin of ['https://127.0.0.1:1234', 'http://example.com', 'http://127.0.0.1:1234/path', 'http://user@127.0.0.1']) {
    assert.throws(() => createAuthenticatedEventsTransport({ ...options, origin }))
  }
  assert.throws(() => createAuthenticatedEventsTransport({ ...options, cookie: 'bad\r\nheader' }))
  const transport = createAuthenticatedEventsTransport(options)
  assert.equal(transport.ownsHost, false)
  for (const url of ['ws://127.0.0.1:1234/api/remote.mux?x=1', 'ws://elsewhere/api/remote.mux', 'ws://127.0.0.1:1234/api/other']) {
    assert.throws(() => transport.createWebSocket(url), /endpoint-denied/)
  }
  const socket = transport.createWebSocket('ws://127.0.0.1:1234/api/remote.mux')
  assert.deepEqual(socket.options.headers, { cookie: options.cookie, origin: options.origin })
  assert.equal(socket.options.followRedirects, false)
  const open = { type: 'open', streamId: 'test', endpoint: '$events', payload: { args: {} } }
  socket.send(JSON.stringify(open))
  socket.send(JSON.stringify({ type: 'cancel', streamId: 'test' }))
  for (const frame of [{ ...open, endpoint: 'sessions/watch' }, { ...open, payload: { args: { arbitrary: true } } }, { type: 'item', streamId: 'test', value: {} }]) {
    assert.throws(() => socket.send(JSON.stringify(frame)), /frame-denied/)
  }
  assert.equal(socket.sent.length, 2)
})
test('initial upgrade rejection reports safe HTTP status and settles the failed attempt', () => {
  const diagnostics = []
  const transport = createAuthenticatedEventsTransport({ ...options, onDiagnostic: value => diagnostics.push(value) })
  const socket = transport.createWebSocket('ws://127.0.0.1:1234/api/remote.mux')
  let resumed = false
  socket.emit('unexpected-response', {}, { statusCode: 401, resume() { resumed = true } })
  socket.emit('error', Object.assign(Error('could contain credentials'), { code: 'ECONNRESET' }))
  assert.equal(resumed, true)
  assert.equal(socket.closed, true)
  assert.deepEqual(diagnostics, [{ code: 'events-transport/upgrade-rejected', status: 401 }, { code: 'events-transport/socket-error', systemCode: 'ECONNRESET' }])
  assert.ok(!JSON.stringify(diagnostics).includes('private'))
})

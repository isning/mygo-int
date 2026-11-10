import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { allowedSessionCall, createSessionCarrier, loadOriginalSocketLibrary } from '../dsh-session-carrier.mjs'

test('session capability excludes writes, arbitrary fields, and non-session addresses', () => {
  assert.equal(allowedSessionCall('session/list', { args: { _request: {} } }), true)
  for (const endpoint of ['$events', 'session/control', 'workspace/follow', 'remoteAccess/follow']) assert.equal(allowedSessionCall(endpoint, { args: {} }, true), true)
  const request = { address: { kind: 'session', sessionId: 'fixture' }, activate: true, assistantStream: true }
  assert.equal(allowedSessionCall('session/follow', { args: { request } }, true), true)
  assert.equal(allowedSessionCall('session/follow', { args: { request: { ...request, maxMessages: 500, turnWindow: { minMessages: 50, minTurns: 2 } } } }, true), true)
  for (const endpoint of ['session/prompt', 'session/create', 'commands/execute', 'workspace/create', 'settings/describe']) assert.equal(allowedSessionCall(endpoint, { args: {} }, true), false)
  for (const change of [{ address: { kind: 'subagent', childSessionId: 'x' } }, { extra: true }, { maxMessages: 1001 }, { turnWindow: {} }]) assert.equal(allowedSessionCall('session/follow', { args: { request: { ...request, ...change } } }, true), false)
})

const promptRequest = {
  sessionId: 'owned-session', requestId: 'client-minted-request', mode: 'queue',
  content: [{ type: 'text', text: 'Reply with a short greeting. 你好。' }], clientTimeZone: 'Asia/Shanghai',
}

test('only bounded ordinary text submission is admitted over HTTP', () => {
  const allowed = request => allowedSessionCall('session/prompt', { args: { request } })
  assert.equal(allowed(promptRequest), true)
  const { clientTimeZone, ...withoutTimeZone } = promptRequest
  assert.equal(allowed(withoutTimeZone), true)
  assert.equal(allowed({ ...promptRequest, mode: 'steer' }), true)
  assert.equal(allowedSessionCall('session/prompt', { args: { request: promptRequest } }, true), false)
  for (const change of [
    { requestId: '' }, { sessionId: 's'.repeat(257) }, { mode: 'execute' },
    { address: { kind: 'subagent', childSessionId: 'child' } }, { extra: true },
    { clientTimeZone: 'x'.repeat(129) }, { content: [] },
    { content: [{ type: 'text', text: '   ' }] },
    { content: [{ type: 'text', text: 'x'.repeat(8193) }] },
    { content: Array.from({ length: 9 }, () => ({ type: 'text', text: 'x' })) },
    { content: [{ type: 'file', receiptId: 'file' }] },
    { content: [{ type: 'image', data: 'untrusted', mediaType: 'image/png' }] },
    { content: [{ type: 'text', text: 'x', extra: true }] }, { content: [null] },
  ]) assert.equal(allowed({ ...promptRequest, ...change }), false)
})

test('browser socket validates origin and frames and keeps the credential server-side', async () => {
  const { WebSocket, WebSocketServer } = loadOriginalSocketLibrary(process.cwd())
  const upstream = http.createServer()
  const wss = new WebSocketServer({ server: upstream })
  const seen = []
  wss.on('connection', (socket, req) => {
    seen.push({ cookie: req.headers.cookie, origin: req.headers.origin })
    socket.on('message', (bytes, binary) => { seen.push({ frame: JSON.parse(bytes), binary }); socket.send(bytes, { binary: false }) })
  })
  await new Promise(r => upstream.listen(0, '127.0.0.1', r))
  const origin = `http://127.0.0.1:${upstream.address().port}`
  const carrier = createSessionCarrier({ origin, cookie: 'owner=test-only', WebSocket, WebSocketServer })
  const local = http.createServer()
  local.on('upgrade', carrier.upgrade)
  await new Promise(r => local.listen(0, '127.0.0.1', r))
  const base = `http://127.0.0.1:${local.address().port}`
  let socket
  try {
    const denied = new WebSocket(base.replace('http:', 'ws:') + '/api/remote.mux', { origin: 'http://foreign.invalid' })
    denied.on('error', () => {})
    assert.equal(await new Promise(r => denied.on('unexpected-response', (_, response) => { r(response.statusCode); response.resume(); denied.close() })), 403)
    assert.equal(seen.length, 0)
    socket = new WebSocket(base.replace('http:', 'ws:') + '/api/remote.mux', { origin: base, headers: { cookie: 'browser=ignored' } })
    await new Promise((r, j) => { socket.once('open', r); socket.once('error', j) })
    const frame = { type: 'open', streamId: 'probe', endpoint: 'session/control', payload: { args: {} } }
    const echoed = new Promise(r => socket.once('message', bytes => r(JSON.parse(bytes))))
    socket.send(JSON.stringify(frame))
    assert.deepEqual(await echoed, frame)
    assert.deepEqual(seen[0], { cookie: 'owner=test-only', origin })
    assert.equal(seen[1].binary, false)
    const closed = new Promise(r => socket.once('close', r))
    socket.send(JSON.stringify({ ...frame, streamId: 'write', endpoint: 'session/prompt' }))
    assert.equal(await closed, 1008)
    assert.equal(seen.length, 2)
  } finally {
    socket?.close(); carrier.close(); wss.close()
    await new Promise(r => local.close(r)); await new Promise(r => upstream.close(r))
  }
})

test('session HTTP capability preserves original response and rejects malformed envelopes', async () => {
  const { WebSocket, WebSocketServer } = loadOriginalSocketLibrary(process.cwd())
  const seen = []
  const upstream = http.createServer(async (req, res) => {
    let body = ''; for await (const chunk of req) body += chunk
    seen.push({ body, cookie: req.headers.cookie, authorization: req.headers.authorization })
    res.writeHead(200, { 'content-type': 'application/json', 'set-cookie': 'upstream=private' }).end('{"original":true}')
  })
  await new Promise(r => upstream.listen(0, '127.0.0.1', r))
  const carrier = createSessionCarrier({ origin: `http://127.0.0.1:${upstream.address().port}`, cookie: 'owner=test', WebSocket, WebSocketServer })
  const local = http.createServer((req, res) => { void carrier.handle(req, res).then(handled => { if (!handled) res.writeHead(404).end() }) })
  await new Promise(r => local.listen(0, '127.0.0.1', r))
  const base = `http://127.0.0.1:${local.address().port}`
  const wire = { type: 'client-request', rpcId: 'probe', method: 'session/list', payload: { args: { _request: {} } } }
  const call = (body, headers = {}, path = '/api/session/list') => fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) })
  try {
    assert.equal((await call(wire, { origin: 'http://foreign.invalid' })).status, 403)
    assert.equal((await call({ ...wire, method: 'session/create' })).status, 400)
    assert.equal((await call({ ...wire, payload: { args: { _request: { cursor: 'extra' } } } })).status, 400)
    assert.equal((await call(wire, {}, '/api/session/list?extra=1')).status, 404)
    assert.equal(seen.length, 0)
    const result = await call(wire, { cookie: 'browser=ignored', authorization: 'Bearer ignored' })
    assert.equal(await result.text(), '{"original":true}')
    assert.equal(result.headers.get('set-cookie'), null)
    assert.deepEqual(seen, [{ body: JSON.stringify(wire), cookie: 'owner=test', authorization: undefined }])
  } finally {
    carrier.close(); await new Promise(r => local.close(r)); await new Promise(r => upstream.close(r))
  }
})

// Transport test doubles below prove byte preservation, never a real model reply.
test('prompt forwards original identity and receipts/errors once without retry', async () => {
  const { WebSocket, WebSocketServer } = loadOriginalSocketLibrary(process.cwd())
  const seen = []
  let reply = '{"type":"server-response","rpcId":"wire-id","result":{"ok":true,"value":{"accepted":true}}}'
  const upstream = http.createServer(async (req, res) => {
    let body = ''; for await (const chunk of req) body += chunk
    seen.push({ path: req.url, body, cookie: req.headers.cookie, authorization: req.headers.authorization })
    res.writeHead(200, { 'content-type': 'application/json', 'set-cookie': 'private=ignored' }).end(reply)
  })
  await new Promise(r => upstream.listen(0, '127.0.0.1', r))
  const carrier = createSessionCarrier({ origin: `http://127.0.0.1:${upstream.address().port}`, cookie: 'owner=test', WebSocket, WebSocketServer })
  const local = http.createServer((req, res) => { void carrier.handle(req, res).then(handled => { if (!handled) res.writeHead(404).end() }) })
  await new Promise(r => local.listen(0, '127.0.0.1', r))
  const base = `http://127.0.0.1:${local.address().port}`
  const wire = { type: 'client-request', rpcId: 'wire-id', method: 'session/prompt', payload: { args: { request: promptRequest } } }
  const body = JSON.stringify(wire, null, 2)
  const call = (value = body, path = '/api/session/prompt', headers = {}) => fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json', origin: base, cookie: 'browser=ignored', authorization: 'Bearer ignored', ...headers }, body: value })
  try {
    assert.equal((await call(body, '/api/session/prompt?extra=1')).status, 404)
    assert.equal((await call(body, undefined, { origin: 'http://foreign.invalid' })).status, 403)
    assert.equal((await call(JSON.stringify({ ...wire, method: 'session/create' }))).status, 400)
    assert.equal((await call(JSON.stringify({ ...wire, extra: true }))).status, 400)
    assert.equal((await call('x'.repeat(65537))).status, 413)
    assert.equal(seen.length, 0)
    for (const responseBody of [reply, '{"type":"server-response","rpcId":"wire-id","result":{"ok":false,"error":{"code":"session/agent-busy","message":"prompt rejected","details":{}}}}']) {
      reply = responseBody
      const response = await call()
      assert.equal(response.status, 200)
      assert.equal(response.headers.get('set-cookie'), null)
      assert.equal(response.headers.get('cache-control'), 'no-store')
      assert.equal(await response.text(), responseBody)
    }
    assert.deepEqual(seen, Array.from({ length: 2 }, () => ({ path: '/api/session/prompt', body, cookie: 'owner=test', authorization: undefined })))
  } finally {
    carrier.close(); await new Promise(r => local.close(r)); await new Promise(r => upstream.close(r))
  }
})

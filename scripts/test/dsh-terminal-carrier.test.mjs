import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { createTerminalReadCarrier, TERMINAL_SHELLS_RPC_PATH } from '../dsh-terminal-carrier.mjs'

test('shell discovery admits only exact generated Agent lookup and preserves upstream errors', async () => {
  const seen = []
  let upstreamStatus = 200
  const upstream = http.createServer(async (req, res) => {
    let body = ''; for await (const chunk of req) body += chunk
    seen.push({ url: req.url, headers: req.headers, body })
    res.writeHead(upstreamStatus, { 'content-type': 'application/json', 'set-cookie': 'private=never-forward' })
      .end(JSON.stringify({ type: 'server-response', rpcId: 'probe', result: { ok: false, error: { code: 'test/denied', message: 'original failure', details: {} } } }))
  })
  await new Promise(r => upstream.listen(0, '127.0.0.1', r))
  const origin = `http://127.0.0.1:${upstream.address().port}`
  const carrier = createTerminalReadCarrier({ origin, cookie: 'owner=private-test-value', publicOrigins: ['http://100.97.207.47:4185'] })
  const local = http.createServer((req, res) => { void carrier(req, res).then(handled => { if (!handled) res.writeHead(404).end() }) })
  await new Promise(r => local.listen(0, '127.0.0.1', r))
  const base = `http://127.0.0.1:${local.address().port}`
  const wire = { type: 'client-request', rpcId: 'probe', method: 'terminal/shells', payload: { args: { agentId: 'owned-session-1' } } }
  const call = (path = TERMINAL_SHELLS_RPC_PATH, headers = {}, body = wire, method = 'POST') => new Promise((resolve, reject) => {
    const req = http.request(base + path, { method, headers: { 'content-type': 'application/json', ...headers } }, res => {
      let text = ''; res.on('data', chunk => { text += chunk }); res.on('end', () => resolve({
        status: res.statusCode, headers: { get: key => res.headers[key] ?? null }, json: async () => JSON.parse(text),
      }))
    })
    req.on('error', reject); req.end(method === 'GET' ? undefined : JSON.stringify(body))
  })
  try {
    for (const headers of [{ host: 'evil.invalid' }, { origin: 'http://evil.invalid' }, { 'sec-fetch-site': 'cross-site' }, { host: '100.97.207.47:4186', origin: 'http://100.97.207.47:4186' }, { host: '100.97.207.47:4185', origin: base }]) {
      assert.equal((await call(undefined, headers)).status, 403)
    }
    for (const path of ['/api/terminal/create', '/api/terminal/environment', '/api/terminal/attach', '/api/terminal/retain', '/api/terminal/list', TERMINAL_SHELLS_RPC_PATH + '?url=http://evil.invalid', '/api/terminal/%73hells']) {
      assert.equal((await call(path)).status, 403)
    }
    assert.equal((await call(undefined, {}, wire, 'GET')).status, 405)
    assert.equal((await call(undefined, { 'content-type': 'text/plain' })).status, 415)
    for (const body of [{ ...wire, method: 'settings/mutate' }, { ...wire, payload: { args: { path: '/' } } }, { ...wire, token: 'extra' }, { ...wire, payload: { args: { agentId: '../external' } } }, { ...wire, payload: { args: { sessionId: 'owned-session-1' } } }, { ...wire, payload: { args: { agentId: 'owned-session-1', command: 'anything' } } }]) {
      assert.equal((await call(undefined, {}, body)).status, 400)
    }
    assert.equal((await call(undefined, {}, { ...wire, rpcId: 'x'.repeat(5000) })).status, 413)
    assert.equal(seen.length, 0)
    const result = await call(undefined, { cookie: 'browser=untrusted', authorization: 'Bearer untrusted', host: '100.97.207.47:4185', origin: 'http://100.97.207.47:4185' })
    assert.equal(result.status, 200)
    assert.equal(result.headers.get('set-cookie'), null)
    assert.equal(result.headers.get('cache-control'), 'no-store')
    assert.equal((await result.json()).result.error.code, 'test/denied')
    assert.equal(seen.length, 1)
    assert.equal(seen[0].url, TERMINAL_SHELLS_RPC_PATH)
    assert.equal(seen[0].headers.cookie, 'owner=private-test-value')
    assert.equal(seen[0].headers.authorization, undefined)
    assert.deepEqual(JSON.parse(seen[0].body), wire)
    upstreamStatus = 403
    const refused = await call()
    assert.equal(refused.status, 403, 'Host permission refusal status is preserved')
    assert.equal((await refused.json()).result.ok, false)
  } finally {
    await new Promise(r => local.close(r)); await new Promise(r => upstream.close(r))
  }
})

test('reject remote origins and header injection at capability construction', () => {
  for (const origin of ['https://example.com', 'http://localhost:1234', 'http://127.0.0.1:1234/path', 'http://u:p@127.0.0.1:1234']) {
    assert.throws(() => createTerminalReadCarrier({ origin, cookie: 'owner=value' }))
  }
  assert.throws(() => createTerminalReadCarrier({ origin: 'http://127.0.0.1:1234', cookie: 'x\r\ny' }))
})

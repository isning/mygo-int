import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createServer, request as httpRequest } from 'node:http'
import { once } from 'node:events'
import { allowedFileUploadTarget, createUploadCarrier, FILE_UPLOAD_PATH, MAX_UPLOAD_BYTES } from '../dsh-upload-carrier.mjs'

async function listen(server) { server.listen(0, '127.0.0.1'); await once(server, 'listening'); return `http://127.0.0.1:${server.address().port}` }
async function close(server) { server.closeAllConnections(); await new Promise(r => server.close(r)) }
test('only bounded original file upload targets, no images or aliases', () => {
  assert.ok(allowedFileUploadTarget(FILE_UPLOAD_PATH + '?sessionId=s&name=notes+%26+refs.txt'))
  assert.ok(allowedFileUploadTarget(FILE_UPLOAD_PATH + '?sessionId=s'))
  for (const query of ['', '?sessionId=', '?sessionId=s&sessionId=t', '?sessionId=s&name=a&name=b', '?sessionId=s&mediaType=image/png', '?sessionId=s&extra=x', '?sessionId=s&name=..%2Fa', '?sessionId=s#x', '?sessionId=' + 's'.repeat(257)]) assert.equal(allowedFileUploadTarget(FILE_UPLOAD_PATH + query), false, query)
  for (const origin of ['https://127.0.0.1', 'http://localhost', 'http://127.0.0.1/path', 'http://127.0.0.1?x=1', 'http://user@127.0.0.1']) assert.throws(() => createUploadCarrier({ origin, cookie: 'owner=private' }))
  assert.throws(() => createUploadCarrier({ origin: 'http://127.0.0.1', cookie: 'owner=x\r\nInjected: true' }))
})
test('preserve raw bytes and original receipts/failures; fence requests and never retry', async () => {
  const calls = []; let status = 200, body = '{"ok":true,"value":{"receiptId":"original","file":{"attachmentId":"sha256:original","bytes":4,"name":"x"}}}'
  const host = createServer(async (req, res) => { const chunks = []; for await (const c of req) chunks.push(c); calls.push({ url: req.url, headers: req.headers, bytes: Buffer.concat(chunks) }); res.writeHead(status, { 'content-type': 'application/json', 'set-cookie': 'private=hidden' }).end(body) })
  const origin = await listen(host)
  const handler = createUploadCarrier({ origin, cookie: 'owner=private' })
  const localServer = createServer(async (req, res) => { if (!await handler(req, res)) res.writeHead(404).end() })
  const local = await listen(localServer), path = FILE_UPLOAD_PATH + '?sessionId=s&name=x'
  const bytes = Buffer.from([0, 255, 13, 10])
  const send = (target = path, headers = {}, data = bytes, method = 'POST') => fetch(local + target, { method, headers: { origin: local, 'content-type': 'application/octet-stream', ...headers }, body: ['GET', 'HEAD'].includes(method) ? undefined : data })
  try {
    let result = await send(path, { cookie: 'browser=untrusted' }); assert.equal(result.status, 200); assert.equal(await result.text(), body); assert.equal(result.headers.get('set-cookie'), null); assert.equal(result.headers.get('cache-control'), 'no-store')
    assert.deepEqual(calls[0].bytes, bytes); assert.equal(calls[0].url, path); assert.equal(calls[0].headers.cookie, 'owner=private')
    body = '{"ok":false,"error":{"code":"session/not-found","message":"not attached","details":{"sessionId":"s"}}}'
    result = await send(); assert.equal(await result.text(), body)
    status = 401; body = 'Original admission refusal'; result = await send(); assert.equal(result.status, 401); assert.equal(await result.text(), body)
    assert.equal(calls.length, 3)
    for (const [target, headers, data, method, expected] of [
      [path, { origin: 'http://foreign.invalid' }, bytes, 'POST', 403],
      [path, { origin: '' }, bytes, 'POST', 403],
      [path, { 'sec-fetch-site': 'cross-site' }, bytes, 'POST', 403],
      [path, {}, undefined, 'GET', 405],
      [path, { 'content-type': 'application/json' }, bytes, 'POST', 415],
      [path + '&mediaType=image/png', {}, bytes, 'POST', 400],
      [path, {}, Buffer.alloc(MAX_UPLOAD_BYTES + 1), 'POST', 413],
    ]) assert.equal((await send(target, headers, data, method)).status, expected)
    const badHost = await new Promise((resolve, reject) => { const req = httpRequest(local + path, { method: 'POST', headers: { host: 'untrusted.invalid', origin: local, 'content-type': 'application/octet-stream' } }, res => { res.resume(); res.on('end', () => resolve(res.statusCode)) }); req.on('error', reject); req.end(bytes) })
    assert.equal(badHost, 403)
    const chunked = await new Promise((resolve, reject) => { const req = httpRequest(local + path, { method: 'POST', headers: { origin: local, 'content-type': 'application/octet-stream' } }, res => { res.resume(); res.on('end', () => resolve(res.statusCode)) }); req.on('error', reject); req.write(Buffer.alloc(MAX_UPLOAD_BYTES)); req.end(Buffer.from('x')) })
    assert.equal(chunked, 413); assert.equal(calls.length, 3)
    status = 302; body = ''; result = await send(); assert.equal(result.status, 502); assert.equal(calls.length, 4)
    assert.equal((await send('/api/session/prompt')).status, 404)
  } finally { await close(localServer); await close(host) }
})

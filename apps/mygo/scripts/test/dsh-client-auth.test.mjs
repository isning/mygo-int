import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createClientAuth } from '../dsh-client-auth.mjs'

test('private launch token creates the only accepted mygo session', async () => {
  const stateDirectory = await mkdtemp(join(tmpdir(), 'mygo-auth-'))
  const auth = await createClientAuth({ stateDirectory, origin: 'https://mygo.example' })
  const launch = new URL((await readFile(auth.launchFile, 'utf8')).trim())
  assert.equal(launch.origin, 'https://mygo.example')
  assert.ok(launch.searchParams.get('mygo-token'))
  assert.equal(auth.authenticated({ headers: {} }), false)

  let status, headers
  const response = { writeHead(value, next) { status = value; headers = next; return this }, end() {} }
  assert.equal(auth.exchange({ method: 'GET', url: launch.pathname + launch.search }, response), true)
  assert.equal(status, 303)
  assert.equal(headers.location, '/')
  assert.match(headers['set-cookie'], /HttpOnly; SameSite=Strict; Path=\/; Secure$/)
  const cookie = headers['set-cookie'].split(';', 1)[0]
  assert.equal(auth.authenticated({ headers: { cookie } }), true)
  assert.equal(auth.authenticated({ headers: { cookie: cookie + 'x' } }), false)
})

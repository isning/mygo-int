// Appended to the original launcher anchor by dsh-events-live-prepare.mjs.
let client, deniedClient, fixture, activeSocket, hostOrigin
const diagnostics = []
const deadline = (promise, label) => {
  let timer
  return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(Error('Timed out: ' + label)), 15000) })]).finally(() => clearTimeout(timer))
}
const waitGeneration = (connection, minimum) => deadline(new Promise(resolve => {
  const check = () => { const value = connection.generation.getSnapshot(); if (value?.id >= minimum) { off(); resolve(value) } }
  const off = connection.generation.subscribe(check)
  check()
}), 'original Connection ready generation ' + minimum)
try {
  const origin = hostOrigin = ctx.webServer.getOrigin()
  const login = await fetch(ctx.connection.authenticatedUrl(origin + '/'), { redirect: 'manual' })
  assert.equal(login.status, 303)
  const cookie = login.headers.getSetCookie().map(x => x.split(';')[0]).join('; ')
  const createClient = (credential, onDiagnostic) => {
    const target = new Context()
    registry.apply(target)
    const transport = createAuthenticatedEventsTransport({ origin, cookie: credential, WebSocket, onDiagnostic })
    installConnection(target, { interactions: 'answer', location: { hostname: 'target.invalid' }, transport: {
      ...transport,
      createWebSocket: url => {
        const socket = transport.createWebSocket(url)
        if (credential === cookie) activeSocket = socket
        return socket
      },
      // This proof receives notifications only; it grants no unary capability or interaction replies.
      fetch: () => { throw Error('events proof: unary HTTP unavailable') },
    } })
    assert.equal(target.connection.isLoopback, false)
    gateway.apply(target)
    return target
  }
  client = createClient(cookie, value => diagnostics.push(value))
  let resets = 0
  client.on('connection/reset', () => { resets++ })
  let received = 0
  let nextEvent
  client.remote.$on('commands/change', (...args) => { assert.deepEqual(args, []); received++; nextEvent?.() })
  const first = await waitGeneration(client.connection, 1)
  assert.equal(typeof first.host.home, 'string')
  const change = async name => {
    const delivered = deadline(new Promise(resolve => { nextEvent = resolve }), 'real commands/change')
    fixture = ctx.commands.register({ name, description: 'Issue 34 isolated event fixture', handler: async () => {} })
    await delivered
    nextEvent = undefined
    // The original Commands service emits on registration and removal. No manual emit or wire frame.
    const removed = deadline(new Promise(resolve => { nextEvent = resolve }), 'real command removal')
    fixture(); fixture = undefined
    await removed
    nextEvent = undefined
  }
  await change('mygo-issue34-event-probe')
  // Induce physical loss; the original Connection controller must recover automatically.
  activeSocket.close(4000, 'isolated recovery probe')
  const second = await waitGeneration(client.connection, 2)
  await change('mygo-issue34-recovered-probe')
  assert.ok(second.id > first.id)
  assert.ok(resets >= 2)
  assert.equal(received, 4)
  let reportDenied
  const rejected = deadline(new Promise(resolve => { reportDenied = resolve }), 'initial authentication diagnosis')
  deniedClient = createClient('invalid=credential', diagnostic => { if (diagnostic.code === 'events-transport/upgrade-rejected') reportDenied(diagnostic) })
  const denied = await rejected
  assert.equal(denied.status, 401)
  assert.equal(deniedClient.connection.generation.getSnapshot(), undefined)
  await deniedClient.fiber.dispose(); deniedClient = undefined
  Object.assign(result, { login: 303, event: 'commands/change', received, generations: [first.id, second.id], resets, isLoopback: false, denied, diagnostics })
} finally {
  fixture?.()
  try { await deniedClient?.fiber.dispose(); await client?.fiber.dispose() }
  finally { await shutdown.shutdown(0) }
}
// A fresh non-pooled request verifies the owned Host listener stopped.
await assert.rejects(new Promise((resolve, reject) => {
  const request = http.get(hostOrigin + '/', { agent: false }, resolve)
  request.on('error', reject)
}), { code: 'ECONNREFUSED' })
result.teardown = { connectionRefused: true }
writeFileSync(new URL('../events-result.json', import.meta.url), JSON.stringify(result, null, 2) + '\n', { mode: 0o600 })
process.exit(0)

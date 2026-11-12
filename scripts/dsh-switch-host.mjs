// Second real pinned Host for the instance-switch acceptance workflow.
// Run with the pinned Node command documented in dsh-default-client.md after the
// main test Host has prepared the anchor.
import { createRequire } from 'node:module'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

process.umask(0o077)
const root = process.cwd(), scratch = resolve('.scratch/test-dsh/second')
const anchor = resolve('.scratch/status-live/anchor')
const require = createRequire(anchor + '/package.json')
const { loadLayeredEnv } = await import(pathToFileURL(require.resolve('@deepseek-ai/dsh-app-boot')).href)
const { runProfile } = await import(pathToFileURL(anchor + '/lib/profile-boot.js'))
await mkdir(scratch, { recursive: true, mode: 0o700 })
process.env.DSH_HOME = scratch + '/home'
process.env.DSH_AGENTS_HOME = scratch + '/agents'
const { prepareTestModel } = await import(pathToFileURL(root + '/scripts/dsh-test-model.mjs').href)
const model = await prepareTestModel(scratch)
let boot
try {
  const log = console.log
  console.log = () => {}
  try {
    boot = await runProfile({ environment: loadLayeredEnv('dsh', scratch), profile: 'web',
      patchFiles: [root + '/packages/dsh-host-status/host.patch.yml', ...model.patchFiles],
      args: ['--host', '127.0.0.1', '--port', '0', '--no-open'] })
  } finally { console.log = log }
  const { ctx, shutdown } = boot
  let stopping = false
  const stop = async () => {
    if (stopping) return
    stopping = true
    await shutdown.shutdown(0)
    await model.close()
    process.exit(0)
  }
  process.on('SIGTERM', stop)
  process.on('SIGINT', stop)
  const path = scratch + '/workspace'
  await mkdir(path, { recursive: true })
  let sessionId, created = false
  for (const file of ['session.json', 'status.json']) {
    try { sessionId = JSON.parse(await readFile(scratch + '/' + file, 'utf8')).sessionId; if (sessionId) break }
    catch (error) { if (error.code !== 'ENOENT') throw error }
  }
  if (!sessionId) {
    const workspace = await ctx.workspaceRegistry.create(path, 'Second DSH')
    const session = await ctx.sessionController.create({ workspaceId: workspace.id, sessionId: 'mygo-second-' + Date.now() })
    sessionId = session.sessionId
    await workspace.attachSession(sessionId)
    ctx.sessionTitle.rename(ctx.sessions.get(sessionId), 'Second DSH session')
    created = true
  }
  await writeFile(scratch + '/session.json', JSON.stringify({ sessionId }), { mode: 0o600 })
  if (created) {
    await ctx.sessionController.prompt({ sessionId, requestId: 'second-warmup-' + sessionId, interaction: 'queue',
      content: [{ type: 'text', text: 'Reply with a greeting for the second instance.' }] }, new AbortController().signal)
  }
  const origin = ctx.webServer.getOrigin()
  await writeFile(scratch + '/launch-url', ctx.connection.authenticatedUrl(origin + '/'), { mode: 0o600 })
  await writeFile(scratch + '/status.json', JSON.stringify({ pid: process.pid, origin, sessionId }), { mode: 0o600 })
  console.log('Second pinned DSH with MODEL MOCK is ready; private metadata saved.')
} catch (error) {
  await boot?.shutdown.shutdown(1)
  await model.close()
  console.error('Second DSH failed:', String(error.message).replace(/https?:\/\/\S+/g, '[private URL]'))
  process.exitCode = 1
}

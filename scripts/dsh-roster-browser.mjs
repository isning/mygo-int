// Ticket 50: complete single-root client + real pinned Host, isolated browser.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { openSync } from 'node:fs'
import { resolve } from 'node:path'
import { protectLocalEntryModules } from '../entries/dsh-startup/local-entry-boundary.js'
import { observeManagedRoster } from './test/helpers/dsh-managed-roster.js'
const scratch = resolve('.scratch/test-dsh')
const profile = scratch + '/roster-browser-' + Date.now()
await mkdir(profile, { recursive: true, mode: 0o700 })
const log = openSync(scratch + '/roster-browser.log', 'a', 0o600)
const child = spawn('nix', ['shell', 'nixpkgs#chromium', '-c', 'chromium', '--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], { stdio: ['ignore', log, log] })
const pause = ms => new Promise(r => setTimeout(r, ms))
let ws, stage = 'browser startup', restored = false, evaluate, original
async function until(fn) {
  for (let i = 0; i < 240; i++) {
    if (child.exitCode !== null) throw Error('Owned Chromium exited')
    try { const result = await fn(); if (result) return result } catch {}
    await pause(250)
  }
  throw Error('Timed out: ' + stage)
}
try {
  const port = await until(async () => Number((await readFile(profile + '/DevToolsActivePort', 'utf8')).split('\n')[0]))
  const page = await fetch('http://127.0.0.1:' + port + '/json/new?about:blank', { method: 'PUT' }).then(r => r.json())
  ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j })
  let sequence = 0
  const pending = new Map()
  ws.onmessage = event => { const m = JSON.parse(event.data); if (m.id) { pending.get(m.id)?.(m); pending.delete(m.id) } }
  const send = (method, params = {}) => new Promise((r, j) => {
    const id = ++sequence
    pending.set(id, m => m.error ? j(Error(m.error.message)) : r(m.result))
    ws.send(JSON.stringify({ id, method, params }))
  })
  evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text)
    return result.result.value
  }
  await send('Page.enable')
  await send('Page.addScriptToEvaluateOnNewDocument', { source: '(' + observeManagedRoster.toString() + ')(' + protectLocalEntryModules.toString() + ')' })
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  const launch = await readFile(scratch + '/client-launch-url', 'utf8')
  await send('Page.navigate', { url: new URL(launch).origin + '/' })
  await until(() => evaluate('document.readyState === "complete"'))
  assert.equal(await evaluate("fetch('/').then(r => r.status)"), 401, 'fresh browser requires original DSH authentication')
  await send('Page.navigate', { url: launch })
  stage = 'real single-root local Entry activation'
  await until(() => evaluate("document.querySelector('[data-mygo-shared-client]')?.dataset.localActive === 'true' && !!document.querySelector('[data-mygo-local-plugin=marker]')"))
  const before = await evaluate('__MYGO_ROSTER_TEST__.capture()')
  const local = before.find(row => row.name === './plugins/marker.js')
  assert.equal(local?.state, 2, 'concrete configured local Entry ACTIVE')
  assert.equal(local.moduleLoaded, true, 'local Entry retains an actual module namespace')
  original = await evaluate('__DSH_BOOT__')
  const terminal = '@deepseek-ai/dsh-client-ui-sidebar-terminal'
  const target = before.find(row => row.name === terminal)
  assert.equal(target?.state, 2, 'unchanged original Terminal Entry ACTIVE')
  await evaluate("[...document.querySelectorAll('button')].find(x => x.getAttribute('aria-label') === 'Open sidebar')?.click()")
  await until(() => evaluate("[...document.querySelectorAll('[role=treeitem]')].some(x => x.innerText === 'Local test DSH')"))
  await evaluate("[...document.querySelectorAll('[role=treeitem]')].find(x => x.innerText === 'Local test DSH' && x.getAttribute('aria-expanded') === 'false')?.click()")
  await until(() => evaluate("document.body.innerText.includes('Local MODEL MOCK reply')"))
  await evaluate("[...document.querySelectorAll('[role=treeitem],button,[role=button]')].find(x => x.innerText === 'Local MODEL MOCK reply')?.click()")
  await until(() => evaluate("!!document.querySelector('[contenteditable=true]')"))
  await evaluate("document.querySelector('[data-sidebar-right-expand]')?.click()")
  await until(() => evaluate("!!document.querySelector('[data-sidebar-right-guide-entry=terminal] button')"))
  await evaluate("document.querySelector('[data-sidebar-right-guide-entry=terminal] button').click()")
  await until(() => evaluate("!!document.querySelector('[data-sidebar-terminal]')"))
  await evaluate("globalThis.__ROSTER_MARKER__ = document.querySelector('[data-mygo-local-plugin=marker]')")
  stage = 'original ClientEntries removal'
  const removed = { ...original, entries: original.entries.filter(row => row.id !== terminal), batches: original.batches.map(row => ({ ...row, entries: row.entries.filter(id => id !== terminal) })).filter(row => row.entries.length) }
  const removal = await evaluate('__MYGO_ROSTER_TEST__.sync(' + JSON.stringify(removed) + ')')
  assert.equal(removal.error, undefined)
  await until(() => evaluate("!document.querySelector('[data-sidebar-terminal]') && !document.querySelector('[data-sidebar-right-guide-entry=terminal]')"))
  const after = await evaluate('__MYGO_ROSTER_TEST__.snapshot()')
  assert.deepEqual(after, before.filter(row => row.id !== target.id), 'only managed Terminal removed; concrete local and unrelated Host Entry/module/fiber identities retained')
  assert.equal(await evaluate('__MYGO_ROSTER_TEST__.removedState(' + JSON.stringify(target.id) + ')'), 4, 'original fiber disposal completed')
  assert.equal(await evaluate("document.querySelector('[data-mygo-local-plugin=marker]') === __ROSTER_MARKER__ && !!document.querySelector('[contenteditable=true]')"), true)
  stage = 'original ClientEntries restoration'
  const restoration = await evaluate('__MYGO_ROSTER_TEST__.sync(' + JSON.stringify(original) + ')')
  assert.equal(restoration.error, undefined)
  restored = true
  await until(() => evaluate("!!document.querySelector('[data-sidebar-right-guide-entry=terminal], [data-sidebar-terminal]')"))
  const final = await evaluate('__MYGO_ROSTER_TEST__.snapshot()')
  assert.deepEqual(final.filter(row => row.name !== terminal), after, 'restoration preserves all unrelated concrete identities')
  assert.equal(final.find(row => row.name === terminal)?.state, 2, 'restored original plugin ACTIVE')
  assert.equal(await evaluate("document.querySelector('[data-mygo-local-plugin=marker]') === __ROSTER_MARKER__"), true)
  stage = 'cross-owner graph admission'
  const conflict = { ...original, entries: [...original.entries, { id: local.name, rev: 'cross-owner', url: '/never-load-local-from-host.js' }], batches: [...original.batches, { phase: 'application', url: '/never-load-local-from-host.js', rev: 'cross-owner', entries: [local.name] }] }
  restored = false
  const rejected = await evaluate('__MYGO_ROSTER_TEST__.sync(' + JSON.stringify(conflict) + ')')
  assert.match(rejected.error ?? '', /local|owner|conflict/i, 'Host graph cannot acquire a configured local module identity')
  assert.deepEqual(await evaluate('__MYGO_ROSTER_TEST__.snapshot()'), final, 'cross-owner rejection is atomic for concrete entries')
  await evaluate('__MYGO_ROSTER_TEST__.sync(' + JSON.stringify(original) + ')')
  restored = true
  stage = 'duplicate graph conflict admission'
  const duplicate = { ...original, entries: [...original.entries, original.entries.find(row => row.id === terminal)] }
  const duplicateResult = await evaluate('__MYGO_ROSTER_TEST__.sync(' + JSON.stringify(duplicate) + ')')
  assert.match(duplicateResult.error ?? '', /duplicate graph entry/, 'original graph parser rejects duplicate Host identities')
  assert.deepEqual(await evaluate('__MYGO_ROSTER_TEST__.snapshot()'), final, 'invalid graph preserves local and unrelated Host entries')
  await writeFile(scratch + '/roster-validation.json', JSON.stringify({ ok: true, before, after, final, removal, restoration, rejected, duplicateResult }, null, 2), { mode: 0o600 })
  console.log('Real Host graph removal/restoration: original disposal, same ACTIVE local Entry/module and unrelated Host identities passed')
  await Promise.race([send('Browser.close').catch(() => {}), pause(5000)])
} catch (error) {
  await writeFile(scratch + '/roster-failure.json', JSON.stringify({ stage, error: error.message }), { mode: 0o600 })
  throw error
} finally {
  if (!restored && original && evaluate) await evaluate('__MYGO_ROSTER_TEST__.sync(' + JSON.stringify(original) + ')').catch(() => {})
  ws?.close()
  if (child.exitCode === null) { child.kill('SIGTERM'); await new Promise(r => child.once('exit', r)) }
}

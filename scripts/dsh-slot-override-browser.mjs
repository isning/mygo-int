// Complete-client acceptance for ticket 51; real Host, original browser authority.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { openSync } from 'node:fs'
import { resolve } from 'node:path'
const scratch = resolve('.scratch/test-dsh')
const profile = scratch + '/browser-slot-' + Date.now()
await mkdir(profile, { recursive: true, mode: 0o700 })
const log = openSync(scratch + '/slot-browser.log', 'a', 0o600)
const browser = spawn('nix', ['shell', 'nixpkgs#chromium', '-c', 'chromium', '--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], { stdio: ['ignore', log, log] })
const pause = ms => new Promise(r => setTimeout(r, ms))
async function until(fn) {
  for (let i = 0; i < 240; i++) {
    if (browser.exitCode !== null) throw Error('Chromium exited; inspect private slot-browser.log')
    const result = await fn().catch(() => undefined)
    if (result) return result
    await pause(250)
  }
  throw Error('Slot browser readiness timed out')
}
let ws, evaluate, stage = 'login'
const mutations = [], prompts = [], receipts = [], responseJobs = []
try {
  const port = await until(async () => Number((await readFile(profile + '/DevToolsActivePort', 'utf8')).split('\n')[0]))
  const page = await fetch('http://127.0.0.1:' + port + '/json/new?about:blank', { method: 'PUT' }).then(r => r.json())
  ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j })
  let sequence = 0
  const pending = new Map()
  ws.onmessage = event => {
    const message = JSON.parse(event.data), p = message.params
    if (message.id) { pending.get(message.id)?.(message); pending.delete(message.id) }
    if (message.method === 'Network.requestWillBeSent') {
      const path = new URL(p.request.url).pathname
      if (/^\/api\/(settings|dynamicCordisRunner|pluginManager)\//.test(path) && !/\/(get|list|inventory|schema|snapshot|describe)$/.test(path)) mutations.push(path)
      if (path === '/api/session/prompt') prompts.push(JSON.parse(p.request.postData))
    }
    if (message.method === 'Network.responseReceived' && new URL(p.response.url).pathname === '/api/session/prompt') receipts.push({ id: p.requestId, status: p.response.status })
    if (message.method === 'Network.loadingFinished' && receipts.some(row => row.id === p.requestId)) {
      responseJobs.push(send('Network.getResponseBody', { requestId: p.requestId }).then(result => { receipts.find(row => row.id === p.requestId).body = JSON.parse(result.body) }))
    }
  }
  const send = (method, params = {}) => new Promise((r, j) => {
    const id = ++sequence
    pending.set(id, m => m.error ? j(Error(m.error.message)) : r(m.result))
    ws.send(JSON.stringify({ id, method, params }))
  })
  evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (result.exceptionDetails) throw Error(result.exceptionDetails.text)
    return result.result.value
  }
  await send('Network.enable'); await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  const url = (await readFile(scratch + '/client-launch-url', 'utf8')).trim()
  await send('Page.navigate', { url: new URL(url).origin })
  await until(() => evaluate('document.readyState === "complete"'))
  assert.equal(await evaluate("fetch('/').then(r => r.status)"), 401)
  await send('Page.navigate', { url })
  await until(() => evaluate("!!document.querySelector('[data-slot-override-controls]')"))
  await evaluate("[...document.querySelectorAll('button')].find(x => x.innerText === 'Continue')?.click()")
  const chooser = "[...document.querySelectorAll('[role=menu]')].some(x => x.innerText.includes('Local test DSH'))"
  await evaluate("[...document.querySelectorAll('button')].find(x => x.getAttribute('aria-label') === 'Choose workspace')?.click()")
  const overridden = "!!document.querySelector('[data-mygo-workspace-override]')"
  stage = 'before'
  await until(() => evaluate(chooser))
  assert.equal(await evaluate(overridden), false)
  const hostSnapshot = () => evaluate(`Promise.all(['settings/describe', 'pluginInventory/list'].map(async method => {
    const response = await fetch('/api/' + method, {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({type:'client-request', rpcId:'slot-read-' + method + '-' + Date.now(), method, payload:{args:{}}})})
    if (!response.ok) throw Error('Host snapshot HTTP ' + response.status)
    const reply = await response.json()
    if (!reply.result?.ok) throw Error('Host snapshot rejected')
    const value = reply.result.value
    // Schema serialization allocates fresh reference IDs; compare configuration and revisions.
    return method === 'settings/describe'
      ? {...value, namespaces:value.namespaces.map(({schema, ...configuration}) => configuration)}
      : value
  }))`)
  const hostBefore = await hostSnapshot()
  const beforeMutations = mutations.length
  const action = async name => {
    await evaluate(`document.querySelector('[data-slot-action=${name}]').click()`)
    await until(() => evaluate(`document.querySelector('[data-slot-override-controls] output').textContent === '${name}: session retained'`))
    if (name === 'enable') await evaluate("[...document.querySelectorAll('button')].find(x => x.getAttribute('aria-label') === 'Choose workspace' && x.getAttribute('aria-expanded') === 'false')?.click()")
  }
  stage = 'override'
  await action('enable')
  // Deliberately direct assertion: the RED stub must fail here, not time out.
  await pause(300)
  await evaluate("[...document.querySelectorAll('button')].find(x => x.getAttribute('aria-label') === 'Choose workspace' && x.getAttribute('aria-expanded') === 'false')?.click()")
  assert.equal(await evaluate(overridden), true, 'local Entry replaces the actual official workspace chooser through Slot priority')
  assert.equal(await evaluate(chooser), false, 'official workspace menu is shadowed')
  stage = 'disable'
  await action('disable')
  await evaluate("[...document.querySelectorAll('button')].find(x => x.getAttribute('aria-label') === 'Choose workspace' && x.getAttribute('aria-expanded') === 'false')?.click()")
  await until(() => evaluate(chooser))
  assert.equal(await evaluate(overridden), false)
  stage = 'remove'
  await action('enable')
  await until(() => evaluate(overridden))
  await action('remove')
  await evaluate("[...document.querySelectorAll('button')].find(x => x.getAttribute('aria-label') === 'Choose workspace' && x.getAttribute('aria-expanded') === 'false')?.click()")
  await until(() => evaluate(chooser))
  assert.equal(await evaluate(overridden), false)
  assert.deepEqual(await hostSnapshot(), hostBefore, 'Host plugin inventory and redacted configuration remain unchanged')
  assert.equal(mutations.length, beforeMutations, 'local lifecycle sends no Host management mutation')
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
  if (process.env.MYGO_EXPECT_UNIFIED_MANAGEMENT === '1') {
    await evaluate("[...document.querySelectorAll('button,[role=button]')].find(x=>x.innerText==='Plugins').click()")
    await until(() => evaluate("!!document.querySelector('[data-mygo-unified-plugins] [data-local-plugin-actions]')"))
    assert.equal(await evaluate("!!document.querySelector('[data-module-name=\"./plugins/marker.js\"] [data-local-plugin-actions]')"),true,'local management survives local override activation and revoke')
  }
  stage = 'retained session'
  await evaluate("[...document.querySelectorAll('button')].find(x => x.getAttribute('aria-label') === 'Open sidebar')?.click()")
  await until(() => evaluate("[...document.querySelectorAll('[role=treeitem]')].some(x => x.innerText === 'Local test DSH')"))
  await evaluate("[...document.querySelectorAll('[role=treeitem]')].find(x => x.innerText === 'Local test DSH' && x.getAttribute('aria-expanded') === 'false')?.click()")
  await until(() => evaluate("document.body.innerText.includes('Local MODEL MOCK reply')"))
  await evaluate("[...document.querySelectorAll('[role=treeitem],button,[role=button]')].find(x => x.innerText === 'Local MODEL MOCK reply')?.click()")
  await until(() => evaluate("!!document.querySelector('[contenteditable=true]') && document.body.innerText.includes('Hello! This is a deterministic local model mock reply.')"))
  const count = "[...document.querySelectorAll('[data-chat-flow-kind=assistant-step]')].filter(x => x.innerText.includes('Hello! This is a deterministic local model mock reply.')).length"
  await until(() => evaluate(count + "> 0 && !document.body.innerText.includes('Loading history')"))
  const before = await evaluate(count)
  const text = 'Slot lifecycle MODEL MOCK check ' + Date.now()
  await evaluate("document.querySelector('[contenteditable=true]').focus()")
  await send('Input.insertText', { text })
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 })
  await until(async () => receipts.length === 1 && await evaluate(count) === before + 1)
  await Promise.all(responseJobs)
  assert.equal(prompts.length, 1); assert.equal(receipts[0]?.status, 200)
  assert.equal(receipts[0]?.body?.rpcId, prompts[0].rpcId, 'original receipt retains request identity')
  assert.deepEqual(receipts[0]?.body?.result, { ok: true, value: { accepted: true } })
  const fixture = JSON.parse(await readFile(scratch + '/session.json', 'utf8'))
  assert.equal(prompts[0].payload.args.request.sessionId, fixture.sessionId, 'same real Host session remains usable')
  assert.equal(await evaluate("document.querySelector('[contenteditable=true]').innerText"), '')
  await writeFile(scratch + '/slot-override-result.json', JSON.stringify({ before: 'official chooser', override: 'local presentation', disabled: 'official chooser', removed: 'official chooser', sessionRetained: true, unifiedManagementRetained: process.env.MYGO_EXPECT_UNIFIED_MANAGEMENT === '1', promptAccepted: true, managementMutations: mutations.slice(beforeMutations) }), { mode: 0o600 })
  console.log('Slot override, disable, removal and retained original Session composer passed')
  await Promise.race([send('Browser.close'), pause(5000)])
} catch (error) {
  await writeFile(scratch + '/slot-override-failure.json', JSON.stringify({ stage, error: error.message, text: evaluate ? await evaluate('document.body.innerText').catch(() => '') : '' }), { mode: 0o600 })
  throw error
} finally {
  ws?.close()
  if (browser.exitCode === null) { browser.kill('SIGTERM'); await new Promise(r => browser.once('exit', r)) }
}

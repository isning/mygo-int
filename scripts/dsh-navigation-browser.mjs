// Complete-client acceptance for ticket 52; real Host, original browser authority.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { openSync } from 'node:fs'
import { resolve } from 'node:path'
const scratch = resolve('.scratch/test-dsh')
const profile = scratch + '/browser-navigation-' + Date.now()
await mkdir(profile, { recursive: true, mode: 0o700 })
const log = openSync(scratch + '/navigation-browser.log', 'a', 0o600)
const browser = spawn('nix', ['shell', 'nixpkgs#chromium', '-c', 'chromium', '--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], { stdio: ['ignore', log, log] })
const pause = ms => new Promise(r => setTimeout(r, ms))
async function until(fn) {
  for (let i = 0; i < 240; i++) {
    if (browser.exitCode !== null) throw Error('Chromium exited; inspect private navigation-browser.log')
    const result = await fn().catch(() => undefined)
    if (result) return result
    await pause(250)
  }
  throw Error('Navigation browser readiness timed out')
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
  await until(() => evaluate("!!document.querySelector('[data-mygo-shared-client]')"))
  await evaluate("[...document.querySelectorAll('button')].find(x => x.innerText === 'Continue')?.click()")
  await evaluate("[...document.querySelectorAll('button')].find(x => x.getAttribute('aria-label') === 'Open sidebar')?.click()")
  stage = 'navigation present'
  assert.equal(await evaluate("document.querySelectorAll('[data-mygo-navigation]').length"), 1, 'instance entry is inside the original sidebar')
  assert.equal(await evaluate("document.querySelectorAll('[data-mygo-shell]').length"), 0, 'no outer workbench surrounds original UI')
  assert.equal(await evaluate("(() => { for (let node = document.querySelector('[data-mygo-navigation]').parentElement; node && node.id !== 'root'; node = node.parentElement) { if (node.querySelector('[data-sidebar-toggle]') && !node.querySelector('[data-mygo-shared-client]')) return true; } return false; })()"), true, 'local action shares the original sidebar column')
  await evaluate("document.querySelector('[aria-label=Instances]').click()")
  await until(() => evaluate("document.body.innerText.includes('Bound connection: Local test DSH · connected')"))
  let beforeMutations = mutations.length
  stage = 'external saved selection'
  const select = name => evaluate(`[...document.querySelectorAll('button')].find(x => x.textContent === ${JSON.stringify('Select ' + name)}).click()`)
  await select('External saved profile')
  await until(() => evaluate("document.body.innerText.includes('External profile unavailable; no connection was switched.')"))
  assert.equal(await evaluate("document.body.innerText.includes('Bound connection: Local test DSH · connected')"), true)
  await writeFile(scratch + '/navigation-external.png', Buffer.from((await send('Page.captureScreenshot', {format:'png'})).data, 'base64'), {mode:0o600})
  assert.equal(mutations.length, beforeMutations, 'external selection sends no Host management mutation')
  stage = 'reload saved selection'
  await send('Page.reload')
  await until(() => evaluate("!!document.querySelector('[data-mygo-shared-client]')"))
  await evaluate("[...document.querySelectorAll('button')].find(x => x.getAttribute('aria-label') === 'Open sidebar')?.click()")
  await evaluate("document.querySelector('[aria-label=Instances]').click()")
  await until(() => evaluate("document.body.innerText.includes('Saved profile: External saved profile')"))
  assert.equal(await evaluate("document.body.innerText.includes('External profile unavailable; no connection was switched.')"), true)
  beforeMutations = mutations.length
  await select('Local test DSH')
  await until(() => evaluate("document.body.innerText.includes('Saved profile: Local test DSH') && !document.body.innerText.includes('External profile unavailable; no connection was switched.')"))
  assert.equal(mutations.length, beforeMutations, 'catalog selection sends no Host management mutation')
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
  stage = 'retained session'
  await evaluate("[...document.querySelectorAll('button')].find(x => x.getAttribute('aria-label') === 'Open sidebar')?.click()")
  await until(() => evaluate("[...document.querySelectorAll('[role=treeitem]')].some(x => x.innerText === 'Local test DSH')"))
  await evaluate("[...document.querySelectorAll('[role=treeitem]')].find(x => x.innerText === 'Local test DSH' && x.getAttribute('aria-expanded') === 'false')?.click()")
  await until(() => evaluate("document.body.innerText.includes('Local MODEL MOCK reply')"))
  await evaluate("[...document.querySelectorAll('[role=treeitem],button,[role=button]')].find(x => x.innerText === 'Local MODEL MOCK reply')?.click()")
  await until(() => evaluate("!!document.querySelector('[contenteditable=true]') && document.body.innerText.includes('Hello! This is a deterministic local model mock reply.')"))
  const count = "[...document.querySelectorAll('[data-chat-flow-kind=assistant-step]')].filter(x => x.innerText.includes('Hello! This is a deterministic local model mock reply.')).length"
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
  await writeFile(scratch + '/navigation-result.json', JSON.stringify({ originalNavigation: true, externalSelectionPersists: true, boundConnectionUnchanged: true, sessionRetained: true, promptAccepted: true, managementMutations: mutations.slice(beforeMutations) }), { mode: 0o600 })
  console.log('Original navigation, durable external selection and retained original Session composer passed')
  await Promise.race([send('Browser.close'), pause(5000)])
} catch (error) {
  await writeFile(scratch + '/navigation-failure.json', JSON.stringify({ stage, error: error.message, mutations, text: evaluate ? await evaluate('document.body.innerText').catch(() => '') : '' }), { mode: 0o600 })
  throw error
} finally {
  ws?.close()
  if (browser.exitCode === null) { browser.kill('SIGTERM'); await new Promise(r => browser.once('exit', r)) }
}

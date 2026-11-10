// Observe the original React/Slot UI and real chunk network; no fake service face.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { openSync, closeSync } from 'node:fs'
import { resolve } from 'node:path'
import { TERMINAL_SHELLS_RPC_PATH } from './dsh-terminal-carrier.mjs'
process.umask(0o077)
const scratch = resolve('.scratch/terminal-live'), status = JSON.parse(await readFile(scratch + '/status.json', 'utf8'))
const profile = scratch + '/browser-' + Date.now()
await mkdir(profile, { recursive: true, mode: 0o700 })
const log = openSync(scratch + '/browser.log', 'a', 0o600)
const browser = spawn('nix', ['shell', 'nixpkgs#chromium', '-c', 'chromium', '--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], { stdio: ['ignore', log, log] })
closeSync(log)
const pause = ms => new Promise(r => setTimeout(r, ms))
async function until(fn) {
  for (let i = 0; i < 240; i++) {
    if (browser.exitCode !== null) throw Error('Chromium exited; inspect private browser.log')
    const result = await fn(); if (result) return result
    await pause(250)
  }
  throw Error('Terminal shell-menu browser check timed out')
}
let ws, evaluate
try {
  const port = await until(async () => { try { return Number((await readFile(profile + '/DevToolsActivePort', 'utf8')).split('\n')[0]) } catch { return false } })
  const page = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' }).then(r => r.json())
  ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j })
  let sequence = 0
  const pending = new Map(), responses = new Map(), finished = new Set(), requests = [], errors = []
  ws.onmessage = event => {
    const m = JSON.parse(event.data)
    if (m.id) { pending.get(m.id)?.(m); pending.delete(m.id) }
    if (m.method === 'Network.requestWillBeSent') requests.push({ url: m.params.request.url, method: m.params.request.method, postData: m.params.request.postData })
    if (m.method === 'Network.responseReceived') responses.set(m.params.requestId, m.params.response)
    if (m.method === 'Network.loadingFinished') finished.add(m.params.requestId)
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text)
  }
  const send = (method, params = {}) => new Promise((r, j) => {
    const id = ++sequence; pending.set(id, m => m.error ? j(Error(m.error.message)) : r(m.result))
    ws.send(JSON.stringify({ id, method, params }))
  })
  evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (result.exceptionDetails) throw Error('Browser evaluation failed: ' + result.exceptionDetails.text)
    return result.result.value
  }
  await send('Network.enable'); await send('Runtime.enable'); await send('Page.enable')
  await send('Network.setCacheDisabled', { cacheDisabled: true })
  await send('Page.navigate', { url: status.clientUrl })
  await until(() => evaluate("globalThis.__ModuleLoader__?.mode==='live' && !!document.querySelector('button[aria-label=\"Open sidebar\"]')"))
  await evaluate("document.querySelector('button[aria-label=\"Open sidebar\"]').click()")
  await until(() => evaluate("[...document.querySelectorAll('[role=treeitem]')].some(x=>x.innerText==='Local test DSH')"))
  await evaluate("[...document.querySelectorAll('[role=treeitem]')].find(x=>x.innerText==='Local test DSH').click()")
  await until(() => evaluate("document.body.innerText.includes('Local MODEL MOCK reply')"))
  await evaluate("[...document.querySelectorAll('[role=treeitem],button,[role=button]')].find(x=>x.innerText==='Local MODEL MOCK reply').click()")
  await until(() => evaluate("!!document.querySelector('[data-sidebar-right-expand]')"))
  assert.equal(requests.filter(x => new URL(x.url).pathname === TERMINAL_SHELLS_RPC_PATH).length, 0, 'shell discovery starts only on menu action')
  await evaluate("document.querySelector('[data-sidebar-right-expand]').click()")
  await until(() => evaluate("!!document.querySelector('[data-sidebar-right-guide-entry=terminal] button[aria-haspopup=menu]')"))
  await evaluate("document.querySelector('[data-sidebar-right-guide-entry=terminal] button[aria-haspopup=menu]').click()")
  const [requestId, response] = await until(() => [...responses].find(([id, r]) => new URL(r.url).pathname === TERMINAL_SHELLS_RPC_PATH && finished.has(id)))
  assert.equal(response.status, 200)
  const body = await send('Network.getResponseBody', { requestId })
  const envelope = JSON.parse(Buffer.from(body.body, body.base64Encoded ? 'base64' : 'utf8').toString())
  assert.equal(envelope.result.ok, true, 'original Host result succeeds; HTTP 200 alone is insufficient')
  assert.deepEqual(envelope.result.value, status.expectedShells, 'same actual original execution provider results')
  assert.ok(envelope.result.value.length > 0)
  const names = envelope.result.value.map(shell => shell.name)
  const visible = await until(() => evaluate(`(()=>{const items=[...document.querySelectorAll('[role=menuitem],[role=menuitemradio]')]; const names=${JSON.stringify(names)};return names.every(name=>items.some(el=>el.innerText===name&&el.getBoundingClientRect().width>0)) && items.map(el=>el.innerText)})()`))
  const calls = requests.filter(x => new URL(x.url).pathname === TERMINAL_SHELLS_RPC_PATH)
  assert.equal(calls.length, 1)
  const call = JSON.parse(calls[0].postData)
  assert.equal(call.method, 'terminal/shells')
  assert.deepEqual(call.payload, {args:{agentId:status.sessionId}})
  assert.ok(!requests.some(x => /\/api\/terminal\/(create|attach|retain|environment)$/.test(new URL(x.url).pathname)), 'no terminal allocation, attachment or environment action')
  await until(() => evaluate("document.body.innerText.includes('Hello! This is a deterministic local model mock reply.')"))
  await pause(1000)
  const ui = await evaluate('document.body.innerText')
  assert.ok(!ui.includes('WebSocket closed') && !ui.includes('Failed to load plugins') && !ui.includes('gateway/internal'), 'session remains healthy after menu action')
  assert.ok(ui.includes('Local MODEL MOCK reply'))
  await writeFile(scratch + '/shell-menu.png', Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
  await writeFile(scratch + '/shell-menu-dom.html', await evaluate('document.documentElement.outerHTML'))
  await writeFile(scratch + '/result.json', JSON.stringify({ originalUI: true, action: 'open original Terminal guide Shell menu', endpoint: TERMINAL_SHELLS_RPC_PATH, httpStatus: response.status, result: envelope.result, visibleNames: visible, sessionId: status.sessionId, serviceActionImplemented: true, terminalAllocated: false, historyVisibleAfterAction: true, model: 'local HTTP MODEL MOCK; shell discovery uses real Host subprocess provider', errors }, null, 2))
  console.log('Original Terminal Shell menu displays real Host-discovered shells; no terminal allocated')
} catch (error) {
  await writeFile(scratch + '/failure.json', JSON.stringify({ error: error.message, ui: evaluate ? await evaluate('document.body.innerText').catch(() => undefined) : undefined }, null, 2))
  throw error
} finally {
  ws?.close()
  if (browser.exitCode === null) { browser.kill('SIGTERM'); await new Promise(r => browser.once('exit', r)) }
}

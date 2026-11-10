// Observe the original React/Slot UI and real chunk network; no fake service face.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { openSync, closeSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { LAZY_PATH } from '../entries/dsh-startup/lazy-resources.js'
process.umask(0o077)
const scratch = resolve('.scratch/lazy-live'), status = JSON.parse(await readFile(scratch + '/status.json', 'utf8'))
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
  throw Error('Lazy browser check timed out')
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
    if (m.method === 'Network.requestWillBeSent') requests.push({ url: m.params.request.url, method: m.params.request.method })
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
  assert.equal(requests.filter(x => new URL(x.url).pathname === LAZY_PATH).length, 0, 'chunk is absent before opening the lazy entry')
  await evaluate("document.querySelector('[data-sidebar-right-expand]').click()")
  await until(() => evaluate("!!document.querySelector('[data-sidebar-right-guide-entry=terminal] button')"))
  await evaluate("document.querySelector('[data-sidebar-right-guide-entry=terminal] button').click()")
  const visible = await until(() => evaluate(`(()=>{const el=document.querySelector('[data-sidebar-terminal]');if(!el)return false;const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&el.innerText.trim()&&{text:el.innerText,width:r.width,height:r.height};})()`))
  const [requestId, response] = await until(() => [...responses].find(([id, r]) => new URL(r.url).pathname === LAZY_PATH && finished.has(id)))
  assert.equal(response.status, 200); assert.ok(['application/javascript', 'text/javascript'].includes(response.mimeType))
  assert.ok(!response.fromDiskCache && !response.fromServiceWorker)
  const body = await send('Network.getResponseBody', { requestId })
  const bytes = Buffer.from(body.body, body.base64Encoded ? 'base64' : 'utf8')
  const cookie = await readFile(scratch + '/owner-cookie', 'utf8')
  const target = await fetch(new URL(new URL(response.url).pathname + new URL(response.url).search, status.origin), { headers: { cookie }, redirect: 'error' })
  assert.equal(target.status, 200)
  assert.deepEqual(bytes, Buffer.from(await target.arrayBuffer()), 'exact authenticated original Host chunk bytes')
  assert.equal(requests.filter(x => new URL(x.url).pathname === LAZY_PATH).length, 1)
  await pause(1000)
  const terminalResponses = [...responses.values()].filter(r => new URL(r.url).pathname.startsWith('/api/terminal/')).map(r => ({ path: new URL(r.url).pathname, status: r.status }))
  assert.ok(terminalResponses.length > 0 && terminalResponses.every(r => [403, 404].includes(r.status)), 'no terminal RPC capability added')
  const ui = await evaluate('document.body.innerText')
  assert.ok(!ui.includes('Failed to load plugins'))
  await writeFile(scratch + '/lazy.png', Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
  await writeFile(scratch + '/lazy-dom.html', await evaluate('document.documentElement.outerHTML'))
  await writeFile(scratch + '/result.json', JSON.stringify({ originalUI: true, lazyBeforeOpen: false, chunk: { url: response.url, status: response.status, mimeType: response.mimeType, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), targetBodyEqual: true }, visible, terminalResponses, serviceActionImplemented: false, errors }, null, 2))
  console.log('Original lazy Terminal chunk loaded once; original Slot content visible; terminal RPC remains denied')
} catch (error) {
  await writeFile(scratch + '/failure.json', JSON.stringify({ error: error.message, ui: evaluate ? await evaluate('document.body.innerText').catch(() => undefined) : undefined }, null, 2))
  throw error
} finally {
  ws?.close()
  if (browser.exitCode === null) { browser.kill('SIGTERM'); await new Promise(r => browser.once('exit', r)) }
}

// Complete-client acceptance for ticket 51; real Host, original browser authority.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { openSync } from 'node:fs'
import { resolve } from 'node:path'
const scratch = resolve('.scratch/test-dsh')
const profile = scratch + '/browser-unified-' + Date.now()
await mkdir(profile, { recursive: true, mode: 0o700 })
const log = openSync(scratch + '/unified-browser.log', 'a', 0o600)
const browser = spawn('nix', ['shell', 'nixpkgs#chromium', '-c', 'chromium', '--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], { stdio: ['ignore', log, log] })
const pause = ms => new Promise(r => setTimeout(r, ms))
async function until(fn) {
  for (let i = 0; i < 240; i++) {
    if (browser.exitCode !== null) throw Error('Chromium exited; inspect private unified-browser.log')
    const result = await fn().catch(() => undefined)
    if (result) return result
    await pause(250)
  }
  throw Error('Slot browser readiness timed out')
}
let ws, evaluate, stage = 'login'
const errors = [];
const mutations = []
try {
  const port = await until(async () => Number((await readFile(profile + '/DevToolsActivePort', 'utf8')).split('\n')[0]))
  const page = await fetch('http://127.0.0.1:' + port + '/json/new?about:blank', { method: 'PUT' }).then(r => r.json())
  ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j })
  let sequence = 0
  const pending = new Map()
  ws.onmessage = event => {
    const message = JSON.parse(event.data), p = message.params
    if (message.method === 'Runtime.exceptionThrown') errors.push(p.exceptionDetails)
    if (message.method === 'Runtime.consoleAPICalled' && p.type === 'error') errors.push(p.args)
    if (message.id) { pending.get(message.id)?.(message); pending.delete(message.id) }
    if (message.method === 'Network.requestWillBeSent') {
      const path = new URL(p.request.url).pathname
      if (/^\/api\/(settings|dynamicCordisRunner|pluginManager)\//.test(path) && !/\/(get|list|inventory|schema|snapshot|describe|listBundles|listPlugins|registries|fastest|syncInspectManifest)$/.test(path)) mutations.push(path)
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
  await send('Runtime.enable'); await send('Network.enable'); await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  const url = (await readFile(scratch + '/client-launch-url', 'utf8')).trim()
  await send('Page.navigate', { url: new URL(url).origin })
  await until(() => evaluate('document.readyState === "complete"'))
  assert.equal(await evaluate("fetch('/').then(r => r.status)"), 401)
  await send('Page.navigate', { url })
  await until(() => evaluate("!!document.querySelector('[data-mygo-shared-client]')"))
  await evaluate("[...document.querySelectorAll('button')].find(x => x.innerText === 'Continue')?.click()")
  await evaluate("[...document.querySelectorAll('button')].find(x => x.getAttribute('aria-label') === 'Open sidebar')?.click()")
  await until(() => evaluate("[...document.querySelectorAll('button,[role=button]')].some(x => x.innerText === 'Plugins')"))
  await evaluate("[...document.querySelectorAll('button,[role=button]')].find(x => x.innerText === 'Plugins').click()")
  await pause(700)
  assert.equal(await evaluate("!!document.querySelector('[data-mygo-unified-plugins]')"), true,
    'original Plugins page is overridden through its original main Slot')
  await until(() => evaluate("document.querySelectorAll('[data-plugin-source=HOST]').length > 0"))
  const rows = await evaluate("[...document.querySelectorAll('[data-plugin-source]')].map(x => ({source:x.dataset.pluginSource,key:x.dataset.pluginKey,module:x.dataset.moduleName,owner:x.dataset.runtimeOwner}))")
  for (const source of ['LOCAL','INSTANCE CLIENT','HOST']) assert.ok(rows.some(x => x.source === source), source + ' has actual entries')
  assert.equal(new Set(rows.map(x => x.key)).size, rows.length, 'qualified identities distinguish every displayed entry')
  const collision = rows.filter(x => x.module === '@deepseek-ai/dsh-client-ui-plugin-manager')
  assert.ok(collision.some(x => x.source === 'HOST') && collision.some(x => x.source === 'INSTANCE CLIENT'), 'same original package appears independently in Host and instance client ownership')
  const select = async (label, value) => {
    await evaluate(`(() => { const el=document.querySelector('select[aria-label="${label}"]'); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(el,${JSON.stringify(value)}); el.dispatchEvent(new Event('change',{bubbles:true})); })()`)
    await pause(150)
  }
  for (const source of ['LOCAL','INSTANCE CLIENT','HOST']) {
    await select('Plugin source',source)
    assert.deepEqual(await evaluate("[...new Set([...document.querySelectorAll('[data-plugin-source]')].map(x=>x.dataset.pluginSource))]"), [source])
  }
  await select('Plugin source','all')
  await select('Plugin instance','local-test-dsh')
  assert.equal(await evaluate("!!document.querySelector('[data-plugin-source=LOCAL]')"),false,'instance filter excludes device-owned entries')
  await select('Plugin instance','device')
  assert.deepEqual(await evaluate("[...new Set([...document.querySelectorAll('[data-plugin-source]')].map(x=>x.dataset.pluginSource))]"),['LOCAL'])
  assert.equal(await evaluate("document.querySelectorAll('[data-mygo-unified-plugins] [role=switch], [data-mygo-unified-plugins] textarea').length"),0,'inspection adds no lifecycle controls')
  assert.equal(mutations.length,0,'inspection performs no Host mutation')
  await writeFile(scratch+'/unified-plugin-result.json',JSON.stringify({ok:true,rows,sourceFilters:true,instanceFilter:true,packageCollision:true,hostMutations:mutations}),{mode:0o600})
  await writeFile(scratch+'/unified-plugin.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'))
  console.log('Original Plugins Slot: three actual sources, qualified collisions and source/instance filters passed')
  await Promise.race([send('Browser.close'), pause(5000)])
} catch (error) {
  await writeFile(scratch + '/unified-plugin-failure.json', JSON.stringify({ stage, error: error.message, errors, mutations, text: evaluate ? await evaluate('document.body.innerText').catch(() => '') : '' }), { mode: 0o600 })
  throw error
} finally {
  ws?.close()
  if (browser.exitCode === null) { browser.kill('SIGTERM'); await new Promise(r => browser.once('exit', r)) }
}

// Complete-client acceptance for ticket 55; real Host, original browser authority.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { openSync } from 'node:fs'
import { resolve } from 'node:path'
const scratch = resolve('.scratch/test-dsh')
const profile = scratch + '/browser-unified-local-' + Date.now()
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
  await select('Plugin source','LOCAL')
  const note = '[data-plugin-source="LOCAL"][data-module-name="./plugins/marker.js"]'
  const control = note + ' [data-local-plugin-actions]'
  assert.equal(await evaluate(`!!document.querySelector('${control}')`), true, 'LOCAL row exposes source-qualified actual Loader actions')
  const rpc = (method) => evaluate(`fetch('/api/${method}',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type:'client-request',rpcId:'local-read-'+Date.now(),method:'${method}',payload:{args:{}}})}).then(r=>r.json())`)
  const settings = reply => { assert.equal(reply.result?.ok,true); return reply.result.value.namespaces.map(({ns,value,base,user,revision})=>({ns,value,base,user,revision})) }
  const plugins = reply => { assert.equal(reply.result?.ok,true); return reply.result.value }
  const beforeSettings = settings(await rpc('settings/describe'))
  const beforePlugins = plugins(await rpc('pluginInventory/list'))
  const start = mutations.length
  const click = async label => { await evaluate(`document.querySelector('${control} button[aria-label="${label}"]').click()`); await pause(100) }
  stage = 'disable local entry'
  await click('Disable local plugin')
  await until(()=>evaluate(`!document.querySelector('[data-mygo-local-plugin=marker]') && !!document.querySelector('${control} button[aria-label="Enable local plugin"]')`))
  stage = 'enable local entry'
  await click('Enable local plugin')
  await until(()=>evaluate(`!!document.querySelector('[data-mygo-local-plugin=marker]') && document.querySelector('${control}').innerText.includes('active')`))
  await click('Configure local plugin')
  const edit = async value => evaluate(`(() => { const el=document.querySelector('${control} textarea'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(el,${JSON.stringify(JSON.stringify(value))}); el.dispatchEvent(new Event('input',{bubbles:true})); })()`)
  const save = () => evaluate(`[...document.querySelectorAll('${control} button')].find(x=>x.innerText==='Save and apply locally').click()`)
  stage = 'save local config'
  await edit({label:'Unified LOCAL saved note'})
  await save()
  await until(()=>evaluate(`document.querySelector('[data-mygo-local-plugin=marker]')?.textContent==='Unified LOCAL saved note'`))
  stage = 'reject local config and rollback'
  await edit({label:''})
  await save()
  await until(()=>evaluate(`document.querySelector('${control}').innerText.includes('previous configuration restored')`))
  assert.equal(await evaluate("document.querySelector('[data-mygo-local-plugin=marker]')?.textContent"),'Unified LOCAL saved note','rejected config restores actual runtime')
  for (const name of ['client-composition','instance-manager','ui-client-manager','unified-plugin-manager']) {
    assert.equal(await evaluate(`document.querySelector('[data-module-name="./plugins/${name}.js"] [data-local-plugin-actions]')?.innerText.includes('Protected startup service')`),true,name+' is protected')
    assert.equal(await evaluate(`!!document.querySelector('[data-module-name="./plugins/${name}.js"] button[aria-label="Disable local plugin"]:not(:disabled)')`),false)
  }
  assert.deepEqual(settings(await rpc('settings/describe')),beforeSettings,'local lifecycle and rejection preserve Host settings and revisions')
  assert.deepEqual(plugins(await rpc('pluginInventory/list')),beforePlugins,'local lifecycle and rejection preserve Host plugin inventory')
  assert.deepEqual(mutations.slice(start),[],'local actions send no Host management writes')
  const expected = await evaluate("fetch('/mygo-local/startup.json').then(r=>r.json()).then(c=>c.entries.length)")
  assert.equal(await evaluate("document.querySelectorAll('[data-plugin-source=LOCAL]').length"),expected,'curated entries drive count')
  await writeFile(scratch+'/unified-local-result.json',JSON.stringify({ok:true,enableDisable:true,configSaved:true,rejectionRestoredRuntime:true,protectedServices:true,hostSettingsUnchanged:true,hostPluginsUnchanged:true,hostMutations:mutations.slice(start),localCount:expected}),{mode:0o600})
  await evaluate(`document.querySelector('${control}').scrollIntoView({block:'center'})`)
  await writeFile(scratch+'/unified-local.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'))
  console.log('Unified LOCAL actual enable/disable, config save, rejection rollback, protected services, unchanged Host state passed')
  await Promise.race([send('Browser.close'), pause(5000)])
} catch (error) {
  await writeFile(scratch + '/unified-local-failure.json', JSON.stringify({ stage, error: error.message, errors, mutations, text: evaluate ? await evaluate('document.body.innerText').catch(() => '') : '' }), { mode: 0o600 })
  throw error
} finally {
  ws?.close()
  if (browser.exitCode === null) { browser.kill('SIGTERM'); await new Promise(r => browser.once('exit', r)) }
}

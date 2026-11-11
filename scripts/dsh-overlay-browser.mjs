// Complete-client acceptance for ticket 58; real Host, original browser authority.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { openSync } from 'node:fs'
import { resolve } from 'node:path'
const scratch = resolve('.scratch/test-dsh')
const profile = scratch + '/browser-overlay-' + Date.now()
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
  let beforeSettings = settings(await rpc('settings/describe'))
  let beforePlugins = plugins(await rpc('pluginInventory/list'))
  const start = mutations.length
  const click = async label => { await evaluate(`document.querySelector('${control} button[aria-label="${label}"]').click()`); await pause(100) }
  const legacy = JSON.parse(await readFile('entries/dsh-startup/local/startup.json', 'utf8'))
  const key = await evaluate(`'mygo.local.v1:'+location.origin+':local-test-dsh:owner'`)
  const seed = async value => evaluate(`localStorage.setItem(${JSON.stringify(key)},${JSON.stringify(JSON.stringify(value))})`)
  const saved = overrides => ({version:1,base:JSON.stringify(legacy.entries),revision:4,overrides})
  const openPlugins = async () => {
    await until(() => evaluate("!!document.querySelector('[data-mygo-shared-client]')"))
    await evaluate("[...document.querySelectorAll('button')].find(x => x.innerText === 'Continue')?.click()")
    await evaluate("[...document.querySelectorAll('button')].find(x => x.getAttribute('aria-label') === 'Open sidebar')?.click()")
    await until(() => evaluate("[...document.querySelectorAll('button,[role=button]')].some(x => x.innerText === 'Plugins')"))
    await evaluate("[...document.querySelectorAll('button,[role=button]')].find(x => x.innerText === 'Plugins').click()")
    await until(() => evaluate("!!document.querySelector('[data-mygo-unified-plugins]')"))
    await select('Plugin source','LOCAL')
    await until(() => evaluate(`!!document.querySelector('${control}')`))
  }
  const refresh = async () => { await send('Page.reload'); await pause(300); await openPlugins() }
  const marker = () => evaluate("document.querySelector('[data-mygo-local-plugin=marker]')?.textContent")
  stage = 'restore valid legacy overlay into actual shared-root entry'
  await seed(saved({'local-note':{config:{label:'Legacy device note'},disabled:false}}))
  await refresh()
  assert.equal(await marker(),'Legacy device note','valid legacy overlay restores actual marker, not only desired state')
  assert.match(await evaluate(`document.querySelector('${control}').innerText`),/Legacy device overlay restored/)
  stage = 'refresh restored legacy overlay'
  await refresh()
  assert.equal(await marker(),'Legacy device note')
  stage = 'restart owned Host and carrier with same browser device storage'
  const runHost = async command => {
    const child = spawn(process.execPath,['scripts/dsh-test-host.mjs',command],{stdio:['ignore',log,log],env:process.env})
    assert.equal(await new Promise(r=>child.once('exit',r)),0,'owned Host '+command)
  }
  assert.deepEqual(settings(await rpc('settings/describe')),beforeSettings,'legacy restore and refresh preserve Host settings')
  assert.deepEqual(plugins(await rpc('pluginInventory/list')),beforePlugins,'legacy restore and refresh preserve Host inventory')
  await runHost('stop'); await runHost('start')
  await send('Page.navigate',{url:(await readFile(scratch+'/client-launch-url','utf8')).trim()})
  await pause(300); await openPlugins()
  assert.equal(await marker(),'Legacy device note','legacy choice survives real carrier restart')
  // Host restart can legitimately update runtime inventory, so compare each local workflow separately.
  beforeSettings = settings(await rpc('settings/describe'))
  beforePlugins = plugins(await rpc('pluginInventory/list'))
  stage = 'legacy disabled choice restores actual disposal'
  await seed(saved({'local-note':{config:{label:'Disabled legacy note'},disabled:true}}))
  await refresh()
  assert.equal(await marker(),undefined)
  assert.match(await evaluate(`document.querySelector('${control}').innerText`),/desired: disabled/)
  await click('Enable local plugin')
  await until(()=>evaluate("document.querySelector('[data-mygo-local-plugin=marker]')?.textContent==='Disabled legacy note'"))
  stage = 'accepted legacy edit commits current composition and survives refresh'
  await refresh()
  assert.equal(await marker(),'Disabled legacy note')
  assert.doesNotMatch(await evaluate(`document.querySelector('${control}').innerText`),/Legacy device overlay restored/)
  stage = 'another-tab revision refuses mutation without changing runtime'
  const current = await evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(key)}))`)
  current.revision++
  await seed(current)
  await click('Disable local plugin')
  await until(()=>evaluate(`document.querySelector('${control}').innerText.includes('Another tab changed this device overlay')`))
  assert.equal(await marker(),'Disabled legacy note','revision refusal leaves actual active entry intact')
  stage = 'broken saved configuration recovers baseline without changing desired state'
  await seed(saved({'local-note':{config:{label:''},disabled:false}}))
  await refresh()
  assert.equal(await marker(),'Local note · editable')
  assert.match(await evaluate(`document.querySelector('${control}').innerText`),/operator configuration is running instead/)
  await click('Configure local plugin')
  assert.match(await evaluate(`document.querySelector('${control}').innerText`),/Saved desired configuration differs from runtime/)
  stage = 'stale composition is diagnosed and retained without partial reinterpretation'
  const stale = saved({'local-note':{config:{label:'Must not run'},disabled:false}})
  stale.base = stale.base.replace('Workbench','Changed operator label')
  await seed(stale); await refresh()
  assert.equal(await marker(),'Local note · editable')
  assert.match(await evaluate(`document.querySelector('${control}').innerText`),/Saved overlay ignored/)
  assert.deepEqual(await evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(key)}))`),stale)
  stage = 'removed legacy entry rejects whole overlay'
  await seed(saved({'local-shell':{config:{label:'Old shell'},disabled:true},'local-note':{config:{label:'Must not partially restore'},disabled:false}}))
  await refresh()
  assert.equal(await marker(),'Local note · editable')
  assert.match(await evaluate(`document.querySelector('${control}').innerText`),/Saved overlay ignored/)
  stage = 'legacy overlay cannot acquire entries introduced by migration'
  await seed(saved({'local-navigation':{config:{},disabled:false},'local-note':{config:{label:'Must not acquire new entries'},disabled:false}}))
  await refresh()
  assert.equal(await marker(),'Local note · editable','legacy data cannot target a newly introduced entry')
  assert.match(await evaluate(`document.querySelector('${control}').innerText`),/Saved overlay ignored/)
  stage = 'malformed overlay restores operator baseline with diagnosis'
  await evaluate(`localStorage.setItem(${JSON.stringify(key)},'{invalid JSON')`)
  await refresh()
  assert.equal(await marker(),'Local note · editable')
  assert.match(await evaluate(`document.querySelector('${control}').innerText`),/Saved overlay ignored/)
  stage = 'reset through original Settings restores editable baseline'
  await evaluate("document.querySelector('[aria-label=\"Account menu\"]').click()")
  await until(()=>evaluate("[...document.querySelectorAll('[role=menuitem]')].some(x=>x.innerText.includes('Settings'))"))
  await evaluate("[...document.querySelectorAll('[role=menuitem]')].find(x=>x.innerText.includes('Settings')).click()")
  await until(()=>evaluate("!!document.querySelector('[data-shortcut-modal=settings]')"))
  await evaluate("[...document.querySelectorAll('[data-shortcut-modal=settings] button')].find(x=>x.innerText==='LOCAL plugins').click()")
  await evaluate("[...document.querySelectorAll('button')].find(x=>x.innerText==='Reset this device to operator startup').click()")
  await pause(300); await openPlugins()
  assert.equal(await marker(),'Local note · editable')
  assert.equal(await evaluate(`localStorage.getItem(${JSON.stringify(key)})`),null)
  await click('Disable local plugin')
  await until(()=>evaluate("!document.querySelector('[data-mygo-local-plugin=marker]')"))
  await click('Enable local plugin')
  await until(()=>evaluate("!!document.querySelector('[data-mygo-local-plugin=marker]')"))
  assert.deepEqual(settings(await rpc('settings/describe')),beforeSettings,'overlay restore/recovery leaves Host settings unchanged')
  assert.deepEqual(plugins(await rpc('pluginInventory/list')),beforePlugins,'overlay restore/recovery leaves Host inventory unchanged')
  assert.deepEqual(mutations.slice(start),[],'overlay workflows send no Host management writes')
  const expected = await evaluate("fetch('/mygo-local/startup.json').then(r=>r.json()).then(c=>c.entries.length)")
  assert.equal(await evaluate("document.querySelectorAll('[data-plugin-source=LOCAL]').length"),expected,'curated entries drive count')
  await writeFile(scratch+'/overlay-result.json',JSON.stringify({ok:true,legacyRuntimeRestored:true,refresh:true,restart:true,disabledRestored:true,brokenConfigRecovered:true,staleRejected:true,removedEntryRejected:true,newEntryRejected:true,malformedRejected:true,staleRevisionRefused:true,currentOverlayRestored:true,settingsReset:true,hostUnchanged:true,hostMutations:mutations.slice(start)}),{mode:0o600})
  await writeFile(scratch+'/overlay.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'))
  console.log('Legacy overlay runtime restoration, restart, recovery, reset and Host boundaries passed')
  await Promise.race([send('Browser.close'), pause(5000)])
} catch (error) {
  await writeFile(scratch + '/overlay-failure.json', JSON.stringify({ stage, error: error.message, errors, mutations, text: evaluate ? await evaluate('document.body.innerText').catch(() => '') : '' }), { mode: 0o600 })
  throw error
} finally {
  ws?.close()
  if (browser.exitCode === null) { browser.kill('SIGTERM'); await new Promise(r => browser.once('exit', r)) }
}

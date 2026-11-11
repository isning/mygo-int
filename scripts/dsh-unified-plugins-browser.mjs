// Original Plugins page and native client-tab acceptance; real Host and authority.
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
let ws, evaluate, restoreBadgeFixture, stage = 'login'
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
  await until(() => evaluate("!!document.querySelector('[data-mygo-local-plugin=marker]')"))
  await evaluate("[...document.querySelectorAll('button')].find(x => x.innerText === 'Continue')?.click()")
  await evaluate("[...document.querySelectorAll('button')].find(x => x.getAttribute('aria-label') === 'Open sidebar')?.click()")
  await until(() => evaluate("[...document.querySelectorAll('button,[role=button]')].some(x => x.innerText === 'Plugins')"))
  // Initial onboarding may explicitly save Host preferences; inspect only the Plugins workflow.
  mutations.length = 0
  await evaluate("[...document.querySelectorAll('button,[role=button]')].find(x => x.innerText === 'Plugins').click()")
  await pause(700)
  await until(() => evaluate("!!document.querySelector('[data-plugin-panel] [data-plugin-package]')"))
  assert.equal(await evaluate("!!document.querySelector('[data-mygo-unified-plugins]')"), false, 'the custom replacement page is removed')
  assert.equal(await evaluate("!!document.querySelector('[data-plugin-toolbar]')"), true, 'original header and toolbar remain')
  await until(() => evaluate("document.querySelectorAll('[data-plugin-item] [data-plugin-side=Client][data-active=true]').length === 4"))
  assert.equal(await evaluate("[...document.querySelectorAll('[data-plugin-item]')].every(x=>x.querySelector('[data-plugin-side=Remote][data-active=true]') && x.querySelector('[data-plugin-side=Client][data-active=true]'))"),true,'all four builtin cards show actual active Remote and Client sides')
  await evaluate("document.querySelector('[data-plugin-item=subagent] button').click()")
  await until(() => evaluate("!!document.querySelector('[data-plugin-item-detail=subagent] [data-mygo-runtime-details]')"))
  assert.equal(await evaluate("!!document.querySelector('[data-plugin-bar]')"), false, 'Installed detail hides its list header')
  assert.equal(await evaluate("document.querySelector('[data-plugin-item-detail=subagent] [data-mygo-runtime-details]').innerText.includes('@deepseek-ai/dsh-client-ui-settings-subagent')"),true,'builtin details identify the actual module')
  assert.ok(await evaluate("document.querySelectorAll('[data-plugin-item-detail=subagent] input').length") > 0,'original builtin configuration form is retained')
  await writeFile(scratch+'/plugins-builtin-details.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'))
  await evaluate("document.querySelector('[data-plugin-item-detail=subagent] button').click()")
  const tab = async label => {
    await evaluate(`[...document.querySelectorAll('[role=tab]')].find(x => x.innerText === ${JSON.stringify(label)}).click()`)
    await pause(200)
  }
  const rpc = method => evaluate(`fetch('/api/${method}',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type:'client-request',rpcId:'ui-read-'+Date.now(),method:'${method}',payload:{args:{}}})}).then(r=>r.json())`)
  const settings = reply => { assert.equal(reply.result?.ok,true); return reply.result.value.namespaces.map(({ns,value,base,user,revision})=>({ns,value,base,user,revision})) }
  const beforeSettings = settings(await rpc('settings/describe'))
  const beforeInventory = await rpc('pluginInventory/list')
  mutations.length = 0
  const openClientSettings = async () => {
    await evaluate("document.querySelector('[aria-label=\"Account menu\"]').click()")
    await until(() => evaluate("[...document.querySelectorAll('[role=menuitem]')].some(x=>x.innerText.includes('Settings'))"))
    await evaluate("[...document.querySelectorAll('[role=menuitem]')].find(x=>x.innerText.includes('Settings')).click()")
    await until(() => evaluate("!!document.querySelector('[data-shortcut-modal=settings]')"))
    await evaluate("[...document.querySelectorAll('[data-shortcut-modal=settings] nav button')].find(x=>x.innerText==='Client').click()")
    await until(() => evaluate("!!document.querySelector('[data-mygo-client-settings]')"))
  }
  await openClientSettings()
  assert.equal(await evaluate("!!document.querySelector('[data-mygo-client-settings] [data-plugin-rows], [data-mygo-client-settings] textarea')"),false,'Client settings contain no duplicate plugin list or JSON editor')
  assert.equal(await evaluate("document.querySelector('[data-client-advanced]').open"),false,'recovery controls are collapsed by default')
  await evaluate("document.querySelector('[data-client-advanced] summary').click()")
  await evaluate("[...document.querySelectorAll('[data-client-advanced] button')].find(x=>x.innerText==='Restore defaults').click()")
  await until(() => evaluate("[...document.querySelectorAll('[role=dialog]')].some(x=>x.innerText.includes('Restore client defaults?'))"))
  await evaluate("[...document.querySelectorAll('[role=dialog] button')].find(x=>x.innerText==='Cancel').click()")
  assert.equal(await evaluate("!!document.querySelector('[data-mygo-client-settings]')"),true,'cancel leaves Client settings and preferences intact')
  await writeFile(scratch+'/settings-client.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'))
  await evaluate("[...document.querySelectorAll('[data-mygo-client-settings] button')].find(x=>x.innerText==='Manage plugins').click()")
  await until(() => evaluate("!document.querySelector('[data-shortcut-modal=settings]') && !!document.querySelector('[data-mygo-plugin-source=LOCAL]')"))
  assert.equal(await evaluate("document.querySelector('[role=tab][aria-selected=true]').innerText"),'Local','Manage plugins closes Settings and opens the Local list')
  await tab('Local')
  await until(() => evaluate("!!document.querySelector('[data-mygo-plugin-source=LOCAL] [data-plugin-package=\"./plugins/marker.js\"]')"))
  const localCount = await evaluate("document.querySelectorAll('[data-mygo-plugin-source=LOCAL] [data-plugin-package], [data-mygo-plugin-source=LOCAL] [data-plugin-item]').length")
  const note = '[data-plugin-package="./plugins/marker.js"]'
  assert.equal(await evaluate("document.querySelectorAll('[data-local-plugin-group=basic] [data-plugin-item]').length"),5,'builtin Local plugins use the original group/card layout')
  assert.equal(await evaluate("document.querySelectorAll('[data-local-plugin-group=extensions] [data-plugin-package]').length"),1,'experimental Local contribution has its own group')
  const originalLabel = await evaluate("document.querySelector('[data-mygo-local-plugin=marker]').textContent")
  assert.equal(await evaluate("document.querySelectorAll('[data-local-plugin-group=basic] [role=switch]').length"), 0, 'builtin cards follow original settings-item structure without package switches')
  await send('Emulation.setDeviceMetricsOverride', {width:390,height:600,deviceScaleFactor:1,mobile:true})
  await evaluate("document.querySelector('[data-plugin-body]').scrollTop = document.querySelector('[data-plugin-body]').scrollHeight")
  await pause(150)
  await evaluate("document.querySelector('[data-local-plugin-group=basic] [data-plugin-item] button').click()")
  await until(() => evaluate("!!document.querySelector('[data-plugin-item-detail]')"))
  await pause(200)
  assert.equal(await evaluate("!!document.querySelector('[data-plugin-bar], [data-plugin-header-part=title], [role=tablist]')"), false, 'local detail uses official outer navigation and hides the list header and tabs')
  await writeFile(scratch+'/plugins-local-header.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'))
  await send('Emulation.setDeviceMetricsOverride', {width:1440,height:1000,deviceScaleFactor:1,mobile:false})
  assert.equal(await evaluate("!!document.querySelector('[data-plugin-item-detail] [data-plugin-name], [data-plugin-item-detail] [data-plugin-rows]')"), false, 'builtin detail uses the original item page, not package or component metadata')
  await evaluate("document.querySelector('[data-plugin-item-detail] button').click()")
  await until(() => evaluate("!!document.querySelector('[data-plugin-bar] [data-plugin-header-part=title]')"))
  assert.equal(await evaluate("document.querySelector('[role=tab][aria-selected=true]').innerText"), 'Local', 'back returns to the Local list and shared header')
  await evaluate(`document.querySelector('${note} [role=switch]').click()`)
  await until(() => evaluate("!document.querySelector('[data-mygo-local-plugin=marker]')"))
  await evaluate(`document.querySelector('${note} [role=switch]').click()`)
  await until(() => evaluate("!!document.querySelector('[data-mygo-local-plugin=marker]')"))
  await writeFile(scratch+'/plugins-local.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'))
  await evaluate(`document.querySelector('${note} button:not([role=switch])').click()`)
  await until(() => evaluate("!!document.querySelector('[data-plugin-detail] [data-plugin-rows]')"))
  assert.equal(await evaluate("!!document.querySelector('[data-plugin-bar]')"), false, 'local package detail hides the list header just like Installed')
  await writeFile(scratch+'/plugins-local-package.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'))
  await evaluate("document.querySelector('[data-plugin-detail] [data-plugin-row] button:not([role=switch])').click()")
  await until(() => evaluate("!!document.querySelector('[data-plugin-row-detail] [data-local-plugin-actions]')"))
  await evaluate("document.querySelector('[data-local-plugin-actions] button[aria-label=\"Configure local plugin\"]').click()")
  const save = async label => {
    await evaluate(`(() => { const el=document.querySelector('[data-local-plugin-actions] textarea'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(el,${JSON.stringify(JSON.stringify({label}))}); el.dispatchEvent(new Event('input',{bubbles:true})); })()`)
    await evaluate("[...document.querySelectorAll('[data-local-plugin-actions] button')].find(x=>x.innerText==='Save and apply locally').click()")
    await until(() => evaluate(`document.querySelector('[data-mygo-local-plugin=marker]')?.textContent === ${JSON.stringify(label)}`))
  }
  await save('Original page local configuration')
  await save(originalLabel)
  await evaluate("document.querySelector('[data-plugin-row-detail] button').click()")
  await until(() => evaluate("!!document.querySelector('[data-plugin-detail]')"))
  await evaluate("document.querySelector('[data-plugin-detail] button').click()")
  await until(() => evaluate("!!document.querySelector('[data-mygo-plugin-source=LOCAL]')"))
  assert.equal(await evaluate("[...document.querySelectorAll('[role=tab]')].some(x=>x.innerText==='Instance client')"), false, 'no separate client inventory tab')
  await openClientSettings()
  await evaluate("document.querySelector('[data-client-advanced] summary').click()")
  await evaluate("document.querySelector('[data-client-advanced] button').click()")
  await until(() => evaluate("[...document.querySelectorAll('[role=dialog]')].some(x=>x.innerText.includes('Restore client defaults?'))"))
  await evaluate("globalThis.__MYGO_CLIENT_RESET_CHECK__ = true")
  await evaluate("[...document.querySelectorAll('[role=dialog][aria-label=\"Restore client defaults?\"] button')].find(x=>x.innerText==='Restore defaults').click()")
  await until(() => evaluate("!globalThis.__MYGO_CLIENT_RESET_CHECK__ && __ModuleLoader__?.mode==='live' && !!document.querySelector('[data-mygo-local-plugin=marker]')"))
  assert.equal(await evaluate("document.querySelector('[data-mygo-local-plugin=marker]').textContent"),originalLabel,'confirmed restore reloads the default device composition')
  await evaluate("[...document.querySelectorAll('button')].find(x=>x.innerText==='Plugins').click()")
  await until(() => evaluate("!!document.querySelector('[data-plugin-panel]')"))
  await tab('Local')
  assert.deepEqual(settings(await rpc('settings/describe')), beforeSettings, 'local management preserves Host settings/revisions')
  assert.deepEqual(await rpc('pluginInventory/list').then(answer=>answer.result), beforeInventory.result, 'local management preserves actual Host inventory')
  assert.equal(mutations.length,0,'local workflows perform no Host management writes')
  if (process.argv.includes('--local-only')) {
    await writeFile(scratch+'/local-structure-validation.json',JSON.stringify({ok:true,localCount,builtinItemStructure:true,experimentalPackageStructure:true,localToggle:true,localConfig:true,clientSettings:true,resetConfirmation:true,resetRestoresDefaults:true,hostMutations:mutations}),{mode:0o600})
    console.log('Original Local item/package hierarchy, lifecycle/configuration and unchanged Host state passed')
    await Promise.race([send('Browser.close'), pause(5000)])
  } else {
  await tab('Installed')
  await until(() => evaluate("document.querySelectorAll('[data-plugin-package]').length > 0"))
  await until(() => evaluate("!!document.querySelector('[data-plugin-package] [data-plugin-side=Remote]')"))
  assert.equal(await evaluate("[...document.querySelectorAll('[data-plugin-package]')].every(x=>x.querySelectorAll('[data-plugin-side=Remote]').length===1)"), true, 'original remote cards receive one Remote marker each')
  await evaluate("[...document.querySelectorAll('[data-plugin-panel] button')].find(x=>x.innerText.trim()==='More')?.click()")
  await pause(300)
  const fixture = '[data-plugin-package="@deepseek-ai/dsh-experimental-plugin-market-bundle"] [role=switch]'
  const initiallyEnabled = await evaluate(`document.querySelector('${fixture}').getAttribute('aria-checked') === 'true'`)
  {
    restoreBadgeFixture = async () => {
      const result = await evaluate("fetch('/api/pluginManager/setBundleEnabled',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type:'client-request',rpcId:'restore-fixture-'+Date.now(),method:'pluginManager/setBundleEnabled',payload:{args:{name:'@deepseek-ai/dsh-experimental-plugin-market-bundle',enabled:false}}})}).then(r=>r.json()).then(r=>r.result)")
      assert.equal(result.ok,true,'original Remote restores the fixture even from its detail page')
      assert.equal(result.value.application,'applied')
    }
    if (!initiallyEnabled) await evaluate(`document.querySelector('${fixture}').click()`)
  }
  await until(() => evaluate("!!document.querySelector('[data-plugin-side=Client][data-active=true]')"))
  const markers = await evaluate("[...document.querySelectorAll('[data-plugin-package]')].map(x=>({name:x.dataset.pluginPackage,sides:[...x.querySelectorAll('[data-plugin-side]')].map(y=>({side:y.dataset.pluginSide,active:y.dataset.active}))}))")
  assert.equal(new Set(markers.map(x=>x.name)).size,markers.length,'client matching never adds duplicate cards')
  assert.ok(markers.some(x=>x.sides.some(y=>y.side==='Client'&&y.active==='true')),'matching actual active client entries gives a green Client marker')
  await evaluate("document.querySelector('[data-plugin-package=\"@deepseek-ai/dsh-experimental-plugin-market-bundle\"] button:not([role=switch])').click()")
  await until(() => evaluate("!!document.querySelector('[data-plugin-detail] [data-plugin-rows]')"))
  await evaluate("[...document.querySelectorAll('[data-plugin-detail] [data-plugin-row]')].find(x=>x.innerText.includes('@deepseek-ai/dsh-client-ui-plugin-market')).querySelector('button:not([role=switch])').click()")
  await until(() => evaluate("!!document.querySelector('[data-plugin-row-detail] [data-mygo-runtime-details]')"))
  const componentDetails = await evaluate("document.querySelector('[data-plugin-row-detail] [data-mygo-runtime-details]').innerText")
  assert.ok(componentDetails.includes('@deepseek-ai/dsh-client-ui-plugin-market') && componentDetails.includes('Remote') && componentDetails.includes('Client') && componentDetails.includes('active'),'Components open real module, Entry and runtime state information')
  await writeFile(scratch+'/plugins-component-details.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'))
  await evaluate("document.querySelector('[data-plugin-row-detail] button').click()")
  await until(() => evaluate("!!document.querySelector('[data-plugin-detail]')"))
  await evaluate("document.querySelector('[data-plugin-detail] button').click()")
  await writeFile(scratch+'/plugins-original-desktop.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'))
  await send('Emulation.setDeviceMetricsOverride', {width:390,height:844,deviceScaleFactor:1,mobile:true})
  await pause(400)
  assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'),true,'original page fits a narrow viewport')
  await writeFile(scratch+'/plugins-original-mobile.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'))
  if (restoreBadgeFixture) { await restoreBadgeFixture(); await until(() => evaluate(`document.querySelector('${fixture}').getAttribute('aria-checked') === 'false'`)); restoreBadgeFixture=undefined }
  await writeFile(scratch+'/original-plugins-validation.json',JSON.stringify({ok:true,localCount,markers,builtinDetails:true,componentDetails:true,localGroups:true,originalMain:true,originalRowDetail:true,localToggle:true,localConfig:true,hostMutations:mutations,narrowViewport:true}),{mode:0o600})
  console.log('Original Plugins page, native Local tab and Remote/Client badges, local lifecycle/configuration and narrow viewport passed')
  await Promise.race([send('Browser.close'), pause(5000)])
  }
} catch (error) {
  await writeFile(scratch + '/unified-plugin-failure.json', JSON.stringify({ stage, error: error.message, errors, mutations, text: evaluate ? await evaluate('document.body.innerText').catch(() => '') : '' }), { mode: 0o600 })
  throw error
} finally {
  await restoreBadgeFixture?.().catch(() => {})
  ws?.close()
  if (browser.exitCode === null) { browser.kill('SIGTERM'); await new Promise(r => browser.once('exit', r)) }
}

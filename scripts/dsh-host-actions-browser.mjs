// Complete-client acceptance for ticket 56; real Host, original browser authority.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { openSync } from 'node:fs'
import { resolve } from 'node:path'
const scratch = resolve('.scratch/test-dsh')
const profile = scratch + '/browser-host-actions-' + Date.now()
await mkdir(profile, { recursive: true, mode: 0o700 })
const log = openSync(scratch + '/host-actions-browser.log', 'a', 0o600)
const browser = spawn('nix', ['shell', 'nixpkgs#chromium', '-c', 'chromium', '--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], { stdio: ['ignore', log, log] })
const pause = ms => new Promise(r => setTimeout(r, ms))
async function until(fn) {
  for (let i = 0; i < 240; i++) {
    if (browser.exitCode !== null) throw Error('Chromium exited; inspect private host-actions-browser.log')
    const result = await fn().catch(() => undefined)
    if (result) return result
    await pause(250)
  }
  throw Error('Slot browser readiness timed out')
}
let ws, evaluate, stage = 'login', fixtureMayBeDisabled = false
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
  const selector = '[data-plugin-source=HOST][data-module-name="@mygo/dsh-host-action-fixture"]'
  await until(() => evaluate(`!!document.querySelector('${selector}')`))
  await pause(700)
  assert.equal(await evaluate(`!!document.querySelector('${selector} [data-mygo-host-actions] button')`), true,
    'Host fixture row exposes its original-controller action')
  const localSnapshot = () => evaluate(`(() => { const ctx=globalThis.__HOST_ACTION_TEST_CONTEXT__; return {rows:ctx.clientComposition.rows(),entries:[...ctx.loader.entries()].filter(e=>ctx.mygoStartup.ownsEntry(e)).map(e=>({id:e.id,config:e.options.config,disabled:e.disabled,state:e.fiber?.state})),storage:{...localStorage}} })()`)
  const before = await localSnapshot()
  const fixtureStatus = () => evaluate("fetch('/api/mygo-host-action-fixture').then(r=>r.status)")
  assert.equal(await fixtureStatus(),200,'real fixture service is active')
  const click = () => evaluate(`document.querySelector('${selector} [data-mygo-host-actions] button').click()`)
  await until(() => evaluate(`!document.querySelector('${selector} [data-mygo-host-actions] button').disabled`))
  fixtureMayBeDisabled = true
  await click()
  await until(async () => (await fixtureStatus()) === 404)
  await until(() => evaluate(`document.querySelector('${selector} [data-mygo-host-actions] [role=status]')?.innerText.includes('applied')`))
  assert.ok(await evaluate(`document.querySelector('${selector} [data-mygo-host-actions]').innerText.includes('Enable on Host')`))
  const disabledText = await evaluate(`document.querySelector('${selector} [data-mygo-host-actions]').innerText`)
  await evaluate(`document.querySelector('${selector}').scrollIntoView({block:'center'})`)
  await writeFile(scratch+'/host-actions-disabled.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'))
  assert.deepEqual(await localSnapshot(),before,'Host disable leaves local Entries/config/device overlays unchanged')
  await click()
  await until(async () => (await fixtureStatus()) === 200)
  fixtureMayBeDisabled = false
  await until(() => evaluate(`document.querySelector('${selector} [data-mygo-host-actions] [role=status]')?.innerText.includes('applied')`))
  assert.deepEqual(await localSnapshot(),before,'Host restore leaves local Entries/config/device overlays unchanged')
  // Original business refusal, not a fabricated transport failure: the owned
  // fixture's stale id is submitted to the original public Remote. The UI
  // lookup blocks stale rows; this checks the retained backend envelope.
  const refusal = await evaluate(`globalThis.__HOST_ACTION_TEST_CONTEXT__.remote.pluginManager.setPluginEnabled('missing-owned-host-fixture',false)`)
  assert.equal(refusal.ok,true)
  assert.equal(refusal.value.application,'failed')
  assert.equal(refusal.value.error.code,'unknown-plugin')
  const readonly = await evaluate("[...document.querySelectorAll('[data-plugin-source=HOST] [data-mygo-host-actions]')].filter(x=>x.innerText.includes('read-only')).map(x=>x.innerText)")
  assert.ok(readonly.some(x=>/management-required|unaddressable/.test(x)),'unsupported Host rows explain original refusal')
  // Browser authority failure must render honestly in the same component.
  // Keep private cookie data in memory only; HTTP RPC uses this cookie jar.
  const cookies = (await send('Network.getCookies')).cookies
  for (const cookie of cookies) await send('Network.deleteCookies',{name:cookie.name,domain:cookie.domain,path:cookie.path})
  await click()
  await until(() => evaluate(`!!document.querySelector('${selector} [role=alert]')`))
  const refusalText = await evaluate(`document.querySelector('${selector} [role=alert]').innerText`)
  assert.ok(/401|unauthorized|auth|failed|denied|HTTP/i.test(refusalText),refusalText)
  for (const cookie of cookies) {
    const {name,value,domain,path,secure,httpOnly,sameSite,expires} = cookie
    await send('Network.setCookie',{name,value,domain,path,secure,httpOnly,sameSite,...expires>0?{expires}:{}})
  }
  assert.equal(await fixtureStatus(),200,'refused unauthenticated action did not stop fixture')
  assert.deepEqual(await localSnapshot(),before,'refusal preserves local state')
  assert.ok(mutations.filter(x=>x==='/api/pluginManager/setPluginEnabled').length>=3)
  assert.ok(mutations.every(x=>x==='/api/pluginManager/setPluginEnabled'),'only explicit Host entry actions issue management writes')
  await writeFile(scratch+'/host-action-result.json',JSON.stringify({ok:true,disabledText,refusalText,refusal,readonly:readonly.slice(0,3),localUnchanged:true,hostMutations:mutations}),{mode:0o600})
  await evaluate(`document.querySelector('${selector}').scrollIntoView({block:'center'})`)
  await writeFile(scratch+'/host-actions.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'))
  console.log('Real Host fixture disabled/restored; browser refusal visible; local state unchanged')
  await Promise.race([send('Browser.close'), pause(5000)])
} catch (error) {
  await writeFile(scratch + '/host-action-failure.json', JSON.stringify({ stage, error: error.message, errors, mutations, text: evaluate ? await evaluate('document.body.innerText').catch(() => '') : '' }), { mode: 0o600 })
  throw error
} finally {
  // A failed assertion after disable must not leave the owned fixture stopped.
  if (fixtureMayBeDisabled && evaluate) {
    const restore = evaluate(`(async () => { const remote=globalThis.__HOST_ACTION_TEST_CONTEXT__.remote; const listed=await remote.pluginManager.listPlugins(); if(!listed.ok) throw Error('Host fixture restore lookup refused'); const row=listed.value.find(x=>x.moduleName==='@mygo/dsh-host-action-fixture'); if(!row) throw Error('Host fixture missing during cleanup'); return row.enabled ? {alreadyEnabled:true} : remote.pluginManager.setPluginEnabled(row.entryId,true); })()`)
    const outcome = await Promise.race([restore.catch(error=>({error:error.message})),pause(10000).then(()=>({error:'restore timed out'}))])
    await writeFile(scratch+'/host-action-cleanup.json',JSON.stringify(outcome),{mode:0o600})
  }
  ws?.close()
  if (browser.exitCode === null) { browser.kill('SIGTERM'); await new Promise(r => browser.once('exit', r)) }
}

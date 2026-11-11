// Complete-client acceptance for ticket 59; real Host, original browser authority.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { openSync } from 'node:fs'
import { resolve } from 'node:path'
const scratch = resolve('.scratch/test-dsh')
const profile = scratch + '/browser-composition-diagnosis-' + Date.now()
await mkdir(profile, { recursive: true, mode: 0o700 })
const log = openSync(scratch + '/composition-diagnosis-browser.log', 'a', 0o600)
const browser = spawn('nix', ['shell', 'nixpkgs#chromium', '-c', 'chromium', '--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], { stdio: ['ignore', log, log] })
const pause = ms => new Promise(r => setTimeout(r, ms))
async function until(fn) {
  for (let i = 0; i < 240; i++) {
    if (browser.exitCode !== null) throw Error('Chromium exited; inspect private composition-diagnosis-browser.log')
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
    if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text)
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
  stage = 'duplicate identity diagnosis'
  const before = await evaluate(`(async () => {
    const ctx = globalThis.__COMPOSITION_DIAGNOSIS_CTX__;
    globalThis.__DIAGNOSIS_RETAINED__ = [...ctx.loader.entries()].map(entry => ({entry, fiber:entry.fiber, namespace:entry.moduleNamespace}));
    const host = await ctx.remote.pluginInventory.list();
    const settings = await ctx.remote.settings.describe();
    if (!host.ok || !settings.ok) throw Error('Original Host reads refused');
    return {host:host.value, settings:settings.value.namespaces.map(({ns,value,base,user,revision})=>({ns,value,base,user,revision}))};
  })()`)
  const mutationStart = mutations.length
  const rejection = await evaluate(`(async () => {
    const ctx = globalThis.__COMPOSITION_DIAGNOSIS_CTX__;
    const graph = globalThis.__DSH_BOOT__;
    const target = graph.entries.find(row=>row.id === '@deepseek-ai/dsh-client-ui-settings-account');
    try { await ctx.modules.entries.sync({...graph, entries:[...graph.entries,target]}); }
    catch(error) { return String(error); }
  })()`)
  assert.match(rejection, /duplicate graph entry.*@deepseek-ai\/dsh-client-ui-settings-account/)
  await pause(1200)
  const text = await evaluate("document.querySelector('[data-mygo-unified-plugins]').innerText")
  assert.match(text, /Original reconciliation · graph:.*duplicate graph entry.*@deepseek-ai\/dsh-client-ui-settings-account/,
    'original Plugins page retains the rejected graph diagnostic with the original package identity')
  await evaluate(`document.querySelector('[data-plugin-source="INSTANCE CLIENT"][data-module-name="@deepseek-ai/dsh-client-ui-settings-account"]').scrollIntoView({block:'start'})`)
  await writeFile(scratch+'/composition-diagnosis.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'),{mode:0o600})
  assert.equal(await evaluate(`(() => {
    const entries=[...globalThis.__COMPOSITION_DIAGNOSIS_CTX__.loader.entries()];
    return entries.length === __DIAGNOSIS_RETAINED__.length && __DIAGNOSIS_RETAINED__.every(({entry,fiber,namespace})=>entries.includes(entry) && entry.fiber===fiber && entry.moduleNamespace===namespace);
  })()`), true, 'all actual local and remote Entry, module and fiber identities survive rejection')
  const after = await evaluate(`(async () => {
    const ctx=globalThis.__COMPOSITION_DIAGNOSIS_CTX__;
    return {host:(await ctx.remote.pluginInventory.list()).value, settings:(await ctx.remote.settings.describe()).value.namespaces.map(({ns,value,base,user,revision})=>({ns,value,base,user,revision}))};
  })()`)
  assert.deepEqual(after,before,'Host inventory and settings remain unchanged')
  assert.equal(mutations.slice(mutationStart).length,0,'no Host mutation accompanies graph rejection')
  await evaluate('globalThis.__COMPOSITION_DIAGNOSIS_CTX__.modules.entries.sync(globalThis.__DSH_BOOT__)')
  await until(()=>evaluate("!document.querySelector('[data-mygo-unified-plugins]').innerText.includes('duplicate graph entry')"))
  stage = 'local ownership preflight diagnosis'
  const ownership = await evaluate(`(async () => {
    const ctx=globalThis.__COMPOSITION_DIAGNOSIS_CTX__, graph=globalThis.__DSH_BOOT__;
    const local=[...ctx.loader.entries()].find(entry=>ctx.mygoStartup.ownsEntry(entry));
    try { await ctx.modules.entries.sync({...graph,entries:[...graph.entries,{id:local.options.name,rev:'controlled-conflict',url:'/never-import-local.js'}]}); }
    catch(error) { return {error:String(error),name:local.options.name}; }
  })()`)
  assert.match(ownership.error,/Local module ownership conflict/)
  await until(()=>evaluate("document.querySelector('[data-mygo-unified-plugins]').innerText.includes('Local module ownership conflict')"))
  assert.equal(await evaluate(`(() => {
    const entries=[...globalThis.__COMPOSITION_DIAGNOSIS_CTX__.loader.entries()];
    return entries.length === __DIAGNOSIS_RETAINED__.length && __DIAGNOSIS_RETAINED__.every(({entry,fiber,namespace})=>entries.includes(entry) && entry.fiber===fiber && entry.moduleNamespace===namespace);
  })()`),true,'local ownership rejection preserves every concrete Entry and fiber')
  await evaluate('globalThis.__COMPOSITION_DIAGNOSIS_CTX__.modules.entries.sync(globalThis.__DSH_BOOT__)')
  await until(()=>evaluate("!document.querySelector('[data-mygo-unified-plugins]').innerText.includes('Local module ownership conflict')"))
  const finalHost = await evaluate(`(async () => {
    const ctx=globalThis.__COMPOSITION_DIAGNOSIS_CTX__;
    return {host:(await ctx.remote.pluginInventory.list()).value, settings:(await ctx.remote.settings.describe()).value.namespaces.map(({ns,value,base,user,revision})=>({ns,value,base,user,revision}))};
  })()`)
  assert.deepEqual(finalHost,before,'both rejected graphs preserve original Host inventory and configuration')
  assert.equal(mutations.slice(mutationStart).length,0)
  stage = 'distinct original Loader failure'
  await send('Network.setBlockedURLs', {urls:['*dsh-client-ui-settings-account/client.js*']})
  await evaluate(`(async () => {
    const ctx=globalThis.__COMPOSITION_DIAGNOSIS_CTX__;
    const id='@deepseek-ai/dsh-client-ui-settings-account';
    const entry=[...ctx.loader.entries()].find(entry=>entry.options.name===id);
    const original=await ctx.modules.import('@deepseek-ai/dsh-client-modules','',{});
    await original.tearDownEntryFiber(entry);
    ctx.modules.invalidate(id);
    await entry.refresh().catch(()=>{});
    await ctx.loader.await();
    if (entry.fiber || !ctx.modules.importError(id)) throw Error('Original optional import did not fail');
  })()`)
  await until(()=>evaluate(`document.querySelector('[data-plugin-source="INSTANCE CLIENT"][data-module-name="@deepseek-ai/dsh-client-ui-settings-account"]').innerText.includes('import failed')`))
  assert.equal(await evaluate("document.querySelector('[data-mygo-unified-plugins]').innerText.includes('duplicate graph entry')"),false,'original Loader import failure is not relabelled as a duplicate identity')
  await send('Network.setBlockedURLs',{urls:[]})
  await evaluate('globalThis.__COMPOSITION_DIAGNOSIS_CTX__.modules.entries.retry()')
  await until(()=>evaluate(`(() => {const ctx=globalThis.__COMPOSITION_DIAGNOSIS_CTX__; return [...ctx.loader.entries()].find(entry=>entry.options.name==='@deepseek-ai/dsh-client-ui-settings-account')?.fiber?.state===2})()`))
  await writeFile(scratch+'/composition-diagnosis-result.json',JSON.stringify({ok:true,rejection,ownership,identitiesUnchanged:true,hostUnchanged:true,originalLoaderFailureDistinct:true,hostMutations:mutations.slice(mutationStart)}),{mode:0o600})
  console.log('Duplicate identity: visible original diagnosis, unchanged concrete entries and Host state, valid graph recovery passed')
  await Promise.race([send('Browser.close'), pause(5000)])
} catch (error) {
  await writeFile(scratch + '/composition-diagnosis-failure.json', JSON.stringify({ stage, error: error.message, errors, mutations, text: evaluate ? await evaluate('document.body.innerText').catch(() => '') : '' }), { mode: 0o600 })
  throw error
} finally {
  ws?.close()
  if (browser.exitCode === null) { browser.kill('SIGTERM'); await new Promise(r => browser.once('exit', r)) }
}

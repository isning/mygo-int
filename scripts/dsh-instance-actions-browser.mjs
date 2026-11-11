// Complete-client acceptance for ticket 57; real Host, original browser authority.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { openSync } from 'node:fs'
import { resolve } from 'node:path'
const scratch = resolve('.scratch/test-dsh')
const profile = scratch + '/browser-instance-actions-' + Date.now()
await mkdir(profile, { recursive: true, mode: 0o700 })
const log = openSync(scratch + '/instance-actions-browser.log', 'a', 0o600)
const browser = spawn('nix', ['shell', 'nixpkgs#chromium', '-c', 'chromium', '--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], { stdio: ['ignore', log, log] })
const pause = ms => new Promise(r => setTimeout(r, ms))
async function until(fn) {
  for (let i = 0; i < 240; i++) {
    if (browser.exitCode !== null) throw Error('Chromium exited; inspect private instance-actions-browser.log')
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
  // Bounded delivery-failure fixture: this fresh pristine build has the optional
  // asset. Block only its one-resource download after normal boot, then use the
  // original exported lifecycle helper and Loader refresh to reproduce its absence.
  await send('Network.setBlockedURLs', { urls: ['*dsh-client-ui-settings-account/client.js*'] })
  await evaluate(`(async () => {
    const ctx = globalThis.__INSTANCE_ACTIONS_CTX__;
    const id = '@deepseek-ai/dsh-client-ui-settings-account';
    const entry = [...ctx.loader.entries()].find(entry => entry.options.name === id);
    const original = await ctx.modules.import('@deepseek-ai/dsh-client-modules', '', {});
    await original.tearDownEntryFiber(entry);
    ctx.modules.invalidate(id);
    await entry.refresh().catch(() => {});
    await ctx.loader.await();
    if (entry.fiber || !ctx.modules.importError(id)) throw Error('Optional asset failure fixture did not fail through original Loader');
  })()`)
  await evaluate("[...document.querySelectorAll('button')].find(x => x.innerText === 'Continue')?.click()")
  await evaluate("[...document.querySelectorAll('button')].find(x => x.getAttribute('aria-label') === 'Open sidebar')?.click()")
  await until(() => evaluate("[...document.querySelectorAll('button,[role=button]')].some(x => x.innerText === 'Plugins')"))
  await evaluate("[...document.querySelectorAll('button,[role=button]')].find(x => x.innerText === 'Plugins').click()")
  await pause(700)
  assert.equal(await evaluate("!!document.querySelector('[data-mygo-unified-plugins]')"), true,
    'original Plugins page is overridden through its original main Slot')
  await until(() => evaluate("document.querySelectorAll('[data-plugin-source=HOST]').length > 0"))
  stage = 'instance client diagnostics and retry'
  const target = '[data-plugin-source="INSTANCE CLIENT"][data-module-name="@deepseek-ai/dsh-client-ui-settings-account"]'
  assert.equal(await evaluate(`!!document.querySelector('${target}')`), true, 'real optional account-settings client Entry is listed')
  assert.equal(await evaluate(`!!document.querySelector('${target} [data-instance-client-actions]')`), true,
    'instance client actions appear inside the original ownership-qualified article')
  const beforeText = await evaluate(`document.querySelector('${target}').innerText`)
  assert.match(beforeText, /Manifest owner/)
  assert.match(beforeText, /import failed/i, 'initial inactive optional asset retains original diagnostic')
  const snapshot = () => evaluate(`(async () => {
    const ctx = globalThis.__INSTANCE_ACTIONS_CTX__;
    const settings = await ctx.remote.settings.describe();
    const host = await ctx.remote.pluginInventory.list();
    if (!settings.ok || !host.ok) throw Error('Original Host reads refused');
    return { local: ctx.clientComposition.rows(), host: host.value,
      settings: settings.value.namespaces.map(({ns,value,base,user,revision})=>({ns,value,base,user,revision})) };
  })()`)
  const before = await snapshot(), mutationStart = mutations.length
  await evaluate(`document.querySelector('${target} [data-instance-retry]').click()`)
  await until(() => evaluate(`document.querySelector('${target} [role=status]')?.innerText.includes('Retry completed')`))
  const afterText = await evaluate(`document.querySelector('${target}').innerText`)
  assert.match(afterText, /Retry completed.*remaining failure/s, 'settled retry reports the real remaining failure')
  assert.match(afterText, /Original reconciliation.*could not load/s, 'new original reconciliation diagnostic is visible')
  assert.equal(await evaluate(`globalThis.__INSTANCE_ACTIONS_CTX__.modules.entries.state.getSnapshot().failures.some(x=>x.id==='@deepseek-ai/dsh-client-ui-settings-account')`), true)
  assert.equal(await evaluate(`document.querySelector('${target} [data-instance-retry]').disabled`), false, 'retry settles and permits another attempt')
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('${target} button')).filter(x=>x.disabled).length`), 3, 'independent install, upgrade and Host enable are explicitly unavailable')
  assert.deepEqual(await snapshot(), before, 'client retry preserves actual local entries and original Host inventory/settings')
  assert.equal(mutations.slice(mutationStart).length, 0, 'client retry issues no Host management mutation')
  await writeFile(scratch+'/instance-actions-result.json', JSON.stringify({ok:true,beforeText,afterText,localAndHostUnchanged:true,hostMutations:mutations.slice(mutationStart)}),{mode:0o600})
  await evaluate(`document.querySelector('${target}').scrollIntoView({block:'start'})`)
  await writeFile(scratch+'/instance-actions.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'),{mode:0o600})
  console.log('Original ClientEntries retry: initial import diagnostic, settled failure, unchanged local/Host state passed')
  await Promise.race([send('Browser.close'), pause(5000)])
} catch (error) {
  await writeFile(scratch + '/instance-actions-failure.json', JSON.stringify({ stage, error: error.message, errors, mutations, text: evaluate ? await evaluate('document.body.innerText').catch(() => '') : '' }), { mode: 0o600 })
  throw error
} finally {
  ws?.close()
  if (browser.exitCode === null) { browser.kill('SIGTERM'); await new Promise(r => browser.once('exit', r)) }
}

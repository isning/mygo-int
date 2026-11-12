// Original Plugins page and native client-tab acceptance; real Host and authority.
import assert from 'node:assert/strict'
import { verifyInstanceSwitch } from './dsh-instance-switch-scenario.mjs'
import { spawn } from 'node:child_process'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { openSync } from 'node:fs'
import { resolve } from 'node:path'
const uiAudit = process.argv.includes('--ui-audit')
const i18nOnly = process.argv.includes('--i18n-only') || uiAudit
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
      const path = new URL(p.request.url).pathname.replace(/^\/mygo-instance\/[a-f0-9]{64}(?=\/)/, '')
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
  const selectOfflineLanguage = async id => {
    await evaluate("document.querySelector('[data-mygo-language] button').click()")
    await until(() => evaluate("!!document.querySelector('[role=menu]')"))
    const label = {en:'English',zh:'中文',ja:'日本語',es:'Español',fr:'Français',de:'Deutsch',ru:'Русский',pt:'Português'}[id]
    await evaluate(`[...document.querySelectorAll('[role=menu] [role=menuitem]')].find(item => item.innerText.trim() === ${JSON.stringify(label)}).click()`)
  }
  const url = (await readFile(scratch + '/client-launch-url', 'utf8')).trim()
  if (process.argv.includes('--switch-instances')) {
    stage = 'real instance switching'
    await verifyInstanceSwitch({send,evaluate,until,scratch,launchURL:url})
    console.log('Two real DSH instances: route, login/cache isolation, original composer and failure recovery passed')
    await Promise.race([send('Browser.close'),pause(5000)])
  } else {
  await send('Page.navigate', { url: new URL(url).origin })
  await until(() => evaluate('document.readyState === "complete"'))
  assert.equal(await evaluate("fetch('/').then(r => r.status)"), 200)
  if (process.argv.includes('--offline-only') || i18nOnly) {
    stage = 'offline local shell'
    await until(() => evaluate("!!document.querySelector('[data-mygo-local-shell]') && document.body.innerText.includes('Connect to an instance')"))
    assert.equal(await evaluate("fetch('/mygo/status').then(r=>r.status)"),410,'an unscoped remote request has no implicit instance')
    assert.equal(await evaluate("document.body.innerText.includes('Sign in required')"),false,'the local shell does not invent a remote authentication state')
    assert.equal(await evaluate("document.body.innerText.includes('index injections HTTP 410')"),false,'an absent instance is not shown as an internal boot fault')
    if (i18nOnly) {
      for (const [language, heading] of Object.entries({en:'Connect to an instance',zh:'连接到实例',ja:'インスタンスに接続',es:'Conectar a una instancia',fr:'Se connecter à une instance',de:'Mit einer Instanz verbinden',ru:'Подключиться к экземпляру',pt:'Conectar a uma instância'})) {
        await selectOfflineLanguage(language)
        await until(() => evaluate(`document.documentElement.lang===${JSON.stringify(language==='zh'?'zh-CN':language)} && document.querySelector('[data-mygo-local-shell] main h1')?.innerText===${JSON.stringify(heading)}`))
      }
    }
    await selectOfflineLanguage('zh')
    await until(() => evaluate("document.documentElement.lang.startsWith('zh') && document.querySelector('[data-mygo-local-shell] main h1')?.innerText==='连接到实例'"))
    await send('Page.reload', {ignoreCache:true})
    await until(() => evaluate("document.documentElement.lang.startsWith('zh') && !!document.querySelector('[data-mygo-open-settings]')"))
    await evaluate("document.querySelector('[data-mygo-open-settings]').click()")
    await until(() => evaluate("document.querySelector('[data-mygo-instances] h2')?.innerText==='实例'"))
    assert.equal(await evaluate("document.querySelector('[data-mygo-instances]').innerText.includes('管理你的实例连接。')"),true)
    await evaluate("[...document.querySelectorAll('button')].find(x=>x.getAttribute('aria-label')==='关闭设置')?.click()")
    await selectOfflineLanguage('en')
    await until(() => evaluate("document.documentElement.lang==='en'"))

    await evaluate("document.querySelector('[data-mygo-open-settings]').click()")
    await until(() => evaluate("!!document.querySelector('[data-mygo-instances]')"))
    await evaluate("[...document.querySelectorAll('[data-mygo-instances] button')].find(x=>x.innerText==='Add instance').click()")
    await until(() => evaluate("!!document.querySelector('[data-instance-editor]')"))
    await evaluate(`(() => { for (const [label,value] of [['Name',${JSON.stringify(uiAudit ? 'Offline saved profile ' + 'W'.repeat(100) : 'Offline saved profile')}],['Address',${JSON.stringify(uiAudit ? 'https://' + 'a'.repeat(60) + '.' + 'b'.repeat(60) + '.example' : 'https://offline.example')}]]) { const input=document.querySelector('[data-instance-editor] input[aria-label="'+label+'"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value); input.dispatchEvent(new Event('input',{bubbles:true})); } })()`)
    await evaluate("document.querySelector('[data-instance-editor] button[type=submit]').click()")
    await until(() => evaluate("!document.querySelector('[data-instance-editor]') && document.body.innerText.includes('Offline saved profile')"))
    const remoteAddress = await evaluate("fetch('/mygo-local/startup.json').then(r=>r.json()).then(config=>config.instances.find(row=>row.id==='local-test-dsh').address)")
    assert.notEqual(remoteAddress,new URL(url).origin,'remote instance address differs from the client entry')
    const editProfile = async (name,address) => {
      await evaluate("document.querySelector('[data-instance-id=\"local-test-dsh\"] [aria-label^=\"Edit \"]').click()")
      await until(() => evaluate("!!document.querySelector('[data-instance-editor]')"))
      assert.equal(await evaluate("document.querySelector('[data-instance-editor] input[aria-label=Address]').disabled"),false,'connected profile address is editable like every other profile')
      await evaluate(`(() => { for(const [label,value] of [['Name',${JSON.stringify(name)}],['Address',${JSON.stringify(address)}]]) { const input=document.querySelector('[data-instance-editor] input[aria-label="'+label+'"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value); input.dispatchEvent(new Event('input',{bubbles:true})); } })()`)
      await evaluate("document.querySelector('[data-instance-editor] button[type=submit]').click()")
      await until(() => evaluate("!document.querySelector('[data-instance-editor]')"))
    }
    await editProfile('Personal DSH','https://personal.example')
    await send('Page.reload',{ignoreCache:true})
    await until(() => evaluate("!!document.querySelector('[data-mygo-open-settings]')"))
    await evaluate("document.querySelector('[data-mygo-open-settings]').click()")
    await until(() => evaluate("!!document.querySelector('[data-mygo-instances]')"))
    assert.equal(await evaluate("document.querySelector('[data-instance-id=\"local-test-dsh\"]').innerText.includes('https://personal.example')"),true,'edited profile address survives reload')
    await editProfile('Local test DSH',remoteAddress)
    assert.deepEqual(mutations,[],'device profile editing issues no Host management writes')
    if (uiAudit) {
      stage = 'offline responsive settings'
      for (const width of [360, 390, 768, 1440]) {
        await send('Emulation.setDeviceMetricsOverride', {width,height:900,deviceScaleFactor:1,mobile:width<768})
        await pause(200)
        assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'),true,`offline Instances fits ${width}px`)
        await writeFile(scratch+`/ui-offline-instances-${width}.png`,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'))
      }
    }
    await writeFile(scratch+'/offline-shell.png' ,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'))
    await writeFile(scratch+'/offline-shell-validation.json',JSON.stringify({ok:true,anonymousRemoteStatus:401,profileSavedWithoutRemote:true,profileSurvivedReload:true,hostManagementWrites:mutations}),{mode:0o600})
  }
  await send('Page.navigate', { url })
  await until(() => evaluate("!!document.querySelector('[data-mygo-local-plugin=marker]')"))
  await evaluate("[...document.querySelectorAll('button')].find(x => x.innerText === 'Continue')?.click()")
  await evaluate("[...document.querySelectorAll('button')].find(x => x.getAttribute('aria-label') === 'Open sidebar')?.click()")
  await until(() => evaluate("[...document.querySelectorAll('button,[role=button]')].some(x => ['Plugins','插件'].includes(x.innerText))"))
  // Initial onboarding may explicitly save Host preferences; inspect only the Plugins workflow.
  mutations.length = 0
  await evaluate("[...document.querySelectorAll('button,[role=button]')].find(x => ['Plugins','插件'].includes(x.innerText)).click()")
  await pause(700)
  await until(() => evaluate("!!document.querySelector('[data-plugin-panel] [data-plugin-package]')"))
  if (process.argv.includes('--touch-only') || process.argv.includes('--offline-only') || i18nOnly) {
    await until(() => evaluate("!!document.querySelector('[data-mygo-shared-client]')"))
    assert.equal(await evaluate("document.querySelector('[data-mygo-shared-client]').dataset.platformSingletons"),'true','diagnostic plugin sees original shared runtime')
    stage = 'mobile touch feedback'
    await send('Emulation.setDeviceMetricsOverride', {width:390,height:844,deviceScaleFactor:1,mobile:true})
    await send('Emulation.setTouchEmulationEnabled', {enabled:true,maxTouchPoints:1})
    await pause(200)
    const point = await evaluate("(() => { const el=[...document.querySelectorAll('[role=tab]')].find(x=>['Local','本地'].includes(x.innerText)); const r=el.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2} })()")
    await send('Input.dispatchTouchEvent', {type:'touchStart',touchPoints:[point]})
    await send('Input.dispatchTouchEvent', {type:'touchEnd',touchPoints:[]})
    await until(() => evaluate("['Local','本地'].includes(document.querySelector('[role=tab][aria-selected=true]')?.innerText)"))
    assert.equal(await evaluate("document.documentElement.dataset.inputModality"),'pointer','real touch uses original pointer modality')
    assert.equal(await evaluate("getComputedStyle(document.querySelector('[role=tab][aria-selected=true]')).webkitTapHighlightColor"),'rgba(0, 0, 0, 0)','browser tap flash is transparent')
    if (i18nOnly) {
      assert.equal(await evaluate("document.documentElement.lang"),'zh-CN','local UI adopts the real Host language')
      assert.equal(await evaluate("document.querySelector('[role=tab][aria-selected=true]').innerText"),'本地')
      assert.equal(await evaluate("document.querySelector('[data-plugin-package=\"./plugins/touch-feedback.js\"]').innerText.includes('触摸反馈')"),true)
      await writeFile(scratch+'/i18n-validation.json',JSON.stringify({ok:true,languages:['en','zh','ja','es','fr','de','ru','pt'],offlineSwitching:true,restoredAfterReload:true,adoptedHostLanguage:true,translatedMetadata:true}),{mode:0o600})
    }

    assert.equal(await evaluate("document.querySelectorAll('style[data-mygo-touch-feedback]').length"),1,'one plugin-owned stylesheet')
    const toggleTouch = () => evaluate("document.querySelector('[data-plugin-package=\"./plugins/touch-feedback.js\"] [role=switch]').click()")
    await toggleTouch()
    await until(() => evaluate("document.querySelectorAll('style[data-mygo-touch-feedback]').length===0"))
    assert.notEqual(await evaluate("getComputedStyle(document.querySelector('[role=tab][aria-selected=true]')).webkitTapHighlightColor"),'rgba(0, 0, 0, 0)','disable restores browser highlight')
    await toggleTouch()
    await until(() => evaluate("document.querySelectorAll('style[data-mygo-touch-feedback]').length===1"))
    await send('Input.dispatchKeyEvent', {type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9})
    await send('Input.dispatchKeyEvent', {type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9})
    const keyboard = await evaluate("(() => { const el=document.querySelector('[role=tab][aria-selected=true]'); el.focus(); const s=getComputedStyle(el); return {modality:document.documentElement.dataset.inputModality,visible:el.matches(':focus-visible'),outline:s.outlineStyle,width:parseFloat(s.outlineWidth),shadow:s.boxShadow,decoration:s.textDecorationLine} })()")
    assert.equal(keyboard.modality,'keyboard')
    assert.equal(keyboard.visible,true,'keyboard focus remains visible')
    assert.ok((keyboard.outline!=='none' && keyboard.width>0) || keyboard.shadow!=='none' || keyboard.decoration.includes('underline'),'original keyboard focus treatment is preserved')
    await writeFile(scratch+'/touch-feedback-validation.json',JSON.stringify({ok:true,touchNavigation:true,transparentTapHighlight:true,keyboard}),{mode:0o600})
    if (uiAudit) {
      stage = 'connected UI audit'
      const capture = async name => {
        for (const width of [360, 390, 768, 1440]) {
          await send('Emulation.setDeviceMetricsOverride', {width,height:900,deviceScaleFactor:1,mobile:width<768})
          await pause(200)
          assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'),true,`${name} fits ${width}px`)
          await writeFile(scratch+`/ui-${name}-${width}.png`,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'))
        }
      }
      await capture('plugins-local')
      await evaluate("[...document.querySelectorAll('[role=tab]')].find(x=>x.innerText==='已安装').click()")
      await until(() => evaluate("document.querySelectorAll('[data-plugin-item]').length>=4"))
      await capture('plugins-installed')
      await evaluate("document.querySelector('[data-plugin-item=subagent] button').click()")
      await until(() => evaluate("!!document.querySelector('[data-plugin-item-detail=subagent] [data-mygo-runtime-details]')"))
      assert.ok(await evaluate("document.querySelectorAll('[data-plugin-item-detail=subagent] input').length")>0,'original builtin configuration remains available')
      await capture('builtin-detail')
      await evaluate("document.querySelector('[data-plugin-item-detail=subagent] button').click()")
      await evaluate("[...document.querySelectorAll('[role=tab]')].find(x=>x.innerText==='发现').click()")
      await pause(300)
      await capture('plugins-discover')
      await evaluate("[...document.querySelectorAll('[role=tab]')].find(x=>x.innerText==='本地').click()")
      await until(() => evaluate("!!document.querySelector('[data-plugin-package=\"./plugins/marker.js\"]')"))
      await evaluate("document.querySelector('[data-plugin-package=\"./plugins/marker.js\"] button').click()")
      await until(() => evaluate("!!document.querySelector('[data-plugin-detail]')"))
      await capture('plugin-detail')
      const originalNote = await evaluate("document.querySelector('#local-note-text').value")
      await evaluate("(() => { const input=document.querySelector('#local-note-text'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'W'.repeat(160)); input.dispatchEvent(new Event('input',{bubbles:true})); })()")
      await evaluate("[...document.querySelectorAll('[data-plugin-config] button')].find(x=>x.innerText==='保存').click()")
      await until(() => evaluate("document.querySelector('[data-mygo-local-plugin=marker]')?.innerText==='W'.repeat(160)"))
      assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'),true,'long note remains inside the sidebar')
      await evaluate(`(() => { const input=document.querySelector('#local-note-text'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(originalNote)}); input.dispatchEvent(new Event('input',{bubbles:true})); })()`)
      await evaluate("[...document.querySelectorAll('[data-plugin-config] button')].find(x=>x.innerText==='保存').click()")
      await until(() => evaluate(`document.querySelector('[data-mygo-local-plugin=marker]')?.innerText===${JSON.stringify(originalNote)}`))
      await evaluate("document.querySelector('[data-mygo-navigation] button').click()")
      await until(() => evaluate("[...document.querySelectorAll('[role=menuitem]')].some(x=>x.innerText==='管理实例')"))
      await evaluate("[...document.querySelectorAll('[role=menuitem]')].find(x=>x.innerText==='管理实例').click()")
      await until(() => evaluate("!!document.querySelector('[data-shortcut-modal=settings] [data-mygo-instances]')"))
      await capture('instances')
      await evaluate("[...document.querySelectorAll('[data-shortcut-modal=settings] nav button')].find(x=>x.innerText==='客户端').click()")
      await until(() => evaluate("!!document.querySelector('[data-mygo-client-settings]')"))
      await capture('client-settings')
      assert.deepEqual(mutations,[],'UI inspection changes no Host management state')
      await writeFile(scratch+'/ui-audit-validation.json',JSON.stringify({ok:true,widths:[360,390,768,1440],pages:['offline-instances','plugins-local','plugins-installed','builtin-detail','plugins-discover','plugin-detail','instances','client-settings'],longProfile:true,longNote:true,hostManagementWrites:mutations}),{mode:0o600})
    }
    console.log('Real mobile touch navigation, transparent tap highlight and original keyboard focus passed')
    await Promise.race([send('Browser.close'),pause(5000)])
  } else {
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
  const openClientSettings = async (attempt = 0) => {
    if (!await evaluate("!!document.querySelector('[data-plugin-panel]')")) {
      await until(() => evaluate("[...document.querySelectorAll('button')].some(x=>x.innerText==='Plugins')"))
      await evaluate("[...document.querySelectorAll('button')].find(x=>x.innerText==='Plugins').click()")
      await until(() => evaluate("!!document.querySelector('[data-plugin-panel]')"))
    }
    await until(() => evaluate("!!document.querySelector('[aria-label=\"Account menu\"]')"))
    await evaluate("document.querySelector('[aria-label=\"Account menu\"]').click()")
    await until(() => evaluate("[...document.querySelectorAll('[role=menuitem]')].some(x=>x.innerText.includes('Settings'))"))
    await evaluate("[...document.querySelectorAll('[role=menuitem]')].find(x=>x.innerText.includes('Settings')).click()")
    await until(() => evaluate("!!document.querySelector('[data-shortcut-modal=settings]')"))
    // Let the original account menu finish its close/return-focus transition.
    await pause(250)
    if (!await evaluate("[...document.querySelectorAll('[data-shortcut-modal=settings] nav button')].some(x=>x.innerText==='Client')")) {
      if (attempt < 2) return openClientSettings(attempt + 1)
      throw Error('Settings closed during the original shell startup transition')
    }
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
  const instancesTab = async () => {
    await evaluate("[...document.querySelectorAll('[data-shortcut-modal=settings] nav button')].find(x=>x.innerText==='Instances').click()")
    await until(() => evaluate("!!document.querySelector('[data-mygo-instances]')"))
  }
  const fillInstance = async (label, value) => evaluate(`(() => {
    const el=document.querySelector('[data-instance-editor] input[aria-label="${label}"]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(value)});
    el.dispatchEvent(new Event('input',{bubbles:true}));
  })()`)
  const instanceSave = () => evaluate("document.querySelector('[data-instance-editor] button[type=submit]').click()")
  await instancesTab()
  assert.equal(await evaluate("document.querySelectorAll('[data-instance-editor]').length"),0,'Instances starts with the Models-style list, without an always-open form')
  const boundInstance = await evaluate("document.querySelector('[data-instance-id]').dataset.instanceId")
  await evaluate("[...document.querySelectorAll('[data-mygo-instances] button')].find(x=>x.innerText==='Add instance').click()")
  await until(() => evaluate("!!document.querySelector('[data-instance-editor]')"))
  assert.equal(await evaluate("!!document.querySelector('[data-instance-editor] input[aria-label=\"Authentication view\"]')"),false,'authentication context is managed internally, not an editable instance field')
  const addedInstance = await evaluate("document.querySelector('[data-instance-editor] input[aria-label=\"Instance ID\"]').value")
  await fillInstance('Name','Work PC')
  await fillInstance('Address','https://example.invalid')
  await instanceSave()
  await until(() => evaluate(`!!document.querySelector('[data-instance-id="${addedInstance}"]') && !document.querySelector('[data-instance-editor]')`))
  assert.equal(await evaluate(`fetch('/mygo-local/startup.json').then(response => response.json()).then(value => {
    const added=value.instances.find(row=>row.id==='${addedInstance}');
    const bound=value.instances.find(row=>row.id==='${boundInstance}');
    return added.authenticationViewId === bound.authenticationViewId;
  })`),true,'new profiles inherit the current authentication context and persist in the mygo proxy catalog')
  await evaluate("document.querySelector('[aria-label=\"Edit Work PC\"]').click()")
  await fillInstance('Address','https://example.invalid/path')
  await instanceSave()
  await until(() => evaluate("!!document.querySelector('[data-instance-editor] [role=alert]')"))
  assert.equal(await evaluate("document.querySelector('[data-instance-editor] input[aria-label=\"Address\"]').value"),'https://example.invalid/path','rejected save retains the draft')
  await evaluate("[...document.querySelectorAll('[data-instance-editor] button')].find(x=>x.innerText==='Cancel').click()")
  await evaluate("document.querySelector('[aria-label=\"Edit Work PC\"]').click()")
  assert.equal(await evaluate("document.querySelector('[data-instance-editor] input[aria-label=\"Address\"]').value"),'https://example.invalid','cancel did not persist rejected input')
  await fillInstance('Name','Workstation')
  await instanceSave()
  await until(() => evaluate("!!document.querySelector('[aria-label=\"Edit Workstation\"]')"))
  await writeFile(scratch+'/settings-instances.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'))
  await send('Emulation.setDeviceMetricsOverride', {width:390,height:844,deviceScaleFactor:1,mobile:true})
  await pause(150)
  assert.equal(await evaluate("document.querySelector('[data-mygo-instances]').getBoundingClientRect().right <= innerWidth && document.documentElement.scrollWidth <= innerWidth"),true,'Instances cards fit the original narrow Settings layout')
  await writeFile(scratch+'/settings-instances-mobile.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'))
  await send('Emulation.setDeviceMetricsOverride', {width:1440,height:1000,deviceScaleFactor:1,mobile:false})
  await evaluate("globalThis.__MYGO_INSTANCE_RELOAD_CHECK__=true")
  await send('Page.reload')
  await until(() => evaluate("!globalThis.__MYGO_INSTANCE_RELOAD_CHECK__ && __ModuleLoader__?.mode==='live' && !!document.querySelector('[data-mygo-local-plugin=marker]')"))
  await openClientSettings()
  await instancesTab()
  assert.equal(await evaluate("!!document.querySelector('[aria-label=\"Edit Workstation\"]')"),true,'saved instance edits survive reload')
  await evaluate("[...document.querySelectorAll('[data-shortcut-modal=settings] button')].find(x=>x.innerText==='Close').click()")
  await until(() => evaluate("!document.querySelector('[data-shortcut-modal=settings]')"))
  await until(() => evaluate("document.querySelector('[data-mygo-navigation] button').title.includes('Connected')"))
  assert.equal(await evaluate("document.querySelector('[data-mygo-navigation] button').innerText"),'Local test DSH','sidebar shows the actual connected instance, not the saved selection or transport terminology')
  await evaluate("document.querySelector('[data-mygo-navigation] [aria-label=\"Instances\"]').click()")
  await until(() => evaluate("[...document.querySelectorAll('[role=menuitem]')].some(x=>x.innerText==='Manage instances')"))
  assert.equal(await evaluate("[...document.querySelectorAll('[role=menuitem]')].find(x=>x.innerText==='Workstation').getAttribute('aria-disabled')"),'true','unconnected saved profiles cannot masquerade as active connections')
  assert.equal(await evaluate("[...document.querySelectorAll('[role=menuitem]')].find(x=>x.innerText==='Local test DSH').getAttribute('aria-current')"),'page','the real bound instance is the current menu item')
  const switcherText = await evaluate("[...document.querySelectorAll('[role=menu]')].map(x=>x.innerText).join(' ')")
  assert.equal(/Bound connection|operator-bound|Saved profile/.test(switcherText),false,'menu contains native choices instead of diagnostic paragraphs')
  await writeFile(scratch+'/instance-switcher.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'))
  await evaluate("[...document.querySelectorAll('[role=menuitem]')].find(x=>x.innerText==='Manage instances').click()")
  await until(() => evaluate("!!document.querySelector('[data-shortcut-modal=settings] [data-mygo-instances]')"))
  assert.equal(await evaluate("!!document.querySelector('[data-mygo-instances] [aria-label=\"Edit Workstation\"]')"),true,'Manage instances opens the original Settings instance section')

  await evaluate("[...document.querySelectorAll('[data-shortcut-modal=settings] nav button')].find(x=>x.innerText==='Client').click()")

  await evaluate("[...document.querySelectorAll('[data-mygo-client-settings] button')].find(x=>x.innerText==='Manage plugins').click()")
  await until(() => evaluate("!document.querySelector('[data-shortcut-modal=settings]') && !!document.querySelector('[data-mygo-plugin-source=LOCAL]')"))
  assert.equal(await evaluate("document.querySelector('[role=tab][aria-selected=true]').innerText"),'Local','Manage plugins closes Settings and opens the Local list')
  await tab('Local')
  await until(() => evaluate("!!document.querySelector('[data-mygo-plugin-source=LOCAL] [data-plugin-package=\"./plugins/marker.js\"]')"))
  const localCount = await evaluate("document.querySelectorAll('[data-mygo-plugin-source=LOCAL] [data-plugin-package], [data-mygo-plugin-source=LOCAL] [data-plugin-item]').length")
  const note = '[data-plugin-package="./plugins/marker.js"]'
  assert.equal(await evaluate("document.querySelectorAll('[data-local-plugin-group=basic] [data-plugin-item]').length"),5,'builtin Local plugins use the original group/card layout')
  assert.equal(await evaluate("document.querySelectorAll('[data-local-plugin-group=extensions] [data-plugin-package]').length"),2,'experimental Local contribution has its own group')
  const originalLabel = await evaluate("document.querySelector('[data-mygo-local-plugin=marker]').textContent")
  assert.equal(await evaluate("document.querySelectorAll('[data-local-plugin-group=basic] [role=switch]').length"), 0, 'builtin cards follow original settings-item structure without package switches')
  await send('Emulation.setDeviceMetricsOverride', {width:390,height:600,deviceScaleFactor:1,mobile:true})
  await evaluate("document.querySelector('[data-plugin-body]').scrollTop = document.querySelector('[data-plugin-body]').scrollHeight")
  await pause(150)
  await evaluate("document.querySelector('[data-local-plugin-group=basic] [data-plugin-item] button').click()")
  await until(() => evaluate("!!document.querySelector('[data-plugin-item-detail]')"))
  await pause(200)
  assert.equal(await evaluate("!!document.querySelector('[data-plugin-panel] [data-plugin-bar], [data-plugin-panel] [data-plugin-header-part=title], [data-plugin-panel] [role=tablist]')"), false, 'local detail uses official outer navigation and hides the list header and tabs')
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
  await until(() => evaluate("!!document.querySelector('[data-plugin-detail] [data-plugin-config] #local-note-text')"))
  assert.equal(await evaluate("!!document.querySelector('[aria-label=\"Configure local plugin\"], [data-plugin-detail] textarea')"),false,'plugin page uses the original direct form without a Configure button or JSON editor')
  const editNote = async text => {
    await evaluate(`(() => { const el=document.querySelector('#local-note-text'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(text)}); el.dispatchEvent(new Event('input',{bubbles:true})); })()`)
  }
  await editNote('')
  assert.equal(await evaluate("[...document.querySelectorAll('[data-local-plugin-actions] button')].find(x=>x.innerText==='Save').disabled"),true,'the original save control blocks invalid input')
  assert.equal(await evaluate("document.querySelector('[data-mygo-local-plugin=marker]').textContent"),originalLabel,'editing does not write before Save')
  const save = async label => {
    await editNote(label)
    await evaluate("[...document.querySelectorAll('[data-local-plugin-actions] button')].find(x=>x.innerText==='Save').click()")
    await until(() => evaluate(`document.querySelector('[data-mygo-local-plugin=marker]')?.textContent === ${JSON.stringify(label)}`))
  }
  await save('Direct plugin configuration')
  await save(originalLabel)
  await writeFile(scratch+'/plugins-local-package.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'))
  await editNote('Unsaved draft')
  await evaluate("document.querySelector('[data-plugin-detail] [data-plugin-row] button:not([role=switch])').click()")
  await until(() => evaluate("!!document.querySelector('[data-plugin-row-detail] [data-mygo-runtime-details]')"))
  assert.equal(await evaluate("!!document.querySelector('[data-plugin-row-detail] #local-note-text')"),false,'Components retain their own configuration contract, not the bundle form')
  await evaluate("document.querySelector('[data-plugin-row-detail] button').click()")
  await until(() => evaluate("!!document.querySelector('[data-plugin-detail] #local-note-text')"))
  assert.equal(await evaluate("document.querySelector('#local-note-text').value"),originalLabel,'leaving the page discards unsaved drafts just like the original form')
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
    await writeFile(scratch+'/local-structure-validation.json',JSON.stringify({ok:true,localCount,builtinItemStructure:true,experimentalPackageStructure:true,localToggle:true,localConfig:true,directPluginConfig:true,clientSettings:true,instancesEditor:true,instancesPersistence:true,instancesMobile:true,instanceSwitcher:true,resetConfirmation:true,resetRestoresDefaults:true,hostMutations:mutations}),{mode:0o600})
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
  }
  }
} catch (error) {
  await writeFile(scratch + '/unified-plugin-failure.json', JSON.stringify({ stage, error: error.message, errors, mutations, text: evaluate ? await evaluate('document.body.innerText').catch(() => '') : '' }), { mode: 0o600 })
  throw error
} finally {
  await restoreBadgeFixture?.().catch(() => {})
  ws?.close()
  if (browser.exitCode === null) { browser.kill('SIGTERM'); await new Promise(r => browser.once('exit', r)) }
}

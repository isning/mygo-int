import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'

// Runs inside the existing private Chromium harness; never emits login links.
export async function verifyInstanceSwitch({ send, evaluate, until, scratch, launchURL }) {
  const a = JSON.parse(await readFile(scratch + '/status.json', 'utf8'))
  const b = JSON.parse(await readFile(scratch + '/second/status.json', 'utf8'))
  const tokenB = new URL((await readFile(scratch + '/second/launch-url', 'utf8')).trim()).searchParams.get('token')
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
  const ready = async () => {
    await until(() => evaluate("!!document.querySelector('[data-mygo-navigation]')"))
    // The original preview notice follows its asynchronous preference snapshot.
    for (let index = 0; index < 6; index++) {
      await pause(150)
      await evaluate("[...document.querySelectorAll('button')].find(x=>['Continue','继续'].includes(x.innerText))?.click()")
    }
  }
  const instances = async () => {
    if (await evaluate("!!document.querySelector('[data-mygo-local-shell]')")) {
      await evaluate("document.querySelector('[data-mygo-open-settings]').click()")
    } else {
      await evaluate("document.querySelector('[data-mygo-navigation] button').click()")
      await until(() => evaluate("[...document.querySelectorAll('[role=menuitem]')].some(x=>['Manage instances','管理实例'].includes(x.innerText))"))
      await evaluate("[...document.querySelectorAll('[role=menuitem]')].find(x=>['Manage instances','管理实例'].includes(x.innerText)).click()")
    }
    await until(() => evaluate("!!document.querySelector('[data-mygo-instances]')"))
  }
  const add = async (id, name, address) => {
    await evaluate("[...document.querySelectorAll('[data-mygo-instances] button')].find(x=>['Add instance','添加实例'].includes(x.innerText)).click()")
    await until(() => evaluate("!!document.querySelector('[data-instance-editor]')"))
    await evaluate(`(() => { const inputs=[...document.querySelectorAll('[data-instance-editor] input')]; for(const [index,value] of ${JSON.stringify([name, address, id])}.entries()) { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(inputs[index],value); inputs[index].dispatchEvent(new Event('input',{bubbles:true})); } })()`)
    await evaluate("document.querySelector('[data-instance-editor] button[type=submit]').click()")
    await until(() => evaluate(`!document.querySelector('[data-instance-editor]') && !!document.querySelector('[data-instance-id="${id}"]')`))
  }
  const connect = async id => {
    await evaluate(`document.querySelector('[data-instance-id="${id}"] button').click()`)
    await until(() => evaluate("location.pathname.startsWith('/mygo-instance/') && document.readyState==='complete'"))
  }
  const list = () => evaluate("fetch('/api/session/list',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type:'client-request',rpcId:'switch-read-'+Date.now(),method:'session/list',payload:{args:{_request:{}}}})}).then(r=>r.json())")
  const plugins = async () => {
    await evaluate("[...document.querySelectorAll('button,[role=button]')].find(x=>['Plugins','插件'].includes(x.innerText)).click()")
    await until(() => evaluate("!!document.querySelector('[role=tab]')"))
    await evaluate("[...document.querySelectorAll('[role=tab]')].find(x=>['Local','本地'].includes(x.innerText)).click()")
    await until(() => evaluate("!!document.querySelector('[data-plugin-package=\"./plugins/touch-feedback.js\"] [role=switch]')"))
  }
  await send('Page.navigate', { url: launchURL })
  await ready()
  assert.ok(JSON.stringify(await list()).includes(a.sessionId), 'A lists its real fixture')
  await evaluate("localStorage.setItem('instance-switch-proof','A')")
  await plugins()
  await evaluate("document.querySelector('[data-plugin-package=\"./plugins/touch-feedback.js\"] [role=switch]').click()")
  await until(() => evaluate("!document.querySelector('style[data-mygo-touch-feedback]')"))
  await instances()
  await add('second-dsh', 'Second DSH', b.origin)
  await connect('second-dsh')
  await until(() => evaluate("!!document.querySelector('[data-mygo-local-shell] input[type=password]')"))
  const privateLinkB = new URL(await evaluate('location.href'))
  privateLinkB.searchParams.set('token', tokenB)
  await writeFile(scratch + '/second/client-launch-url', privateLinkB.href, { mode: 0o600 })
  assert.equal(await evaluate("fetch('/mygo/status').then(r=>r.status)"), 401, 'A cookie grants no access to B')
  const signIn = async token => {
    await evaluate(`(() => { const input=document.querySelector('input[type=password]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(token)}); input.dispatchEvent(new Event('input',{bubbles:true})); })()`)
    await evaluate("document.querySelector('[data-mygo-local-shell] form button[type=submit]').click()")
  }
  await signIn('intentionally-invalid-test-token')
  await until(() => evaluate("document.body.innerText.includes('Sign in failed') || document.body.innerText.includes('登录失败')"))
  await signIn(tokenB)
  await ready()
  const dshCookies = (await send('Network.getAllCookies')).cookies.filter(cookie => cookie.name.startsWith('mygo-dsh-') || cookie.name.startsWith('dsh-auth-'))
  assert.equal(dshCookies.length, 0, 'upstream DSH credentials remain in the mygo reverse proxy')
  await send('Page.navigate', { url: await evaluate('location.href') })
  await ready()
  assert.equal(await evaluate("!!document.querySelector('[data-mygo-local-shell] input[type=password]')"), false, 'saved instance credential restores the proxy without another prompt')
  assert.equal(await evaluate("fetch('/mygo/status').then(r=>r.status)"), 200, 'the restored reverse-proxy credential is admitted upstream')
  const config = await evaluate("fetch('/mygo-local/startup.json').then(r=>r.json())")
  assert.equal(config.selectedInstance.address, b.origin)
  assert.equal(config.selectedInstance.id, 'second-dsh')
  const sessionsB = JSON.stringify(await list())
  assert.ok(sessionsB.includes(b.sessionId), 'B supplies its real sessions')
  assert.ok(!sessionsB.includes(a.sessionId), 'A sessions do not leak into B')
  assert.equal(await evaluate("localStorage.getItem('instance-switch-proof')"), null)
  await evaluate("localStorage.setItem('instance-switch-proof','B')")
  assert.equal(await evaluate("!!document.querySelector('style[data-mygo-touch-feedback]')"), false, 'device plugin preference survives A to B')

  await until(() => evaluate("[...document.querySelectorAll('button')].some(x=>{const label=x.getAttribute('aria-label')||'';return label.includes('Second DSH')&&/New session|新建会话/.test(label)})"))
  await evaluate("[...document.querySelectorAll('button')].find(x=>{const label=x.getAttribute('aria-label')||'';return label.includes('Second DSH')&&/New session|新建会话/.test(label)}).click()")
  await until(() => evaluate("!!document.querySelector('[contenteditable=true]')"))
  await evaluate("document.querySelector('[contenteditable=true]').focus()")
  await send('Input.insertText', { text: 'Instance B original composer switch check ' + Date.now() })
  await until(() => evaluate("document.querySelector('[contenteditable=true]')?.innerText.includes('Instance B original composer switch check')"))
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 })
  await until(() => evaluate("[...document.querySelectorAll('[data-chat-flow-kind=assistant-step]')].some(x=>x.innerText.includes('Hello! This is a deterministic local model mock reply.'))"))
  assert.equal(await evaluate("document.querySelector('[contenteditable=true]').innerText.trim()"), '')
  await writeFile(scratch + '/instance-switch-B.png', Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'))

  // The original sidebar menu now changes the actual route, not just a label.
  const pathB = await evaluate('location.pathname')
  await evaluate("document.querySelector('[data-mygo-navigation] button').click()")
  await until(() => evaluate("[...document.querySelectorAll('[role=menuitem]')].some(x=>x.innerText==='Local test DSH')"))
  await evaluate("[...document.querySelectorAll('[role=menuitem]')].find(x=>x.innerText==='Local test DSH').click()")
  await until(() => evaluate(`location.pathname !== ${JSON.stringify(pathB)}`))
  await ready()
  const sessionsA = JSON.stringify(await list())
  assert.ok(sessionsA.includes(a.sessionId) && !sessionsA.includes(b.sessionId))
  assert.equal(await evaluate("localStorage.getItem('instance-switch-proof')"), 'A', 'A cache survives the return')
  assert.equal(await evaluate("fetch('/mygo/status').then(r=>r.status)"), 200, 'A login survived B login')
  assert.equal(await evaluate("!!document.querySelector('style[data-mygo-touch-feedback]')"), false)

  await instances()
  await add('unavailable-dsh', 'Unavailable DSH', 'http://127.0.0.1:1')
  const oldPath = await evaluate('location.pathname')
  await connect('unavailable-dsh')
  await until(() => evaluate(`location.pathname !== ${JSON.stringify(oldPath)} && !!document.querySelector('[data-mygo-local-shell]') && document.body.innerText.includes('502')`))
  await instances()
  await connect('local-test-dsh')
  await ready()
  assert.equal(await evaluate("fetch('/mygo/status').then(r=>r.status)"), 200, 'local settings recover from an unavailable target')
  await plugins()
  await evaluate("document.querySelector('[data-plugin-package=\"./plugins/touch-feedback.js\"] [role=switch]').click()")
  await until(() => evaluate("!!document.querySelector('style[data-mygo-touch-feedback]')"))
  await pause(250)
  await writeFile(scratch + '/instance-switch-validation.json', JSON.stringify({ ok: true, originalHosts: 2, realSessionIsolation: true,
    credentialIsolation: true, retainedLogin: true, proxyCredentialRestore: true, storageIsolation: true, localPreferencesRetained: true, settingsConnect: true,
    sidebarConnect: true, invalidLoginRefused: true, originalComposerMockReply: true, unavailableTargetRecovery: true }), { mode: 0o600 })
}

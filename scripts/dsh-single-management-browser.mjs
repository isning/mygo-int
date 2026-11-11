// Browser acceptance slice: real local management, then the harness opens a session.
import assert from 'node:assert/strict'
export async function checkSharedManagement({ evaluate, until, apiRequests }) {
  assert.equal(await evaluate('!!document.querySelector(\'[aria-label="Local client settings"]\')'), false,
    'single-root settings do not use a separate floating launcher')
  async function openLocalSettings() {
    await until(() => evaluate('!!document.querySelector(\'[aria-label="Account menu"]\')'))
    await evaluate('document.querySelector(\'[aria-label="Account menu"]\').click()')
    await until(() => evaluate("[...document.querySelectorAll('[role=menuitem]')].some(x=>x.innerText.includes('Settings'))"))
    await evaluate("[...document.querySelectorAll('[role=menuitem]')].find(x=>x.innerText.includes('Settings')).click()")
    await until(() => evaluate('!!document.querySelector("[data-shortcut-modal=settings]")'))
    await evaluate("[...document.querySelectorAll('[data-shortcut-modal=settings] button')].find(x=>x.innerText==='LOCAL plugins').click()")
  }
  const describeHost = () => evaluate(`fetch('/api/settings/describe', {
    method:'POST', headers:{'content-type':'application/json'},
    body:JSON.stringify({type:'client-request',rpcId:'local-management-read-'+Date.now(),method:'settings/describe',payload:{args:{}}})
  }).then(response=>response.json())`)
  assert.equal(await evaluate('document.querySelector("[data-mygo-shared-client]")?.dataset.platformSingletons'), 'true', 'local plugins share original platform modules and the supplied client Context')
  const requestStart = apiRequests.length
  const before = await describeHost()
  assert.equal(before.result?.ok, true, 'original Host settings read succeeds with browser authority')
  assert.ok(before.result.value.namespaces.length > 0)
  await openLocalSettings()
  await until(() => evaluate('!!document.querySelector("[data-plugin-row=local-note]")'))
  const ids = await evaluate('[...document.querySelectorAll("[data-plugin-row]")].map(node=>node.dataset.pluginRow).sort()')
  const expectedIds = await evaluate("fetch('/mygo-local/startup.json').then(r=>r.json()).then(c=>c.entries.map(e=>e.id).sort())")
  assert.deepEqual(ids, expectedIds,
    'local management contains only the actual local startup entries, excluding Host entries')
  if (process.env.MYGO_EXPECT_NOTE_DISABLED === '1') {
    assert.equal(await evaluate('!!document.querySelector("[data-mygo-local-plugin=marker]")'), false,
      'operator-disabled local entry starts inactive')
    await evaluate('document.querySelector("[data-plugin-row=local-note] [role=switch]").click()')
    const enabled = await until(() => evaluate(`(() => {
      const active=!!document.querySelector('[data-mygo-local-plugin=marker]');
      const error=[...document.querySelectorAll('[role=alert]')].map(node=>node.textContent).join(' ');
      return (active || error) && {active, error};
    })()`))
    assert.equal(enabled.active, true, 'disabled local Entry can be enabled through actual management: '+enabled.error)
  }
  await evaluate('document.querySelector("[data-plugin-row=local-note] button").click()')
  await until(() => evaluate('!!document.querySelector(\'textarea[aria-label="Local plugin configuration"]\')'))
  await evaluate(`(() => {
    const input=document.querySelector('textarea[aria-label="Local plugin configuration"]');
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,JSON.stringify({label:'Shared runtime local edit'}));
    input.dispatchEvent(new Event('input',{bubbles:true}));
  })()`)
  await evaluate("[...document.querySelectorAll('button')].find(x=>x.innerText==='Save and apply locally').click()")
  await until(() => evaluate('document.querySelector("[data-mygo-local-plugin=marker]")?.textContent === "Shared runtime local edit"'))
  assert.equal(apiRequests.slice(requestStart).some(path => /\/(?:settings|pluginManager|dynamicCordisRunner)\/(?:update|replace|mutate|set\w*|enable|disable|install|remove|reload)/.test(path)), false, 'local management sends no Host management mutation request')
  const after = await describeHost()
  assert.equal(after.result?.ok, true)
  const configuration = response => response.result.value.namespaces.map(({ns, value, base, user, revision}) => ({ns, value, base, user, revision}))
  assert.deepEqual(configuration(after), configuration(before), 'local config application leaves Host settings values and revisions unchanged')
  await evaluate("[...document.querySelectorAll('button')].find(x=>x.innerText==='Instances').click()")
  await until(() => evaluate("document.body.innerText.includes('authenticated (DSH admission probe)')"))
  assert.equal(await evaluate("!!document.querySelector('[data-instance-id=local-test-dsh]')"), true,
    'existing instance catalog uses the shared startup service and real browser admission')
  await evaluate("[...document.querySelectorAll('button')].find(x=>x.innerText==='LOCAL plugins').click()")
  await evaluate('globalThis.__MYGO_MANAGEMENT_RELOAD_MARK__=true')
  await evaluate("[...document.querySelectorAll('button')].find(x=>x.innerText==='Reload saved composition').click()")
  await until(() => evaluate('globalThis.__MYGO_MANAGEMENT_RELOAD_MARK__!==true && document.querySelector("[data-mygo-local-plugin=marker]")?.textContent === "Shared runtime local edit"'))
  await openLocalSettings()
  assert.equal(await evaluate('!!document.querySelector("[data-plugin-row=local-note]")'), true, 'local settings reopen after reload')
  return { localRows: ids, hostSettingsUnchanged: true, hostManagementWrites: false,
    sharedPlatformModules: true, configApplied: true, overlayRestored: true,
    enabledFromDisabledStartup: process.env.MYGO_EXPECT_NOTE_DISABLED === '1' }

}

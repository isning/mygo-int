// Browser acceptance slice for mygo sections inside the original Settings page.
import assert from 'node:assert/strict'

export async function checkSharedManagement({ evaluate, until, apiRequests }) {
  assert.equal(await evaluate('!!document.querySelector(\'[aria-label="Local client settings"]\')'), false,
    'mygo settings do not use a separate floating launcher')

  await until(() => evaluate('!!document.querySelector(\'[aria-label="Account menu"], [aria-label="账号菜单"]\')'))
  await evaluate('document.querySelector(\'[aria-label="Account menu"], [aria-label="账号菜单"]\').click()')
  await until(() => evaluate("[...document.querySelectorAll('[role=menuitem]')].some(node => /Settings|设置/.test(node.innerText))"))
  await evaluate("[...document.querySelectorAll('[role=menuitem]')].find(node => /Settings|设置/.test(node.innerText)).click()")
  await until(() => evaluate('!!document.querySelector("[data-shortcut-modal=settings]")'))

  const tab = pattern => `[...document.querySelectorAll('[data-shortcut-modal=settings] button')].find(node => ${pattern}.test(node.innerText))`
  await until(() => evaluate(`!!(${tab('/^(Client|客户端)$/')})`))
  await evaluate(`${tab('/^(Client|客户端)$/')}.click()`)
  await until(() => evaluate('!!document.querySelector("[data-mygo-client-settings]")'))
  assert.equal(await evaluate('document.querySelector("[data-mygo-client-settings]").closest("[data-shortcut-modal=settings]") !== null'), true,
    'Client settings render inside the original Settings outlet')

  await evaluate(`${tab('/^(Instances|实例)$/')}.click()`)
  await until(() => evaluate('!!document.querySelector("[data-mygo-instances]")'))
  const current = await evaluate(`(() => {
    const card = document.querySelector('[data-mygo-instances] [data-instance-id]')
    return card && { id: card.dataset.instanceId, text: card.innerText }
  })()`)
  assert.equal(current?.id, 'local-test-dsh', 'the active route appears in the shared instance catalog')
  assert.match(current.text, /Current|当前|Connection successful|连接成功/)

  assert.equal(apiRequests.some(path => /\/(?:settings|pluginManager|dynamicCordisRunner)\/(?:update|replace|mutate|set\w*|enable|disable|install|remove|reload)/.test(path)), false,
    'opening mygo settings performs no Host management mutation')
  await evaluate(`document.querySelector('[data-shortcut-modal=settings] button[aria-label="Close"], [data-shortcut-modal=settings] button[aria-label="关闭"]')?.click()`)
  await until(() => evaluate('!document.querySelector("[data-shortcut-modal=settings]")'))
  return { currentInstance: current.id, originalSettingsOutlet: true, hostManagementWrites: false }
}

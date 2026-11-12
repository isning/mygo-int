/**
 * Real-browser acceptance for the shipped mygo profile and a real DSH Host.
 * Set MYGO_TEST_DSH_ORIGIN and MYGO_TEST_DSH_TOKEN to a disposable fixed Host.
 */
import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'

const root = resolve(import.meta.dirname, '../../..')
const origin = process.env.MYGO_TEST_DSH_ORIGIN
const token = process.env.MYGO_TEST_DSH_TOKEN
if (!origin || !token) throw Error('MYGO_TEST_DSH_ORIGIN and MYGO_TEST_DSH_TOKEN are required')
const address = new URL(origin).origin
const launchFile = resolve(root, '.dsh-build/mygo/state/client-launch-url')
const previousLaunch = await readFile(launchFile, 'utf8').catch(() => '')
const child = spawn(process.execPath, ['apps/cli/lib/bin.js', '--profile', 'mygo', '--no-open'], {
  cwd: root, stdio: ['ignore', 'inherit', 'inherit'],
})
const stop = () => child.kill('SIGTERM')
process.once('exit', stop)
try {
  let launch
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      const value = await readFile(launchFile, 'utf8')
      if (value !== previousLaunch) { launch = value.trim(); break }
    }
    catch { await new Promise(resolveWait => setTimeout(resolveWait, 100)) }
    await new Promise(resolveWait => setTimeout(resolveWait, 100))
  }
  if (!launch) throw Error('mygo did not publish its private launch URL')
  const requireWeb = createRequire(resolve(root, 'apps/web/package.json'))
  const { chromium } = requireWeb('playwright')
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, headless: true })
  try {
    const page = await browser.newPage()
    const hostMutations = []
    page.on('request', request => {
      const path = new URL(request.url()).pathname
      if (!path.endsWith('/api')) return
      try {
        const endpoint = JSON.parse(request.postData() ?? '{}').method ?? ''
        if (/^(settings|dynamicCordisRunner|pluginManager)\//.test(endpoint)
          && !/\/(get|list|inventory|schema|snapshot|describe|listBundles|listPlugins|registries|fastest|syncInspectManifest)$/.test(endpoint)) {
          hostMutations.push(endpoint)
        }
      } catch { hostMutations.push('unreadable management RPC') }
    })
    await page.goto(launch)
    await page.locator('[data-mygo-local-shell]').waitFor()
    const route = await page.evaluate(async profile => {
      const response = await fetch('/mygo-local/connection', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(profile),
      })
      if (!response.ok) throw Error(await response.text())
      return (await response.json()).url
    }, { id: 'browser-acceptance', name: 'Browser acceptance', address, authenticationViewId: 'owner' })
    await page.goto(new URL(`${route}?token=${encodeURIComponent(token)}`, launch).href)
    await page.waitForFunction(() => !document.querySelector('[data-mygo-local-shell]'), undefined, { timeout: 30_000 })
    if (/Failed to load plugins|mygo boot:/.test(await page.locator('body').innerText())) throw Error('The real DSH client did not activate')
    await page.locator('[data-mygo-navigation]').waitFor()
    await page.getByRole('button', { name: 'Continue', exact: true }).click({ timeout: 500 }).catch(() => {})
    await page.getByRole('button', { name: 'Open sidebar', exact: true }).click({ timeout: 500 }).catch(() => {})
    const composer = page.locator('[data-composer-input][contenteditable="true"]').first()
    await composer.waitFor({ timeout: 30_000 })
    const prompt = `mygo browser acceptance ${Date.now()}`
    await composer.fill(prompt)
    const promptResponse = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/api/session/prompt') && response.status() === 200)
    await composer.press('Enter')
    await promptResponse
    await page.getByText('Hello! This is a deterministic local model mock reply.', { exact: true }).last().waitFor({ timeout: 30_000 })

    const pluginsButton = page.getByRole('button', { name: /^(Plugins|插件)$/ })
    if (await pluginsButton.count() === 0) throw Error(`Plugins navigation is unavailable: ${(await page.locator('body').innerText()).slice(0, 1_000)}`)
    await pluginsButton.click()
    await page.locator('[data-plugin-toolbar]').waitFor()
    await page.getByText(/Subagent|子智能体/, { exact: true }).first().waitFor()
    await page.locator('[data-mygo-plugin-sides] [data-active="true"]').first().waitFor()
    await page.waitForFunction(() => document.querySelectorAll('[data-mygo-plugin-sides] [data-active="true"]').length >= 2)
    await page.getByRole('tab', { name: /^(Local|本地)$/ }).click()
    const touch = page.locator('[data-plugin-package="./plugins/touch-feedback.js"]')
    await touch.waitFor()
    const toggle = touch.getByRole('switch')
    const before = await page.evaluate(() => document.querySelectorAll('style[data-mygo-touch-feedback]').length)
    await toggle.click()
    await page.waitForFunction(value => document.querySelectorAll('style[data-mygo-touch-feedback]').length !== value, before)
    await toggle.click()
    await page.waitForFunction(value => document.querySelectorAll('style[data-mygo-touch-feedback]').length === value, before)
    if (hostMutations.length) throw Error(`Local lifecycle wrote Host state: ${hostMutations.join(', ')}`)

    await page.locator('[data-mygo-navigation] button').click()
    await page.getByRole('menuitem', { name: /^(Manage instances|管理实例)$/ }).click()
    const settingsModal = page.locator('[data-shortcut-modal="settings"]')
    await settingsModal.locator('[data-mygo-instances]').waitFor()
    await page.keyboard.press('Escape')
    await settingsModal.waitFor({ state: 'hidden' })
  } finally { await browser.close() }
} finally {
  process.removeListener('exit', stop)
  stop()
  await new Promise(resolveExit => child.once('exit', resolveExit))
}

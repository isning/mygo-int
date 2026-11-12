import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dictionaries, localized } from '../../local/locales/index.js'
import { createLocaleForm } from '../../local/locale-form.js'

test('all official languages contain the same nonempty copy and interpolation parameters', () => {
  assert.deepEqual(Object.keys(dictionaries).sort(), ['de','en','es','fr','ja','pt','ru','zh'])
  const keys = Object.keys(dictionaries.en).sort()
  const parameters = value => [...value.matchAll(/\{([^}]+)\}/g)].map(match => match[1]).sort()
  for (const [language, dictionary] of Object.entries(dictionaries)) {
    assert.deepEqual(Object.keys(dictionary).sort(), keys, language)
    for (const key of keys) {
      assert.equal(typeof dictionary[key], 'string', `${language}:${key}`)
      assert.ok(dictionary[key].trim(), `${language}:${key}`)
      assert.deepEqual(parameters(dictionary[key]), parameters(dictionaries.en[key]), `${language}:${key}`)
    }
  }
  assert.equal(localized('Instances').zh, '实例')
})

test('default local surfaces and plugin metadata only request registered copy', async () => {
  const files = ['local-shell-ui.tsx','management-ui.tsx','instance-navigation.tsx','unified-plugin-ui.tsx','plugin-runtime-details.tsx','plugin-side-badges.ts']
  for (const file of files) {
    const source = await readFile(new URL('../../local/' + file, import.meta.url), 'utf8')
    for (const match of source.matchAll(/(?:\bt|clientT|\.text)\('([^']+)'/g)) assert.ok(Object.hasOwn(dictionaries.en, match[1]), `${file}: ${match[1]}`)
    if (file === 'unified-plugin-ui.tsx') for (const match of source.matchAll(/(?:title|description): '([^']+)'/g)) assert.ok(Object.hasOwn(dictionaries.en, match[1]), `metadata: ${match[1]}`)
  }
})

test('locale form fences rapid writes without publishing superseded selections', async t => {
  const originalFetch = globalThis.fetch
  t.after(() => { globalThis.fetch = originalFetch })
  const requests = []
  globalThis.fetch = async (_url, init = {}) => {
    const body = init.body === undefined ? undefined : JSON.parse(init.body)
    requests.push(body)
    const value = body === undefined
      ? { revision: 0, preference: 'en' }
      : { revision: body.expectedRevision + 1, preference: body.preference }
    return { status: 200, async json() { return value } }
  }

  const form = createLocaleForm()
  await new Promise(resolve => {
    const unsubscribe = form.subscribe(() => {
      if (form.getSnapshot().status === 'ready') { unsubscribe(); resolve() }
    })
  })
  assert.equal(form.getSnapshot().status, 'ready')
  const published = []
  form.subscribe(() => { published.push(form.getSnapshot().value?.preference) })
  const first = form.set('preference', 'zh')
  const second = form.set('preference', 'en')

  assert.equal(await first, true)
  assert.equal(await second, true)
  assert.deepEqual(requests, [undefined,
    { expectedRevision: 0, preference: 'zh' },
    { expectedRevision: 1, preference: 'en' },
  ])
  assert.deepEqual(published, ['en'])
})

test('locale form refuses malformed wire snapshots', async t => {
  const originalFetch = globalThis.fetch
  t.after(() => { globalThis.fetch = originalFetch })
  globalThis.fetch = async () => ({ status: 200, async json() { return { revision: -1, preference: '../zh' } } })

  const form = createLocaleForm()
  await new Promise(resolve => {
    const unsubscribe = form.subscribe(() => {
      if (form.getSnapshot().status === 'unavailable') { unsubscribe(); resolve() }
    })
  })
  assert.equal(form.getSnapshot().value, undefined)
  assert.equal(form.getSnapshot().writable, false)
})

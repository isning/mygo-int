import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dictionaries, localized } from '../../local/locales/index.js'

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

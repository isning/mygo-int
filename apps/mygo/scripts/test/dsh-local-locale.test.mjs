import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { createLocalLocaleSettings } from '../dsh-local-locale.mjs'

test('local locale settings persist an explicit preference with revision fencing', async () => {
  const directory = await mkdtemp(resolve(tmpdir(), 'mygo-locale-'))
  const file = resolve(directory, 'locale.json')
  const first = await createLocalLocaleSettings(file)

  assert.deepEqual(first.snapshot(), { revision: 0, preference: null })
  assert.deepEqual(await first.update({ expectedRevision: 0, preference: 'zh' }), {
    ok: true,
    snapshot: { revision: 1, preference: 'zh' },
  })
  assert.deepEqual(await first.update({ expectedRevision: 0, preference: 'en' }), {
    ok: false,
    reason: 'conflict',
    snapshot: { revision: 1, preference: 'zh' },
  })

  const restored = await createLocalLocaleSettings(file)
  assert.deepEqual(restored.snapshot(), { revision: 1, preference: 'zh' })
  assert.equal((await readFile(file, 'utf8')).includes('zh'), true)
})

test('local locale settings reject malformed persisted and requested values', async () => {
  const directory = await mkdtemp(resolve(tmpdir(), 'mygo-locale-invalid-'))
  const file = resolve(directory, 'locale.json')
  const settings = await createLocalLocaleSettings(file)

  assert.deepEqual(await settings.update({ expectedRevision: 0, preference: '../zh' }), {
    ok: false,
    reason: 'invalid',
  })
  await assert.rejects(
    createLocalLocaleSettings(resolve(directory, 'missing.json')).then(async value => {
      await value.update({ expectedRevision: 0, preference: 'zh' })
      const stored = JSON.parse(await readFile(resolve(directory, 'missing.json'), 'utf8'))
      stored.extra = true
      await import('node:fs/promises').then(({ writeFile }) => writeFile(resolve(directory, 'missing.json'), JSON.stringify(stored)))
      return createLocalLocaleSettings(resolve(directory, 'missing.json'))
    }),
    /Invalid MyGO!!!! locale settings/,
  )
})

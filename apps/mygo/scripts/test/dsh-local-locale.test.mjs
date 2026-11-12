import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rmdir, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { createLocalLocaleSettings } from '../dsh-local-locale.mjs'

async function removeIfPresent(path, remove) {
  try { await remove(path) }
  catch (error) { if (error.code !== 'ENOENT') throw error }
}

function cleanLocaleDirectory(t, directory, files) {
  t.after(async () => {
    await removeIfPresent(resolve(directory, 'locale.json.next'), rmdir)
    for (const file of files) await removeIfPresent(file, unlink)
    await rmdir(directory)
  })
}

test('local locale settings persist an explicit preference with revision fencing', async t => {
  const directory = await mkdtemp(resolve(tmpdir(), 'mygo-locale-'))
  const file = resolve(directory, 'locale.json')
  cleanLocaleDirectory(t, directory, [file])
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

test('local locale settings reject malformed persisted and requested values', async t => {
  const directory = await mkdtemp(resolve(tmpdir(), 'mygo-locale-invalid-'))
  const file = resolve(directory, 'locale.json')
  const malformed = resolve(directory, 'missing.json')
  cleanLocaleDirectory(t, directory, [file, malformed])
  const settings = await createLocalLocaleSettings(file)

  assert.deepEqual(await settings.update({ expectedRevision: 0, preference: '../zh' }), {
    ok: false,
    reason: 'invalid',
  })
  assert.deepEqual(await settings.update({ expectedRevision: 0, preference: 'zh', extra: true }), {
    ok: false,
    reason: 'invalid',
  })
  await assert.rejects(
    createLocalLocaleSettings(malformed).then(async value => {
      await value.update({ expectedRevision: 0, preference: 'zh' })
      const stored = JSON.parse(await readFile(malformed, 'utf8'))
      stored.extra = true
      await writeFile(malformed, JSON.stringify(stored))
      return createLocalLocaleSettings(malformed)
    }),
    /Invalid MyGO!!!! locale settings/,
  )
})

test('a failed durable write leaves the accepted revision intact and later writes recover', async t => {
  const directory = await mkdtemp(resolve(tmpdir(), 'mygo-locale-recovery-'))
  const file = resolve(directory, 'locale.json')
  cleanLocaleDirectory(t, directory, [file])
  const settings = await createLocalLocaleSettings(file)

  await mkdir(file + '.next')
  await assert.rejects(settings.update({ expectedRevision: 0, preference: 'zh' }))
  assert.deepEqual(settings.snapshot(), { revision: 0, preference: null })

  await rmdir(file + '.next')
  assert.deepEqual(await settings.update({ expectedRevision: 0, preference: 'en' }), {
    ok: true,
    snapshot: { revision: 1, preference: 'en' },
  })
})

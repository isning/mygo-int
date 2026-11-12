import { readFile, rename, writeFile } from 'node:fs/promises'

const LOCALE_ID = /^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/u

function valid(value) {
  return value && Object.keys(value).every(key => ['revision', 'preference'].includes(key))
    && Number.isSafeInteger(value.revision) && value.revision >= 0
    && (value.preference === null || typeof value.preference === 'string' && LOCALE_ID.test(value.preference))
}

/** Durable MyGO locale preference with the same revision semantics as DSH settings. */
export async function createLocalLocaleSettings(file) {
  let value = { revision: 0, preference: null }
  try { value = JSON.parse(await readFile(file, 'utf8')) }
  catch (error) { if (error.code !== 'ENOENT') throw error }
  if (!valid(value)) throw Error('Invalid MyGO!!!! locale settings')
  let tail = Promise.resolve()

  return {
    snapshot: () => ({ ...value }),
    update(input) {
      let result
      tail = tail.then(async () => {
        if (!input || !Number.isSafeInteger(input.expectedRevision)
          || input.preference !== null && (typeof input.preference !== 'string' || !LOCALE_ID.test(input.preference))) {
          result = { ok: false, reason: 'invalid' }
          return
        }
        if (input.expectedRevision !== value.revision) {
          result = { ok: false, reason: 'conflict', snapshot: { ...value } }
          return
        }
        value = { revision: value.revision + 1, preference: input.preference }
        await writeFile(file + '.next', JSON.stringify(value), { mode: 0o600 })
        await rename(file + '.next', file)
        result = { ok: true, snapshot: { ...value } }
      })
      return tail.then(() => result)
    },
  }
}

import { readFile, rename, writeFile } from 'node:fs/promises'
import { isLocaleSnapshot, isLocaleUpdate } from '../locale-settings.js'

/**
 * Open one durable MyGO locale preference.
 * @param {string} file Private JSON file owned by the MyGO state directory.
 * @returns {Promise<{snapshot(): {revision: number, preference: string | null}, update(input: unknown): Promise<object>}>} Revision-fenced locale store.
 */
export async function createLocalLocaleSettings(file) {
  let value = { revision: 0, preference: null }
  try { value = JSON.parse(await readFile(file, 'utf8')) }
  catch (error) { if (error.code !== 'ENOENT') throw error }
  if (!isLocaleSnapshot(value)) throw Error('Invalid MyGO!!!! locale settings')
  let tail = Promise.resolve()

  return {
    snapshot: () => ({ ...value }),
    update(input) {
      const task = tail.then(async () => {
        if (!isLocaleUpdate(input)) {
          return { ok: false, reason: 'invalid' }
        }
        if (input.expectedRevision !== value.revision) {
          return { ok: false, reason: 'conflict', snapshot: { ...value } }
        }
        const next = { revision: value.revision + 1, preference: input.preference }
        await writeFile(file + '.next', JSON.stringify(next), { mode: 0o600 })
        await rename(file + '.next', file)
        value = next
        return { ok: true, snapshot: { ...value } }
      })
      tail = task.then(() => {}, () => {})
      return task
    },
  }
}

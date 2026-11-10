import { readFile, realpath } from 'node:fs/promises'
import { resolve, sep } from 'node:path'

export function validateLocalStartup(value) {
  if (value?.schemaVersion !== 1 || !Array.isArray(value.entries) || value.entries.length > 64) {
    throw Error('Expected local startup schemaVersion 1 and at most 64 entries')
  }
  const selected = value.selectedInstance
  if (!selected || !['id', 'authenticationViewId'].every(key =>
    typeof selected[key] === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(selected[key]))) {
    throw Error('Expected explicit selectedInstance id and authenticationViewId')
  }
  const ids = new Set()
  for (const entry of value.entries) {
    if (!entry || typeof entry.id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(entry.id) || ids.has(entry.id)
      || typeof entry.name !== 'string' || !/^\.\/plugins\/[a-zA-Z0-9_-]+\.js$/.test(entry.name)
      || Object.keys(entry).some(key => !['id', 'name', 'config', 'disabled', 'inject'].includes(key))
      || (entry.disabled !== undefined && typeof entry.disabled !== 'boolean')) {
      throw Error('Invalid or duplicate local startup entry')
    }
    ids.add(entry.id)
  }
  return value
}

export async function readLocalStartup(workspace, path) {
  const file = await realpath(resolve(workspace, path))
  if (!file.startsWith(workspace + sep)) throw Error('Local startup configuration must be inside the workspace')
  return validateLocalStartup(JSON.parse(await readFile(file, 'utf8')))
}

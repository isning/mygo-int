import { readFile, realpath } from 'node:fs/promises'
import { resolve, sep } from 'node:path'

export function validateLocalStartup(value) {
  if (value?.schemaVersion !== 1 || !Array.isArray(value.entries) || value.entries.length > 64) {
    throw Error('Expected local startup schemaVersion 1 and at most 64 entries')
  }
  const selected = value.selectedInstance
  if (selected !== undefined && !['id', 'authenticationViewId'].every(key =>
    typeof selected[key] === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(selected[key]))) {
    throw Error('Expected explicit selectedInstance id and authenticationViewId')
  }
  if (selected?.address !== undefined) validateInstanceAddress(selected.address)
  if (value.bootstrap !== undefined && (!Array.isArray(value.bootstrap) || value.bootstrap.length > 16)) throw Error('Invalid bootstrap plugin list')
  const ids = new Set()
  for (const entry of [...(value.bootstrap ?? []), ...value.entries]) {
    if (!entry || typeof entry.id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(entry.id) || ids.has(entry.id)
      || typeof entry.name !== 'string' || !/^\.\/plugins\/[a-zA-Z0-9_-]+\.js$/.test(entry.name)
      || Object.keys(entry).some(key => !['id', 'name', 'config', 'disabled', 'inject', 'mode', 'target'].includes(key))
      || (entry.disabled !== undefined && typeof entry.disabled !== 'boolean')) {
      throw Error('Invalid or duplicate local startup entry')
    }
    if (entry.mode !== undefined && (entry.mode !== 'override' || !value.bootstrap?.includes(entry) || entry.disabled
      || typeof entry.target !== 'string' || !/^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/.test(entry.target))) throw Error('Invalid override application')
    if (entry.target !== undefined && entry.mode !== 'override') throw Error('Override target requires override mode')
    ids.add(entry.id)
  }
  return value
}

function validateInstanceAddress(address) {
  const url = new URL(address)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw Error('Expected a remote instance origin without credentials, path or token')
  }
  return url.origin
}

// Deployment metadata describes the fixed carrier target, never the UI origin.
export function bindLocalStartup(value, remoteOrigin) {
  if (!value.selectedInstance) throw Error('Cannot bind a startup configuration without selectedInstance')
  return { ...value, selectedInstance: { ...value.selectedInstance, address: validateInstanceAddress(remoteOrigin) } }
}

export async function readLocalStartup(workspace, path) {
  const file = await realpath(resolve(workspace, path))
  if (!file.startsWith(workspace + sep)) throw Error('Local startup configuration must be inside the workspace')
  return validateLocalStartup(JSON.parse(await readFile(file, 'utf8')))
}

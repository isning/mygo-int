// Combined acceptance fixture over the integrated default, never upstream edits.
// Reuse the real Host fixture and context observation, without replaying old UI wiring.
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
process.argv[2] = 'integrated'
await import('./dsh-host-actions-prepare.mjs')
const scratch = resolve('.scratch/host-actions')
let build = await readFile(scratch + '/build.mjs', 'utf8')
build = build.replace('async load(id) {', `async load(id) {
  if (id === resolve(root, 'entries/dsh-startup/single-client.js')) return (await readFile(id, 'utf8')).replace('const ctx = new Context()', 'const ctx = new Context(); globalThis.__INSTANCE_ACTIONS_CTX__ = ctx; globalThis.__COMPOSITION_DIAGNOSIS_CTX__ = ctx')`)
await writeFile(scratch + '/build.mjs', build)
const config = JSON.parse(await readFile('entries/dsh-startup/local/single-root.json', 'utf8'))
const fixture = JSON.parse(await readFile('entries/dsh-startup/local/slot-override.json', 'utf8'))
config.entries.push(...fixture.entries.filter(row => !config.entries.some(entry => entry.id === row.id)))
await writeFile(scratch + '/startup.json', JSON.stringify(config, null, 2))
console.log('Prepared combined default acceptance: original Host fixture, observed Context, local Slot lifecycle fixture')

#!/usr/bin/env node
/** Command-line entry for the standalone MyGO!!!! client. */

import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, symlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { initProfile, loadLayeredEnv, loadProfileDirectory } from '@deepseek-ai/dsh-app-boot'
import { runProfile } from '@deepseek-ai/dsh/profile-boot'

const packageManifest = fileURLToPath(new URL('./package.json', import.meta.url))
const packageRoot = dirname(packageManifest)
const installationId = createHash('sha256').update(packageRoot).digest('hex').slice(0, 16)
const profileDirectory = resolve('.dsh-build/mygo/profiles', installationId)
const { values } = parseArgs({ options: {
  help: { type: 'boolean', short: 'h' },
  port: { type: 'string', default: '4178' },
  'bind-host': { type: 'string', default: '127.0.0.1' },
  'public-origin': { type: 'string', default: '' },
  'state-directory': { type: 'string', default: '.dsh-build/mygo/state' },
  'startup-config': { type: 'string', default: 'local/single-root.json' },
}, strict: true })

if (values.help) {
  process.stdout.write(`Usage: mygo [options]\n\nOptions:\n  --port <number>\n  --bind-host <address>\n  --public-origin <origin>\n  --state-directory <path>\n  --startup-config <path>\n  -h, --help\n`)
  process.exit(0)
}

const port = Number(values.port)
if (!Number.isSafeInteger(port)) throw new TypeError('--port must be an integer')

initProfile(profileDirectory, [])
const packageScope = join(profileDirectory, 'node_modules/@deepseek-ai')
const packageLink = join(packageScope, 'dsh-mygo-app')
mkdirSync(packageScope, { recursive: true })
if (!existsSync(packageLink)) symlinkSync(packageRoot, packageLink, 'junction')
copyFileSync(join(packageRoot, 'cordis.patch.yml'), join(profileDirectory, 'cordis.patch.yml'))
const runtimePatch = join(profileDirectory, 'runtime.patch.json')
writeFileSync(runtimePatch, JSON.stringify([{ id: 'mygo-app', config: {
  port,
  bindHost: values['bind-host'],
  publicOrigin: values['public-origin'],
  stateDirectory: values['state-directory'],
  startupConfig: values['startup-config'],
} }], undefined, 2) + '\n')

await runProfile({
  environment: loadLayeredEnv('mygo'),
  profile: 'mygo',
  resolvedProfile: {
    profile: loadProfileDirectory('mygo', profileDirectory, packageManifest),
    installAnchor: packageManifest,
  },
  patchFiles: [runtimePatch],
  args: [],
})

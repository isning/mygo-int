/** Verify the published surface imports and serves without repository source files. */
import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = resolve(import.meta.dirname, '../../..')
const appRoot = resolve(import.meta.dirname, '..')
await mkdir(join(appRoot, '.scratch'), { recursive: true })
const target = await mkdtemp(join(appRoot, '.scratch/mygo-packed-'))
const json = JSON.parse(execFileSync('pnpm', ['pack', '--filter', '@deepseek-ai/dsh-mygo-app', '--pack-destination', target, '--json'], { cwd: root, encoding: 'utf8' }))
const archive = json.filename
execFileSync('tar', ['-xzf', archive, '-C', target])
const entry = await import(pathToFileURL(join(target, 'package/lib/index.js')).href)
if (typeof entry.apply !== 'function' || !entry.Config) throw Error('Packed Cordis entry is incomplete')
const runtime = await import(pathToFileURL(join(target, 'package/scripts/dsh-startup.mjs')).href)
const stateDirectory = join(target, 'state')
const dispose = await runtime.runMygo('serve', { port: 4179, stateDirectory })
try {
  const launch = (await readFile(join(stateDirectory, 'client-launch-url'), 'utf8')).trim()
  const response = await fetch(launch, { redirect: 'manual' })
  if (response.status !== 303 || !response.headers.get('set-cookie')?.includes('mygo-session=')) throw Error('Packed login exchange failed')
  const anonymous = await fetch('http://127.0.0.1:4179/', { redirect: 'manual' })
  if (anonymous.status !== 401) throw Error(`Packed anonymous request returned ${anonymous.status}`)
} finally { await dispose() }

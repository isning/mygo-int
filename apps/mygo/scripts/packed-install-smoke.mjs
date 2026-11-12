/** Verify the published surface imports and serves without repository source files. */
import { execFileSync, spawn } from 'node:child_process'
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
const manifest = JSON.parse(await readFile(join(target, 'package/package.json'), 'utf8'))
if (manifest.bin?.mygo !== 'bin.mjs') throw Error('Packed MyGO executable is missing')
const entry = await import(pathToFileURL(join(target, 'package/lib/index.js')).href)
if (typeof entry.apply !== 'function' || !entry.Config) throw Error('Packed Cordis entry is incomplete')
const stateDirectory = join(target, 'state')
const child = spawn(process.env.MYGO_TEST_NODE || process.execPath, [
  join(target, 'package/bin.mjs'), '--port', '4179', '--state-directory', stateDirectory,
], { cwd: target, stdio: 'inherit' })
const exited = new Promise(resolveExit => child.once('exit', resolveExit))
try {
  let launch
  for (let attempt = 0; attempt < 100; attempt++) {
    launch = await readFile(join(stateDirectory, 'client-launch-url'), 'utf8').catch(() => undefined)
    if (launch !== undefined) break
    await new Promise(resolveWait => setTimeout(resolveWait, 100))
  }
  if (launch === undefined) throw Error('Packed MyGO executable did not publish its launch URL')
  launch = launch.trim()
  const response = await fetch(launch, { redirect: 'manual' })
  if (response.status !== 303 || !response.headers.get('set-cookie')?.includes('mygo-session=')) throw Error('Packed login exchange failed')
  const anonymous = await fetch('http://127.0.0.1:4179/', { redirect: 'manual' })
  if (anonymous.status !== 401) throw Error(`Packed anonymous request returned ${anonymous.status}`)
} finally {
  if (child.exitCode === null) child.kill('SIGTERM')
  await exited
}

// Create an ignored runnable CLI anchor with the thin mygo Host adapter.
import { mkdirSync, cpSync, readdirSync, symlinkSync, existsSync, writeFileSync, readFileSync } from 'node:fs'
import { resolve, join } from 'node:path'

const root = process.cwd()
const upstream = resolve('.scratch/upstream/deepseek-harness')
const anchor = resolve('.scratch/status-live/anchor')
mkdirSync(anchor, { recursive: true })
cpSync(join(upstream, 'apps/cli/lib'), join(anchor, 'lib'), { recursive: true })
cpSync(join(upstream, 'apps/cli/package.json'), join(anchor, 'package.json'))

function linkPackages(source, target) {
  mkdirSync(target, { recursive: true })
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    const from = join(source, entry.name)
    const to = join(target, entry.name)
    if (entry.name.startsWith('@')) linkPackages(from, to)
    else if (!existsSync(to)) symlinkSync(from, to)
  }
}

linkPackages(join(upstream, 'apps/cli/node_modules'), join(anchor, 'node_modules'))
for (const [name, path] of [
  ['dsh-client-connection', 'packages/client/connection'],
  ['dsh-client-modules', 'packages/client/modules'],
]) {
  const target = join(anchor, 'node_modules/@deepseek-ai', name)
  if (!existsSync(target)) symlinkSync(join(upstream, path), target)
}
mkdirSync(join(anchor, 'node_modules/@mygo'), { recursive: true })
cpSync(join(root, 'packages/dsh-host-status'), join(anchor, 'node_modules/@mygo/dsh-host-status'), { recursive: true })

const manifestPath = join(anchor, 'package.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
Object.assign(manifest.dependencies, {
  '@mygo/dsh-host-status': '0.1.0',
  '@deepseek-ai/dsh-client-connection': '0.2.2-rc.1',
  '@deepseek-ai/dsh-client-modules': '0.2.2-rc.1',
})
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))

// Reuse upstream's Vite configuration and public Web package. Never edit upstream.
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
const root = process.cwd()
const upstream = resolve('.scratch/upstream/deepseek-harness')
const web = resolve(upstream, 'apps/web')
const require = createRequire(web + '/package.json')
const { build, loadConfigFromFile } = await import(require.resolve('vite'))
const loaded = await loadConfigFromFile({ command: 'build', mode: 'production' }, web + '/vite.config.ts')
if (!loaded) throw Error('Missing upstream Web build configuration')
const local = resolve(root, 'entries/dsh-startup/local-composition.js')
const clientRequire = createRequire(upstream + '/packages/client/web/package.json')
const loader = clientRequire.resolve('@deepseek-ai/cordis-plugin-loader')
await build({
  ...loaded.config,
  configFile: false,
  root: web,
  plugins: [...loaded.config.plugins, {
    name: 'mygo-local-startup-entry',
    enforce: 'pre',
    async load(id) {
      if (id !== web + '/src/main.ts') return
      const original = await readFile(id, 'utf8')
      return `import { getStaticModules } from '@deepseek-ai/dsh-client-web';
import Loader from ${JSON.stringify(loader)};
import { FIBER_STATE as FiberState } from ${JSON.stringify(upstream + '/packages/client/web/src/loader-status.ts')};
import { startLocalComposition } from ${JSON.stringify(local)};
const staticModules = getStaticModules();
const { Context } = staticModules['@deepseek-ai/cordis'];
await startLocalComposition({ Context, Loader, FiberState, staticModules });
const bootstrapUrl = '/mygo-boot/bootstrap.js';
await import(/* @vite-ignore */ bootstrapUrl);
${original}`
    },
  }],
  build: { ...loaded.config.build, outDir: resolve('.scratch/dsh-local-composition/dist'), emptyOutDir: false },
})

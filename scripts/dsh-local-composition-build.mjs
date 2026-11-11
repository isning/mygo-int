// Reuse upstream's Vite configuration and public Web package. Never edit upstream.
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
const root = process.cwd()
const singleRoot = process.env.MYGO_CLIENT_COMPOSITION === 'single-root'
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
    async generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'assets/DSH-LICENSE.txt', source: await readFile(upstream + '/LICENSE', 'utf8') })
    },
    resolveId(source, importer) {
      if (importer === resolve(root, 'entries/dsh-startup/single-client.js') && source.startsWith('@deepseek-ai/')) {
        return require.resolve(source)
      }
      if (['management-ui.tsx', 'unified-plugin-ui.tsx'].some(name => importer?.startsWith(resolve(root, 'entries/dsh-startup/local', name))) && !source.startsWith('.')) {
        return require.resolve(source)
      }
    },
    async load(id) {
      if (id.endsWith('?mygo-rows')) return (await readFile(id.slice(0, -'?mygo-rows'.length), 'utf8')) + '\nexport { RowsSection };'
      if (id.endsWith('?mygo-panel')) return (await readFile(id.slice(0, -'?mygo-panel'.length), 'utf8')) + '\nexport { SettingsPanel };'
      if (id !== web + '/src/main.ts') return
      if (singleRoot) return `import { startSingleClient } from ${JSON.stringify(resolve(root, 'entries/dsh-startup/single-client.js'))};\nvoid startSingleClient();`
      const original = await readFile(id, 'utf8')
      return `import { getStaticModules } from '@deepseek-ai/dsh-client-web';
import Loader from ${JSON.stringify(loader)};
import { FIBER_STATE as FiberState } from ${JSON.stringify(upstream + '/packages/client/web/src/loader-status.ts')};
import { startLocalComposition } from ${JSON.stringify(local)};
import * as managementUI from ${JSON.stringify(resolve(root, 'entries/dsh-startup/local/management-ui.tsx'))};
import { bindRemoteEntryOwnership } from ${JSON.stringify(resolve(root, 'entries/dsh-startup/entry-ownership.js'))};
const staticModules = getStaticModules();
staticModules['mygo/dsh-management-ui'] = managementUI;
const { Context } = staticModules['@deepseek-ai/cordis'];
const composition = await startLocalComposition({ Context, Loader, FiberState, staticModules });
Object.defineProperty(globalThis, '__MYGO_ENTRY_OWNERSHIP__', { value: Object.freeze({ snapshot: composition.ownership.snapshot }) });
const bootstrapUrl = '/mygo-boot/bootstrap.js';
await import(/* @vite-ignore */ bootstrapUrl);
if (globalThis.__ModuleLoader__) {
  const remote = bindRemoteEntryOwnership(globalThis.__ModuleLoader__, composition.ownership, composition.selectedInstance);
  Object.defineProperty(globalThis, '__MYGO_REMOTE_CONTRIBUTION_CASE__', { value: Object.freeze({ removeTerminal: remote.removeTerminalContribution }) });
}
${original}`
    },
  }],
  build: { ...loaded.config.build, outDir: resolve(singleRoot ? '.scratch/dsh-single-client/dist' : '.scratch/dsh-local-composition/dist'), emptyOutDir: false },
})

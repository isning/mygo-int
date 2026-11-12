// Reuse upstream's Vite configuration and public Web package. Never edit upstream.
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { adaptPluginPage, adaptSettingsRoot } from './dsh-plugin-page-adapter.mjs'
const root = process.cwd()
const upstream = resolve('.scratch/upstream/deepseek-harness')
const web = resolve(upstream, 'apps/web')
const require = createRequire(web + '/package.json')
const { build, loadConfigFromFile } = await import(require.resolve('vite'))
const loaded = await loadConfigFromFile({ command: 'build', mode: 'production' }, web + '/vite.config.ts')
if (!loaded) throw Error('Missing upstream Web build configuration')
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
      if (['single-client.js', 'web-platform.js', 'local/plugins/dsh-instance.js', 'local/plugins/plugin-manager-override.js', 'local/plugins/local-shell.js', 'local/plugins/client-i18n.js'].some(name => importer === resolve(root, 'entries/dsh-startup', name)) && source.startsWith('@deepseek-ai/')) {
        return source === '@deepseek-ai/cordis-plugin-loader' ? loader : require.resolve(source)
      }
      if (['i18n.ts', 'local-shell-ui.tsx', 'instance-navigation.tsx', 'management-ui.tsx', 'unified-plugin-ui.tsx', 'plugin-runtime-details.tsx'].some(name => importer?.startsWith(resolve(root, 'entries/dsh-startup/local', name))) && !source.startsWith('.')) {
        return require.resolve(source)
      }
    },
    async load(id) {
      if (id.endsWith('?mygo-rows')) return adaptPluginPage(await readFile(id.slice(0, -'?mygo-rows'.length), 'utf8'))
      if (id.endsWith('?mygo-panel')) return adaptSettingsRoot(await readFile(id.slice(0, -'?mygo-panel'.length), 'utf8'))
      if (id !== web + '/src/main.ts') return
      return `import { startSingleClient } from ${JSON.stringify(resolve(root, 'entries/dsh-startup/single-client.js'))};\nvoid startSingleClient();`
    },
  }],
  build: { ...loaded.config.build, outDir: resolve('.scratch/dsh-single-client/dist'), emptyOutDir: false },
})

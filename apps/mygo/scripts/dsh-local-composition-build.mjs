// Reuse upstream's Vite configuration and public Web package. Never edit upstream.
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const upstream = root
const web = resolve(upstream, 'apps/web')
const webRequire = createRequire(web + '/package.json')
const mygoRequire = createRequire(resolve(root, 'apps/mygo/package.json'))
const { build, loadConfigFromFile } = await import(webRequire.resolve('vite'))
const loaded = await loadConfigFromFile({ command: 'build', mode: 'production' }, web + '/vite.config.ts')
if (!loaded) throw Error('Missing upstream Web build configuration')
const loader = mygoRequire.resolve('@deepseek-ai/cordis-plugin-loader')
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
      if (source === '@deepseek-ai/dsh-client-ui-plugin-manager/client') return resolve(root, 'packages/client/ui-plugin-manager/src/client/index.ts')
      if (source === '@deepseek-ai/dsh-client-ui-settings-general/client') return resolve(root, 'packages/client/ui-settings-general/src/client/index.ts')
      if (source === '@deepseek-ai/dsh-client-ui-theme/client') return resolve(root, 'packages/client/ui-theme/src/client/index.ts')
      if (source === '@deepseek-ai/dsh-client-locale/client') return resolve(root, 'packages/client/locale/src/client/index.ts')
      if (['single-client.js', 'web-platform.js', 'local/plugins/dsh-instance.js', 'local/plugins/local-shell.js', 'local/plugins/client-i18n.js'].some(name => importer === resolve(root, 'apps/mygo', name)) && source.startsWith('@deepseek-ai/')) {
        return source === '@deepseek-ai/cordis-plugin-loader' ? loader : mygoRequire.resolve(source)
      }
      if (['i18n.ts', 'local-shell-ui.tsx', 'instance-navigation.tsx', 'management-ui.tsx', 'unified-plugin-ui.tsx', 'plugin-runtime-details.tsx'].some(name => importer?.startsWith(resolve(root, 'apps/mygo/local', name))) && !source.startsWith('.')) {
        return mygoRequire.resolve(source)
      }
    },
    async load(id) {
      if (id !== web + '/src/main.ts') return
      return `import { startSingleClient } from ${JSON.stringify(resolve(root, 'apps/mygo/single-client.js'))};\nvoid startSingleClient();`
    },
  }],
  build: { ...loaded.config.build, outDir: resolve(root, 'apps/mygo/dist'), emptyOutDir: true },
})

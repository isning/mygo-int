// Browser platform and available bundled plugins, not a fixed composition.
import { getStaticModules } from '../../.scratch/upstream/deepseek-harness/packages/client/web/src/seed.ts'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import * as dshInstance from './local/plugins/dsh-instance.js'
import * as pluginManagerOverride from './local/plugins/plugin-manager-override.js'
import * as localShell from './local/plugins/local-shell.js'
export function createWebPlatform() {
  const modules = getStaticModules()
  modules['./plugins/dsh-instance.js'] = dshInstance
  modules['./plugins/plugin-manager-override.js'] = pluginManagerOverride
  modules['./plugins/local-shell.js'] = localShell
  return { Context: modules['@deepseek-ai/cordis'].Context, Loader, modules }
}

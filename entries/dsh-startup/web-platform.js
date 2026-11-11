// Browser platform and available bundled plugins, not a fixed composition.
import { getStaticModules } from '../../.scratch/upstream/deepseek-harness/packages/client/web/src/seed.ts'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import * as dshInstance from './local/plugins/dsh-instance.js'
import * as clientOverrides from './local/plugins/client-overrides.js'
export function createWebPlatform() {
  const modules = getStaticModules()
  modules['./plugins/dsh-instance.js'] = dshInstance
  modules['./plugins/client-overrides.js'] = clientOverrides
  return { Context: modules['@deepseek-ai/cordis'].Context, Loader, modules }
}

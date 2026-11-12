// Browser platform and available bundled plugins, not a fixed composition.
import { getStaticModules } from '@deepseek-ai/dsh-client-web/src/seed.ts'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import * as dshInstance from './local/plugins/dsh-instance.js'
import * as localShell from './local/plugins/local-shell.js'
import * as clientI18n from './local/plugins/client-i18n.js'
export function createWebPlatform() {
  const modules = getStaticModules()
  modules['./plugins/dsh-instance.js'] = dshInstance
  modules['./plugins/client-i18n.js'] = clientI18n
  modules['./plugins/local-shell.js'] = localShell
  return { Context: modules['@deepseek-ai/cordis'].Context, Loader, modules }
}

// Local override policy. Official product plugins still originate in the instance graph.
import * as managementUI from '../management-ui.tsx'
import * as unifiedUI from '../unified-plugin-ui.tsx'
import * as pluginManagerClient from '../../../../.scratch/upstream/deepseek-harness/packages/client/ui-plugin-manager/src/client/index.ts?mygo-plugin-manager'
export const inject = ['clientHost']
export function apply(ctx) {
  const modules = ctx.clientHost.modules
  modules['mygo/dsh-management-ui'] = managementUI
  modules['mygo/dsh-unified-plugin-ui'] = unifiedUI
  // Explicit local implementation override for an instance-owned client entry.
  // These namespaces do not create Entries or start an official local UI roster.
  modules['@deepseek-ai/dsh-client-ui-plugin-manager'] = pluginManagerClient
  modules['@deepseek-ai/dsh-client-ui-plugin-manager/client'] = pluginManagerClient
}

// Device UI starts before any instance request. Original local services use the same Loader.
import * as managementUI from '../management-ui.tsx'
import * as unifiedUI from '../unified-plugin-ui.tsx'
import { mountLocalShell } from '../local-shell-ui.tsx'
import { installThemeStyles } from '@deepseek-ai/dsh-client-ui-theme/client'
export const inject = ['mygoLocale', 'clientHost', 'mygoStartup', 'loader']
export async function apply(ctx) {
  installThemeStyles(ctx)
  const host = ctx.clientHost
  host.modules['mygo/dsh-management-ui'] = managementUI
  host.modules['mygo/dsh-unified-plugin-ui'] = unifiedUI
  for (const id of ['client-composition', 'instance-manager']) {
    const options = host.configuration.entries.find(entry => entry.id === id)
    if (!options) throw Error(`Local shell requires ${id}`)
    const desired = await host.root.waterfall('mygo/startup-entry', options, () => options)
    await host.root.loader.create(desired)
    const entry = host.root.loader.resolve(id)
    host.localEntries.add(entry)
    await entry.fiber?.await()
    if (entry.fiber?.state !== 2) throw Error(`Local service did not activate: ${id}`)
  }
  await ctx.inject(['instanceManager', 'clientComposition'], scope => mountLocalShell(scope))
}

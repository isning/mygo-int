// Ordinary local Loader entry; compiled UI shares the original platform seeds.
export const inject = ['slots', 'loader', 'modules', 'remote', 'remote.pluginInventory', 'remote.pluginManager', 'clientComposition', 'instanceManager', 'mygoStartup', 'mygoPlatform']
export function apply(ctx) {
  ctx.mygoPlatform.modules['mygo/dsh-unified-plugin-ui'].register(ctx)
}

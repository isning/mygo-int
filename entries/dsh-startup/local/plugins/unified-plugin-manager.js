// Ordinary local Loader entry; compiled UI shares the original platform seeds.
export const inject = ['mygoLocale', 'slots', 'loader', 'modules', 'connection', 'remote', 'remote.pluginInventory', 'remote.pluginManager', 'locale', 'clientComposition', 'instanceManager', 'mygoStartup', 'mygoPlatform']
export function apply(ctx) {
  ctx.mygoPlatform.modules['mygo/dsh-unified-plugin-ui'].register(ctx)
}

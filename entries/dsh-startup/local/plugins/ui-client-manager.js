// Replaceable local UI plugin; the base does not mount a product page.
export const inject = ['mygoLocale', 'clientComposition', 'instanceManager', 'mygoPlatform']
export function apply(ctx) {
  const ui = ctx.mygoPlatform.modules['mygo/dsh-management-ui']
  ctx.inject(['slots'], scope => ui.registerSettings(scope))
}

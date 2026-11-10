// Replaceable local UI plugin; the base does not mount a product page.
export const inject = ['clientComposition', 'instanceManager', 'mygoPlatform']
export function apply(ctx) {
  ctx.mygoPlatform.modules['mygo/dsh-management-ui'].mount(ctx)
}

// Use the compiled original sidebar/menu chrome; connection ownership stays unchanged.
export const inject = ['instanceManager', 'slots', 'modules', 'connection', 'mygoPlatform']
export function apply(ctx) {
  ctx.mygoPlatform.modules['mygo/dsh-management-ui'].registerInstanceNavigation(ctx)
}

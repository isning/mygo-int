// Use the compiled original sidebar/menu chrome; connection ownership stays unchanged.
export const inject = ['instanceManager', 'slots', 'modules', 'connection', 'mygoPlatform']
export function apply(ctx) {
  const ui = ctx.mygoPlatform.modules['mygo/dsh-management-ui']
  ctx.effect(() => ui.installWindowDragRecall({ document }))
  ui.registerInstanceNavigation(ctx)
}

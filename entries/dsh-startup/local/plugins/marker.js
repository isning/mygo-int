export default async function localMarker(ctx, config) {
  if (typeof config?.label !== 'string' || !config.label.trim() || config.label.length > 160) {
    throw Error('Local note label must contain 1–160 characters')
  }
  const { registerLocalNote } = await ctx.modules.import('mygo/dsh-management-ui')
  ctx.inject(['slots'], scope => {
    registerLocalNote(scope, config.label)
  })
}

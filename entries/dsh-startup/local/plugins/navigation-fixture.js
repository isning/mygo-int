// Acceptance input only; omit from production startup compositions.
export const inject = ['instanceManager']
export async function apply(ctx) {
  if (!ctx.instanceManager.snapshot().catalog.some(row => row.id === 'external-demo')) {
    await ctx.instanceManager.save({ id: 'external-demo', name: 'External saved profile', address: 'https://external.invalid', authenticationViewId: 'owner' })
  }
}

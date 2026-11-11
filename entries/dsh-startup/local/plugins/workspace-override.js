// Device-local presentation only; the official workspace/session services stay active.
export const inject = ['slots', 'modules']
export async function apply(ctx) {
  const React = await ctx.modules.import('react')
  ctx.slots.inject('conversation.hero.workspace', () => ctx.slots.register({
    name: 'conversation.hero.workspace',
    // Original Slot cells elect the lowest priority; disposal restores priority 0.
    priority: -100,
  }, function LocalWorkspaceMenu({ open, onClose }) {
    const titleId = React.useId()
    if (!open) return null
    return React.createElement('section', {
      'data-mygo-workspace-override': '', role: 'dialog', 'aria-labelledby': titleId,
      style: { padding: 16, border: '1px solid currentColor', borderRadius: 8 },
    },
    React.createElement('h2', { id: titleId }, 'Local workspace menu'),
    React.createElement('p', null, 'Select a workspace from the sidebar to continue.'),
    React.createElement('button', { type: 'button', onClick: onClose }, 'Close workspace menu'))
  }))
}

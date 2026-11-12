// Optional presentation policy. Cordis owns the entire stylesheet lifetime.
export function apply(ctx) {
  ctx.effect(() => {
    const style = document.createElement('style')
    style.dataset.mygoTouchFeedback = ''
    style.textContent = `
      :where(button, a[href], [role='button'], [role='menuitem'], [role='tab'], summary) {
        -webkit-tap-highlight-color: transparent;
      }
    `
    document.head.append(style)
    return () => style.remove()
  })
}

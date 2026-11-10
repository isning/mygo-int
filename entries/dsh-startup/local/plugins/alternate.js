// A different selectable plugin entry, not a base-owned theme or shell switch.
export default function alternateMarker(ctx, config) {
  ctx.effect(() => {
    const marker = document.createElement('aside')
    marker.dataset.mygoLocalPlugin = 'alternate'
    marker.textContent = config.label
    marker.style.cssText = 'position:fixed;bottom:8px;left:8px;z-index:10000;background:#573b71;color:white;padding:6px 12px;border-radius:6px;font:13px sans-serif;pointer-events:none'
    document.body.append(marker)
    return () => marker.remove()
  })
}

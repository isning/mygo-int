export default function localMarker(ctx, config) {
  ctx.effect(() => {
    const marker = document.createElement('aside')
    marker.dataset.mygoLocalPlugin = 'marker'
    marker.textContent = config.label
    marker.style.cssText = 'position:fixed;bottom:8px;right:8px;z-index:10000;background:#173b32;color:white;padding:6px 12px;border-radius:6px;font:13px sans-serif;pointer-events:none'
    document.body.append(marker)
    return () => marker.remove()
  })
}

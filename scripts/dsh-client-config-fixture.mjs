export function capturePluginOverride(evaluate, pluginId) {
  return evaluate(`fetch('/mygo-local/client-config').then(response => response.json()).then(config => ({
    exists:Object.hasOwn(config.overrides,${JSON.stringify(pluginId)}),
    value:config.overrides[${JSON.stringify(pluginId)}]
  }))`)
}

export function restorePluginOverride(evaluate, pluginId, original) {
  return evaluate(`(async () => {
    const config = await fetch('/mygo-local/client-config').then(response => response.json())
    const overrides = {...config.overrides}
    const original = ${JSON.stringify(original)}
    if (original.exists) overrides[${JSON.stringify(pluginId)}] = original.value
    else delete overrides[${JSON.stringify(pluginId)}]
    const response = await fetch('/mygo-local/client-config', {
      method:'PUT', headers:{'content-type':'application/json'},
      body:JSON.stringify({expectedRevision:config.revision,base:config.base,overrides})
    })
    if (!response.ok) throw Error('Unable to restore local plugin configuration')
  })()`)
}

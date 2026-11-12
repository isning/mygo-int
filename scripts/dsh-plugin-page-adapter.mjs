// Expose pinned presentation primitives without changing page behaviour.
export function adaptPluginPage(source) {
  for (const name of ['RowsSection', 'RowDetail', 'PackageCard', 'PackageDetail', 'ItemCard', 'ItemDetail']) {
    if (source.split(`function ${name}(`).length !== 2) throw Error(`Pinned ${name} declaration changed`)
  }
  return source + '\nexport { RowsSection, RowDetail, PackageCard, PackageDetail, ItemCard, ItemDetail };'
}

export function adaptSettingsRoot(source) {
  if (source.split('function SettingsPanel(').length !== 2) throw Error('Pinned SettingsPanel declaration changed')
  return source + '\nexport { SettingsPanel };'
}

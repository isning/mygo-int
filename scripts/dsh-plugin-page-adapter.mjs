function replaceExact(source, before, after, label) {
  if (source.split(before).length !== 2) throw Error(`Pinned ${label} anchor changed`)
  return source.replace(before, after)
}

// Expose pinned presentation primitives without changing page behaviour.
export function adaptPluginPage(source) {
  for (const name of ['RowsSection', 'RowDetail', 'PackageCard', 'PackageDetail', 'ItemCard', 'ItemDetail']) {
    if (source.split(`function ${name}(`).length !== 2) throw Error(`Pinned ${name} declaration changed`)
  }
  return source + '\nexport { RowsSection, RowDetail, PackageCard, PackageDetail, ItemCard, ItemDetail };'
}

export function adaptPluginManagerClient(source) {
  source = replaceExact(
    source,
    "import { PluginManagerPage } from './PluginManagerPage.tsx'",
    "import { PluginManagerPage } from './PluginManagerPage.tsx?mygo-rows'",
    'PluginManagerPage import',
  )
  source = replaceExact(
    source,
    '      openList(): void',
    '      openList(): void\n      openTab(tabId: string): void',
    'pluginNavigation declaration',
  )
  return replaceExact(source, '        openList: () => {', `        openTab: (tabId: string) => {
          ctx.layout.selectPanel(PANEL_ID)
          instance.actions.setTab(tabId)
          instance.actions.setView({ kind: 'list' })
        },
        openList: () => {`, 'pluginNavigation implementation')
}

export function adaptSettingsRoot(source) {
  if (source.split('function SettingsPanel(').length !== 2) throw Error('Pinned SettingsPanel declaration changed')
  return source + '\nexport { SettingsPanel };'
}

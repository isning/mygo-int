// Extend the pinned page's contributed-tab navigation, preserving its layout.
export function adaptPluginPage(source) {
  const replace = (before, after) => {
    if (source.split(before).length !== 2) throw Error('Pinned PluginManagerPage navigation anchor changed')
    source = source.replace(before, after)
  }
  replace('  const selectedTab = props.useStore(state => state.tab)', `  const selectedTab = props.useStore(state => state.tab)
  const [contributedView, setContributedView] = useState<{ tab: string; entryId?: string; component?: boolean }>()
  useEffect(() => { setContributedView(undefined) }, [view])`)
  replace('  const showsCards = !onInstalled || (openPkg === undefined && openItem === undefined)', `  const showsCards = !onInstalled
    ? contributedView?.tab !== tab || contributedView.entryId === undefined
    : openPkg === undefined && openItem === undefined`)
  replace("              {renderSlot('plugins.tab', {\n                install: props.installFrom,", `              {renderSlot('plugins.tab', {
                renderConfiguration: renderSlot,
                navigation: {
                  view: contributedView?.tab === tab ? contributedView : undefined,
                  open: (entryId?: string, component = false) => setContributedView({ tab, entryId, component }),
                },
                install: props.installFrom,`)
  return source
}

export function adaptPluginManagerClient(source) {
  const anchor = '        openList: () => {'
  if (source.split(anchor).length !== 2) throw Error('Pinned pluginNavigation anchor changed')
  source = source.replace('      openList(): void', '      openList(): void\n      openTab(tabId: string): void')
  return source.replace(anchor, `        openTab: (tabId: string) => {
          ctx.layout.selectPanel(PANEL_ID)
          instance.actions.setTab(tabId)
          instance.actions.setView({ kind: 'list' })
        },
${anchor}`)
}

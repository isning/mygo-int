// Extend the pinned page's contributed-tab navigation, preserving its layout.
export function adaptPluginPage(source) {
  const replace = (before, after) => {
    if (source.split(before).length !== 2) throw Error('Pinned PluginManagerPage navigation anchor changed')
    source = source.replace(before, after)
  }
  replace('  const selectedTab = props.useStore(state => state.tab)', `  const selectedTab = props.useStore(state => state.tab)
  const [contributedView, setContributedView] = useState<{ tab: string; entryId?: string; component?: boolean }>()`)
  replace('  const showsCards = !onInstalled || (openPkg === undefined && openItem === undefined)', `  const showsCards = !onInstalled
    ? contributedView?.tab !== tab || contributedView.entryId === undefined
    : openPkg === undefined && openItem === undefined`)
  replace("              {renderSlot('plugins.tab', {\n                install: props.installFrom,", `              {renderSlot('plugins.tab', {
                navigation: {
                  view: contributedView?.tab === tab ? contributedView : undefined,
                  open: (entryId?: string, component = false) => setContributedView({ tab, entryId, component }),
                },
                install: props.installFrom,`)
  return source
}

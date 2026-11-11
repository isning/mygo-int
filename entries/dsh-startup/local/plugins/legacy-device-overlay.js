// Explicit migration snapshots, not a package-name or positional remapping.
// The old Workbench has no successor: any override for it is rejected by the
// composition adapter before any saved override is applied. Retained note config
// keeps its original marker contract; the new modules injection changes no fields.
const legacyEntries = [
  {"id": "client-composition", "name": "./plugins/client-composition.js"},
  {"id": "instance-manager", "name": "./plugins/instance-manager.js"},
  {"id": "ui-client-manager", "name": "./plugins/ui-client-manager.js"},
  {"id": "local-shell", "name": "./plugins/workbench.js", "config": {"label": "Workbench"}},
  {"id": "local-note", "name": "./plugins/marker.js", "config": {"label": "Local note · editable"}}
]
const sharedEntries = [
  {"id": "client-composition", "name": "./plugins/client-composition.js"},
  {"id": "instance-manager", "name": "./plugins/instance-manager.js"},
  {"id": "unified-plugin-manager", "name": "./plugins/unified-plugin-manager.js"},
  {"id": "local-navigation", "name": "./plugins/local-navigation.js"},
  {"id": "ui-client-manager", "name": "./plugins/ui-client-manager.js"},
  {"id": "local-note", "name": "./plugins/marker.js", "inject": ["modules"], "config": {"label": "Local note · editable"}}
]

export function matchesLegacyDeviceOverlay(savedBase, boot) {
  return boot.sharedClient === true
    && savedBase === JSON.stringify(legacyEntries)
    && JSON.stringify(boot.configuration.entries) === JSON.stringify(sharedEntries)
}

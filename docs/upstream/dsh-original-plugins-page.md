# Extend the original Plugins page

This supersedes the earlier standalone three-source inspection layout. That
layout reused individual rows but replaced the original page, resulting in a
verbose diagnostic list. The user requested modification of the original page.

The original `ui-plugin-manager` now owns the main Plugins registration again.
Its `PluginManagerPage`, controller, header, native tabs, cards, package details,
configuration contributions and Host dialogs run unchanged. The local plugin
registers one contribution to the existing `plugins.tab` contract:

- **Local** lists actual local Loader entries and controls device-local changes.

The original **Installed** tab continues to manage Host packages. There is no
separate Instance client list. Original package cards receive small **Remote**
and **Client** dot labels: the package's declared module names are matched to
the Host's inventory and the existing client Loader entries. No synthetic or
merged package records are created. Green means running/loaded; inactive or
unready sides use a gray dot. Client is shown only when a matching client Entry
exists. The four built-in settings shortcuts also receive these labels, using
the exact pinned settings-provider module identities (Subagent, web search,
agent loop and shell). Their original forms and layout remain unchanged. These
are plugin lifecycle indicators, not an assertion that an agent task is running.

This pin exposes no card-badge Slot. A narrowly scoped, disposable DOM decorator
uses the original `data-plugin-package` and `data-plugin-item` anchors and appends only the labels to
its title row. It changes no card layout, handlers, switches or data model.
Read failures remove cached labels; connection and Loader notifications update
the indicators. Upstream source remains pristine. A future public badge Slot can
replace this pin-specific attachment without changing the matching rule.

The Local tab uses the same pinned `PackageCard` and `RowDetail` components,
grouped as Built-in plugin settings, Experimental plugins and (for other local
modules) Installed plugins. The shipped five management/navigation modules are
classified as built-in and the marker demonstration as experimental; unknown
modules are not silently classified as experimental. The build adapter merely
exports those existing functions from a generated module; it neither edits the
upstream checkout nor forks their markup or stylesheet. There is no replacement
main-page component, second controller, separate navigation bar or custom CSS.
Local row switches retain the real Entry identity; protected services remain
locked. Configuration and lifecycle details appear after opening a row.

## Runtime information

Built-in settings details and Components row details have a read-only Runtime
details section: module identity, bound instance/authentication view, concrete
Remote and Client Entry ids, enablement, actual fiber phases, client dependency
names, and available original diagnostics. Configuration values and credentials
are not dumped into this view. Missing matching Entries are reported explicitly.

Components without an existing configuration contribution receive a low-priority
read-only `plugins.row.config` fallback so their names open the existing RowDetail
page. Native configuration entries keep priority and forms. Runtime information
itself uses the existing `plugins.detail.section` extension point. No additional
page or backend management endpoint is introduced.

## Current verification

With the standard owned test Host running:

```bash
node scripts/dsh-unified-plugins-browser.mjs
node scripts/dsh-test-browser.mjs check-default
node scripts/dsh-test-host.mjs check-submit
node --test scripts/test/*.test.mjs
```

The Plugins browser workflow verifies the original page/toolbar, native Local
tab and grouping, all four built-in side labels, retained Subagent form,
click-through Components runtime information, actual local disable/enable and configuration
save/restore, and protected switches. It
compares Host settings/revisions and inventory before/after and observes zero
Host management writes during local management. The badge phase temporarily
enables the owned test Host's shipped plugin-market bundle through the original
switch, verifies both green labels, and restores its previous disabled state.
Those two explicit Host writes are recorded separately from the local workflow.
The number and identities of original cards are unchanged. Desktop and 390px screenshots are captured privately.
Only model inference uses MODEL MOCK; the Host and browser authority are real.

Private evidence lives under `.scratch/test-dsh/`: `original-plugins-validation.json`,
`plugins-original-desktop.png`, `plugins-original-mobile.png`, and
`plugins-local.png`, plus `plugins-builtin-details.png` and
`plugins-component-details.png`. The corrected demo remains on port 4224, listening on
`0.0.0.0`, with its original private login entry. Restart rotates that entry.

Earlier handoffs and isolated browser scripts describing flat source filters,
`data-mygo-unified-plugins`, or source-qualified articles are historical evidence
for the superseded page. They are not current Plugins acceptance commands; use
the updated workflow above. Ownership, persistence and transport mechanisms are
unchanged. No full adapter semantic TSX/checkJs coverage is claimed.

During final regression the existing Inspector was found to occupy the diagnostic
probe's old `shell.bottom` singleton. The probe now contributes a hidden item to
the existing `shell.overlay` list instead, preserving the Inspector and avoiding
an unrelated product UI collision. Default single-root startup and original
session creation/receipt/MODEL MOCK reply passed after this correction, as did
all 27 repository tests. The upstream source pin remains unchanged.

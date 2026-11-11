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

## Local page hierarchy

Local built-in settings now use the unchanged upstream `ItemCard` and
`ItemDetail`, matching Installed's built-in settings rather than presenting
startup services as switchable packages. Experimental/installed local plugins
use upstream `PackageCard` → `PackageDetail` → `RowDetail`; plugin-level configuration
appears on the package page, while Components opens component-specific content. The build adapter only exposes these existing
components; upstream files remain unchanged. Lifecycle and configuration writes
still target the local composition service.

Run `node scripts/dsh-unified-plugins-browser.mjs --local-only` for the focused
browser checkpoint. It verifies built-in item structure, experimental package
and component navigation, real disable/enable and configuration save/restore,
and unchanged Host settings/inventory with zero Host management writes.
Evidence: `.scratch/test-dsh/local-structure-validation.json`,
`plugins-local.png`, and `plugins-local-package.png`. This focused checkpoint
passed; it does not claim a rerun of the full remote Components checkpoint.

## Shared outer navigation for Local details

The earlier scroll-to-top workaround was removed: upstream hides the list header
and tabs on details; retaining that header was the wrong behavior.

The default single-root composition seeds a client-half override of
`@deepseek-ai/dsh-client-ui-plugin-manager` (and its `/client` alias) using the
pinned original plugin source. Its apply, controller, Remote access, registration,
store, locale and child-slot ownership remain original. The build adapter changes
only three checked anchors in `PluginManagerPage` to supply contributed tabs with
page-owned detail navigation and include that state in the original `showsCards`
condition. No source files in the pinned checkout are edited. Local cards use
this navigation instead of private selection state. The original page controls
header visibility; no DOM/CSS header hiding, scroll reset or second controller
is installed. Missing/changed source anchors fail the build.

The focused browser checkpoint verifies the original Installed detail first,
then narrow-screen Local item navigation: both lack the header/tabs; returning
restores the Local list/header. It also checks package → component → package →
Local list navigation, actual configuration save/restore, toggle behavior and
unchanged Host state. `plugins-local-header.png` now captures the correct Local
detail **without** the list header. Adapted TSX is Vite-compiled; adapter-wide
semantic TypeScript checking is not claimed.

## Client settings

The default Settings section keeps its existing stable id `mygo-local-plugins`
but is now labeled **Client**. It uses the original Settings section styles and
Button/Modal components. It contains one Manage plugins action, which closes
Settings and opens Plugins → Local through an added `pluginNavigation.openTab`
method on the pinned client-half adapter. Local detail selection is cleared by
external navigation so this action consistently returns to the list.

The repeated Loader roster, runtime summaries and JSON editor are absent from
this section. Recovery is under a closed-by-default Advanced disclosure; Restore
defaults requires a normal confirmation dialog and uses the existing device-only
reset operation. Cancel preserves preferences. The recovery UI does not depend
on pluginNavigation being available; that optional service only enables the
Manage plugins action. Instances retains its own section. Legacy composition mechanics are retained; its Instances section uses the same updated UI.

The focused browser checkpoint also verifies Client structure, optional recovery
visibility, cancel, management navigation, confirmed reset/reload in a fresh
isolated browser profile, and unchanged Host settings/inventory. Screenshot:
`.scratch/test-dsh/settings-client.png`. The existing overlay browser workflow
uses the updated Client/Advanced/confirmation path.

## Settings visual alignment

Client now uses GeneralSection's column and DesktopChannelRow's label/description
and right-side action layout. Advanced uses Models' existing disclosure styling;
there is no duplicate Client heading or stacked subsection/button layout.

Instances directly imports ModelsSection's styles for its title, cards, action
buttons, inset editor, inputs, advanced fields and dashed Add instance row.
It presents one editor at a time; Name/Address are primary, while stable Instance
ID is advanced. Authentication view is not a form field: new saved profiles
inherit the bound connection’s internal context, and editing preserves their
existing context. New IDs are generated with
`crypto.getRandomValues`, which also works on the HTTP Tailscale demo. The bound
address is read-only. Save failures retain drafts; Cancel writes
nothing. Existing catalog validation, admission, persistence and selection are
unchanged. Availability indicates the admission check, not a new transport;
selecting an additional saved profile never changes the active carrier.

The focused browser checkpoint adds real create/edit/rejected-save/cancel,
selection, reload persistence and 390px layout checks. Screenshots are
`settings-client.png`, `settings-instances.png`, and
`settings-instances-mobile.png` under `.scratch/test-dsh/`. All original CSS
sources remain pristine; no replacement theme or custom stylesheet is added.

## Native configuration entries

Local bundle forms now register through the original `plugins.bundle.config`
keyed Slot. The contributed-tab adapter forwards the original page’s scoped
configuration renderer, and Local reads actual Slot registrations to determine
`configured`; it no longer hardcodes this false or invents a Configure action.
Row pages dispatch `plugins.row.config` separately, so a bundle form is not
mistaken for component configuration.

The local example supplies a Text field using unchanged `SettingsValueField`
and `SettingsForm` components, with the original Save footer and staged-edit
behavior. Its writer remains the concrete local Entry/revision adapter. The
extra Configure locally/Enable locally buttons and generic JSON editor are
removed. Unknown plugins do not gain an invented settings editor; their own
configuration contributions remain the contract. Upstream UI files and styles
are unchanged.

The focused browser workflow verifies direct plugin-page visibility, validation
blocking Save, edit-without-write, actual save/restore, discard on leaving,
separate Components information, and zero Host management writes. The existing
original composer MODEL MOCK checkpoint and 27 repository tests passed.

## Sidebar instance menu

The local navigation entry delegates to a compiled component using the unchanged
AccountMenu trigger styles, Menu/MenuItemButton, StateDot and icons. The expanded
trigger shows the actual bound instance name and connection state dot; its title
supplies the textual state. The collapsed trigger uses the same original compact
sidebar chrome. Diagnostic paragraphs and raw `Instances · connected` labels are
removed.

The menu marks the real bound instance as current. Saved profiles without a
carrier are disabled with the native explanatory tooltip; selecting a saved
preference in Settings never relabels the active connection. Manage instances
opens `mygo-instances` through the original settings shell's shared store handle
(the pinned registration's `create()` explicitly returns its existing instance).
No second settings store or DOM-driven navigation is created. Reconnect delegates
to the existing Connection service when disconnected; induced disconnection was
not added to this UI checkpoint.

Focused browser acceptance verifies the real-name trigger, current/disabled menu
entries, absence of diagnostic copy, original Settings navigation and unchanged
Host state. Screenshot: `.scratch/test-dsh/instance-switcher.png`. The original
composer MODEL MOCK checkpoint and 27 repository tests pass. No custom sidebar
stylesheet or upstream source edits are introduced.

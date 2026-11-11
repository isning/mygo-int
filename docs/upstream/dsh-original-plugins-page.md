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
exists. Built-in configuration shortcuts are not package cards and stay unchanged.

This pin exposes no card-badge Slot. A narrowly scoped, disposable DOM decorator
uses the original `data-plugin-package` anchor and appends only the labels to
its title row. It changes no card layout, handlers, switches or data model.
Read failures remove cached labels; connection and Loader notifications update
the indicators. Upstream source remains pristine. A future public badge Slot can
replace this pin-specific attachment without changing the matching rule.

The Local tab uses
the same pinned `RowsSection` and `RowDetail` components. The build adapter merely
exports those existing functions from a generated module; it neither edits the
upstream checkout nor forks their markup or stylesheet. There is no replacement
main-page component, second controller, separate navigation bar or custom CSS.
Local row switches retain the real Entry identity; protected services remain
locked. Configuration and lifecycle details appear after opening a row.

## Current verification

With the standard owned test Host running:

```bash
node scripts/dsh-unified-plugins-browser.mjs
node scripts/dsh-test-browser.mjs check-default
node scripts/dsh-test-host.mjs check-submit
node --test scripts/test/*.test.mjs
```

The Plugins browser workflow verifies the original page/toolbar, native source
tab, original detail components, actual local disable/enable and configuration
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
`plugins-local.png`. The corrected demo remains on port 4224, listening on
`0.0.0.0`, with its original private login entry. Restart rotates that entry.

Earlier handoffs and isolated browser scripts describing flat source filters,
`data-mygo-unified-plugins`, or source-qualified articles are historical evidence
for the superseded page. They are not current Plugins acceptance commands; use
the updated workflow above. Ownership, persistence and transport mechanisms are
unchanged. No full adapter semantic TSX/checkJs coverage is claimed.

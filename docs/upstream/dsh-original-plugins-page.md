# Extend the original Plugins page

This supersedes the earlier standalone three-source inspection layout. That
layout reused individual rows but replaced the original page, resulting in a
verbose diagnostic list. The user requested modification of the original page.

The original `ui-plugin-manager` now owns the main Plugins registration again.
Its `PluginManagerPage`, controller, header, native tabs, cards, package details,
configuration contributions and Host dialogs run unchanged. The local plugin
registers only two contributions to the existing `plugins.tab` contract:

- **Local** lists actual local Loader entries and controls device-local changes.
- **Instance client** lists actual manifest-owned client entries and exposes
  original roster retry through their detail view.

The original **Installed** tab continues to manage Host packages. Local tabs use
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
tabs, original detail components, actual local disable/enable and configuration
save/restore, protected switches and instance-client capability boundaries. It
compares Host settings/revisions and inventory before/after and observes zero
Host management writes. Desktop and 390px screenshots are captured privately.
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

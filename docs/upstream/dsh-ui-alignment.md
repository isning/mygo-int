# Default client UI alignment

The default single-root composition reuses the pinned DSH UI at
`fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159`. This pass checks the device additions
and their integration with the original pages, rather than replacing upstream
page designs.

## Changes

- Offline language selection renders the original `LanguageRow`, including its
  Menu and keyboard behavior, against the device locale source. The connected
  original language preference remains authoritative.
- Offline layout lives in a CSS module. It wraps on narrow screens and uses
  upstream typography, controls, theme tokens and SettingsPanel.
- Bootstrap retains the original HTTP status on failures. An unauthenticated
  401 shows translated sign-in guidance instead of an internal boot exception;
  local settings remain accessible. Authentication itself is unchanged. The
  private launch link is required after a Host restart invalidates a login.
- Instances keeps the original Models cards and editor. Small layout overrides
  allow long names and origins to wrap without pushing actions off screen.
- The deployed startup response describes the bound DSH origin separately from
  the mygo document origin. The default profile displays the actual fixed carrier
  target from `DSH_ORIGIN` initially. Seeded and added profiles have the same name
  and address editing rules. Version-1 profiles migrate their formerly locked
  address; version-2 storage preserves explicit edits across reload and deployment
  changes. Only an untouched seed address follows a changed test Host port.
  Running connection metadata remains separate: matching an ID alone is not
  sufficient for a Current badge or available connection action. An edited address
  shows saved-but-not-switched status until an actual connection matches it.
  Other saved profiles are preserved. This metadata does not change routing or
  expose the loopback Host on the network.
- Local settings and configuration errors use original error classes. The
  selected-profile badge uses the existing translated copy.
- The default example note contributes an original neutral Tag through
  `sidebar.footer.action`; it no longer creates a green body-level overlay.
  Registration and removal belong to the plugin's Cordis scope. The explicit
  historical legacy rehearsal retains its original marker behavior.
- The browser platform imports the same brand font sheet as the original Web
  entry. The original Vite plugin emits its Montserrat redistribution license.

Plugins Installed/Discover, built-in configuration, Local cards/details and the
configuration entry remain the original components. No Cordis, Loader, Slot,
Remote or upstream source files are edited. Historical standalone action and
legacy rehearsal surfaces are not added to the default composition.

## Verification

Source `scripts/dsh-test-env.sh` before these commands; Node 24 is supplied by
`nix shell nixpkgs#nodejs_24 -c` when needed.

```bash
node --test scripts/test/*.test.mjs
node scripts/dsh-local-composition-build.mjs
MYGO_CLIENT_COMPOSITION=legacy node scripts/dsh-local-composition-build.mjs
node scripts/dsh-unified-plugins-browser.mjs --ui-audit
node scripts/dsh-test-browser.mjs check-instance
bash scripts/dsh-upstream.sh verify
git diff --check
```

The repository suite passes 39 tests. Both adapted builds pass. The real Chromium
audit covers 360, 390, 768 and 1440 CSS-pixel widths for offline Instances, Local,
Installed, Discover, built-in details, local plugin details, connected Instances
and Client settings. It exercises all eight offline locales, reload persistence,
Host locale adoption, migration of a saved client-origin profile address to the
actual DSH target, original built-in configuration availability, long profile
names/origins, local note save/restore, touch plugin disposal/re-enable and visible
keyboard focus. No Host management writes occur during the audit.

Private screenshots and the audit record are under `.scratch/test-dsh/ui-*`.
The focused session workflow passes original New Session, composer, accepted
receipt/request identity, one durable MODEL MOCK reply and cleared draft.

Limits: Discover layout is inspected, not external registry installation.
Screenshots use this host's Nix Chromium font availability. No physical-device
check, real-model inference, full historical legacy browser acceptance, or
adapter-wide semantic TSX/checkJs verification is claimed. T3 preview is explicitly
unavailable because its browser libraries are absent; the repository Chromium
workflow is used instead.

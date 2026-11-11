# Unified original Plugins page (ticket 54)

The new local `unified-plugin-manager.js` entry calls the compiled
`mygo/dsh-unified-plugin-ui` module's `register(ctx)`. The module overrides the
original keyed `main` Slot at `plugins`, priority -100. The original sidebar,
layout, React, Cordis, Slot registry, ModuleSystem and Session remain in use.
It reuses the pinned original `RowsSection` and its CSS, through the existing
in-memory `?mygo-rows` export. No additional React root or Loader is created.

Rows are inspection only. LOCAL rows come from `clientComposition.rows()`
(which checks concrete startup Entry ownership). INSTANCE CLIENT rows match
actual shared Loader entries against the current original module manifest,
excluding concrete locally owned Entries. HOST rows come from the original
`remote.pluginInventory.list()` read. Unclassified client entries are not
silently attributed to the instance. Labels distinguish provenance, execution
runtime, instance and authentication view. Keys encode source, instance,
authentication view and concrete Entry id; module/package names are never keys.

Source and instance filters operate on these actual rows. LOCAL belongs to the
device, rather than the currently selected catalog preference. Remote rows
belong to the connected operator-bound instance. External saved catalog profiles
are shown as unavailable; filtering one cannot switch the connected outlet.
Lifecycle actions remain for tickets 55–57; there are no new toggle/config,
install, remove or Host mutation controls here. A failed inventory read is an
explicit error, not an invented empty successful inventory.

## Parent wiring

Do not change the default legacy composition before ticket 60.
For the explicit single-root composition:

1. Statically import `* as unifiedUI` from `./local/unified-plugin-ui.tsx` in
   `entries/dsh-startup/single-client.js`.
2. After `getStaticModules()`, seed
   `staticModules['mygo/dsh-unified-plugin-ui'] = unifiedUI` before bootstrap.
3. Extend the build adapter's bare-import resolution condition for
   `local/management-ui.tsx` to also include `local/unified-plugin-ui.tsx`.
   Retain the existing original `?mygo-rows` in-memory export and React dedupe.
4. Add `{ "id": "unified-plugin-manager", "name": "./plugins/unified-plugin-manager.js" }`
   after the local composition/instance services in the single-root startup.

The standalone preparation helper generates exactly these build/seed changes
in ignored scratch files. It also generates a controller/runner/startup copy
so acceptance does not edit shared tracked files owned by other tickets.
Run from the repository root, with all pnpm homes configured first:

```bash
source scripts/dsh-test-env.sh
nix shell nixpkgs#nodejs_24 -c bash scripts/dsh-test-prepare.sh install
nix shell nixpkgs#nodejs_24 -c bash scripts/dsh-test-prepare.sh build
node scripts/dsh-unified-plugins-prepare.mjs
MYGO_CLIENT_COMPOSITION=single-root \
MYGO_STARTUP_CONFIG=.scratch/unified-plugins/startup.json \
DSH_CLIENT_PORT=4217 DSH_CLIENT_BIND=0.0.0.0 \
DSH_CLIENT_PUBLIC_ORIGIN=http://100.97.207.47:4217 \
nix shell nixpkgs#nodejs_24 -c node .scratch/unified-plugins/host.mjs start
nix shell nixpkgs#nodejs_24 -c node scripts/dsh-unified-plugins-browser.mjs
nix shell nixpkgs#nodejs_24 -c node .scratch/unified-plugins/host.mjs stop
```

The harness uses a real pristine pinned Host and actual Nix Chromium with original
browser login. Only MODEL inference is mocked. Cookies, launch URLs, browser
profiles and evidence remain private in ignored `.scratch/`. T3 preview open
explicitly reported unavailable host libraries before choosing this fallback.

Original source pin: `fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159`.
DSH UI is MIT, copyright 2026 DeepSeek; retained notice: [dsh-LICENSE](dsh-LICENSE).
The existing build emits its original license in `assets/DSH-LICENSE.txt`.

## Validation in the ticket workspace

- RED: the complete authenticated client booted and opened the original Plugins
  page; the assertion that the local Slot override was present failed.
- GREEN: actual browser observations contained 5 LOCAL entries, 74 INSTANCE CLIENT
  entries and 204 HOST entries. The same original plugin-manager package appeared
  independently in Host and instance-client ownership. Qualified keys were unique;
  all three source filters and connected-instance/device filters passed.
- No Host management mutation was observed. Original startup inspection reads
  (`syncInspectManifest`, `listPlugins`, `listBundles`) are classified as reads,
  not writes. The unified page has no switches or configuration editor.
- Frozen install, all 8 pristine artifact gates, adapted Vite builds, original
  Web `tsc -b`, JavaScript syntax checks, source-pin verification and
  `git diff --check` passed. The upstream checkout retained its original origin
  and no tracked changes.
- There is no adapter-wide `checkJs` project; this is not a claim that the
  JavaScript orchestration or the adapter TSX has a separate full static checker.
  The original Web project is typechecked; the adapter is compiled by Vite.

Private evidence: `.scratch/unified-plugins/red.log`, `final-green.log`,
`web-typecheck.log`, `.scratch/test-dsh/unified-plugin-result.json` and
`unified-plugin.png`. The captured page was visually inspected. The harness
stops its own Chromium normally; the owned Host/carrier is stopped after checks.
Parent integration and the full shared regression suite remain parent work.

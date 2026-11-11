# Legacy device overlay recovery (ticket 58)

The existing local composition service now recognizes one explicit migration:
the exact shipped legacy `local/startup.json` entry list to the exact shipped
`local/single-root.json` entry list at parent `05f675e`. Immutable snapshots live
in `local/plugins/legacy-device-overlay.js`. Future operator composition changes
continue to fail closed; there is no fuzzy package, position or Entry aliasing.

The retained `local-note` Entry preserves the original marker config contract and
restores accepted config/enablement through the original Loader startup hooks.
Its new `modules` injection does not reinterpret any configuration fields. The
removed `local-shell` Workbench has no successor. If an override references it,
a newly introduced entry, a protected entry, an unknown entry or invalid overlay fields, the entire overlay
is rejected before applying any override. The operator baseline runs with an
explicit diagnosis, and the saved data remains available until reset. The
instance/authentication-view storage key and original browser admission remain
unchanged.

A successful legacy restore is explicitly diagnosed. Reading it does not rewrite
device storage. The next runtime-validated local edit commits the current exact
composition and increments the original revision. Existing startup failure
recovery retains the broken desired configuration while reporting that the
operator configuration actually runs; original Settings offers reload/reset.

No additional parent wiring is required. Existing unified LOCAL actions display
the service diagnosis and desired/runtime mismatch. Recovery/reset remains in
the original Settings `LOCAL plugins` section. Shared UI, startup, build and
browser harness files were not edited, and no Host Remote mutation was added.

## Reproduce

From this worktree, acquire/build its own ignored upstream and run:

```bash
source scripts/dsh-test-env.sh
nix shell nixpkgs#nodejs_24 nixpkgs#pnpm -c bash scripts/dsh-test-prepare.sh all
export MYGO_CLIENT_COMPOSITION=single-root
export DSH_CLIENT_PORT=4221 DSH_CLIENT_BIND=0.0.0.0
export DSH_CLIENT_PUBLIC_ORIGIN=http://100.97.207.47:4221
nix shell nixpkgs#nodejs_24 nixpkgs#pnpm -c node scripts/dsh-test-host.mjs start
nix shell nixpkgs#nodejs_24 nixpkgs#pnpm -c node scripts/dsh-overlay-browser.mjs
nix shell nixpkgs#nodejs_24 nixpkgs#pnpm -c node scripts/dsh-test-host.mjs stop
```

The browser harness seeds historical device data in a fresh browser profile,
then uses the complete authenticated mygo client and real pinned Host. Only
model inference uses MODEL MOCK. It restarts the owned Host/carrier while keeping
the browser profile; the same environment variables must reach the harness.
Launch URLs, cookies, detailed logs and screenshots stay in ignored `.scratch/`.

## Evidence

- RED: `.scratch/ticket58-red.log` fails the actual marker assertion: operator
  label `Local note · editable` versus saved `Legacy device note`.
- A second RED (`.scratch/ticket58-new-entry-red.log`) demonstrated that legacy
  data could otherwise acquire a new navigation Entry; migration now accepts
  only the retained legacy note override.
- GREEN: `.scratch/ticket58-final-green.log` and
  `.scratch/test-dsh/overlay-result.json` confirm legacy config restore, browser
  refresh, actual carrier restart, disabled Entry disposal, current-format save
  and reload, another-tab revision refusal without runtime mutation, broken
  config baseline recovery with desired/runtime mismatch, stale/removed-entry
  new-entry and malformed overlay rejection, and original Settings reset followed by
  successful local disable/enable.
- Host settings (including revisions) and plugin inventory are compared around
  local workflows in each Host run. MODEL MOCK's ephemeral endpoint changes on
  restart, so comparisons use a new baseline after restart. No Host management
  writes were observed throughout the workflows.
- The fresh original artifact build passed all 8 gates. Original Web `tsc -b`
  passed; the normal single-root adapted build ran through the owned carrier.
  Focused startup configuration tests passed 3/3. Changed JavaScript syntax and
  `git diff --check` passed. The full parent suite remains parent-owned.
- No full adapter `checkJs` or standalone adapter TSX semantic typecheck is
  claimed. Original Web typechecking does not include these adapter sources.
- Native T3 preview status/open was attempted first. Open explicitly failed for
  missing host browser libraries (`libglib-2.0.so.0`, `libnss3.so`, and others),
  so the documented Nix Chromium/CDP workflow was used. Screenshot
  `.scratch/test-dsh/overlay.png` was visually inspected.
- Upstream pin `fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159` verified pristine.
  Original authentication is unchanged. Owned browser/Host/carrier/model
  processes were stopped normally; no listener is intentionally retained.

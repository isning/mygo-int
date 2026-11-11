# Local instance navigation (ticket 52)

The opt-in `local/navigation.json` fixture contributes instance selection through
DSH's public `sidebar.footer.action` list. The original sidebar owns its layout,
collapse/drawer behavior, workspace tree, Settings and panel navigation. No outer
workbench, additional React root, transport or Host lifecycle manager is added.

`local-navigation.js` requires `instanceManager`, `slots`, `modules`, and the
original `connection`. React and the public Menu, MenuItemButton, Button and
ConnectionIndicator come from the original module seed. Slot injection and
registration follow the local Entry's lifecycle. The plugin does not import
another feature plugin's runtime components.

Saved profile selection uses the existing device-local instance catalog. Actual
connection state comes from the original Connection service's observable state;
a saved external profile never becomes a transport address. The UI names the
bound profile separately and explicitly says external selection did not switch
connections. Original admission gates catalog writes. No Host configuration or
plugin management mutation is part of navigation.

## Isolated verification

Prepare pristine artifacts using `scripts/dsh-test-prepare.sh` with Nix Node and
compiler tools. Source `scripts/dsh-test-env.sh` before **every** pnpm invocation,
including Host provisioning. Then run from this workspace:

```bash
source scripts/dsh-test-env.sh
MYGO_CLIENT_COMPOSITION=single-root \
MYGO_STARTUP_CONFIG=entries/dsh-startup/local/navigation.json \
DSH_CLIENT_PORT=4215 DSH_CLIENT_BIND=0.0.0.0 \
DSH_CLIENT_PUBLIC_ORIGIN=http://100.97.207.47:4215 \
node scripts/dsh-test-host.mjs start
node scripts/dsh-navigation-browser.mjs
node scripts/dsh-test-host.mjs stop
```

`navigation-fixture.js` supplies a real external catalog record through the public
instance manager solely as acceptance input. Omit that Entry in production.
The fixture deliberately omits ticket 53's legacy floating management surface.
The original Settings remain available. Browser credentials, launch URLs, model
mock logs and evidence stay private under ignored `.scratch/test-dsh/`.

## Parent integration

Add `{ "id": "local-navigation", "name": "./plugins/local-navigation.js" }`
to the curated local roster after `instance-manager`. There is no compiled UI
module or build transform to wire: imports use `ctx.modules.import()` and the
existing original seed. Preserve the existing module preloading and concrete
local ownership. Do not add `navigation-fixture` to the production roster.
Do not enable a workbench/outer shell. The current single-root path already
mounts the original renderer directly. Keep legacy as the default until ticket 60.

## Validation on parent `f6fae84`

- RED: real pinned Host and unchanged original client booted; the no-op local
  Entry failed the visible navigation assertion (`0 !== 1`).
- GREEN: one local entry inside the original sidebar; no outer workbench;
  actual original connection state; external saved selection explicitly
  unavailable without changing the bound outlet; selection restored after
  reload; selecting the bound profile again succeeded.
- The original Host session opened and accepted exactly one composer request,
  with its matching original receipt, one new model-mock reply and cleared draft.
  No Host management mutation was observed during either catalog selection.
  Reload startup traffic is measured separately from these local actions.
- Fresh pristine pinned artifact build: 8/8 gates passed. Regular Web `tsc -b`,
  adapted single-root Vite build, three focused startup tests, changed JavaScript
  syntax checks, `git diff --check` and source-pin verification passed. There is
  no full JavaScript `checkJs` project; these are not full JavaScript type checks.

T3 preview was attempted first and explicitly reported missing browser libraries.
The repository Nix Chromium/CDP fallback used `0.0.0.0:4215` and the ordinary
Tailscale URL, without allowed-port flags. Browser login used its own original
DSH authority cookie; only inference used MODEL MOCK. The screenshot was visually
inspected. Private evidence: `.scratch/ticket52/{red,green}.log` and
`.scratch/test-dsh/navigation-{result.json,external.png}`. The owned Host, carrier,
model mock and test browsers were stopped normally after checks.

The curated production roster is intentionally left to the parent integration;
shared startup/build/browser files and the other tickets' UI modules were not
edited. The fixture exercises the actual existing single-root assembly and
runtime module wiring. The default remains legacy.

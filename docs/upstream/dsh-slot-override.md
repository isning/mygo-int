# Local Slot override acceptance (ticket 51)

This opt-in fixture replaces only the original home workspace menu through
`conversation.hero.workspace`. The owning conversation keeps its chooser trigger.
The local presentation directs the user to the original sidebar workspace list;
it does not replace session selection, navigation, Settings or business services.
The official workspace package and Host plugins remain enabled.

The local module uses the original `slots` and `modules` services. React (including
hooks) comes from `ctx.modules.import('react')`, the original shared platform seed.
`slots.inject` tracks the target declaration lifetime; registration at priority
`-100` shadows the official priority `0` occupant. Original Entry disposal releases
the registration, allowing the default menu to render again. No DOM removal or
second root is involved.

The separate `slot-override-controls.js` is an acceptance fixture, not a shipped
management surface. It initially disables the seeded override Entry, then exposes
controls that call the original local Entry's `update` and Loader's `remove`.
It checks that the original Session service and active Session UI fiber retain
object identity throughout. Both fixture entries use the same original Loader as
the unchanged Host-delivered client entries. No Host reconciliation is added.

## Run in an independently prepared workspace

Prepare the pinned pristine artifacts with `scripts/dsh-test-prepare.sh` as described
in `dsh-artifact-build.md`, using Nix Node/compiler tools. Keep all pnpm environment
variables from `scripts/dsh-test-env.sh`, including for the Host's pinned Node dlx.
Then, from the repository root:

```bash
source scripts/dsh-test-env.sh
MYGO_CLIENT_COMPOSITION=single-root \
MYGO_STARTUP_CONFIG=entries/dsh-startup/local/slot-override.json \
DSH_CLIENT_PORT=4214 DSH_CLIENT_BIND=0.0.0.0 \
DSH_CLIENT_PUBLIC_ORIGIN=http://100.97.207.47:4214 \
node scripts/dsh-test-host.mjs start > .scratch/upstream/logs/slot-host-start.log 2>&1
node scripts/dsh-slot-override-browser.mjs
node scripts/dsh-test-host.mjs stop
```

The standalone browser harness uses original browser login and the real pinned
Host. Only inference uses the clearly labelled existing model mock. It asserts
visible default menu → local override → default on disable → override again →
default on Entry removal, compares original Host redacted settings and plugin
inventory before/after, observes management requests, and submits one prompt
through the retained original Session composer. Private logs, browser profiles,
credentials, launch URLs and evidence remain under ignored `.scratch/`.

## Parent integration

Do not change the default composition for this ticket. The curated fixture is
selected with `MYGO_STARTUP_CONFIG`; `single-client.js`, `local/single-root.json`,
shared browser tests and build wiring need no changes. The original native-import
seed loads the enabled override module before official boot, then creates its
local Entry afterward. For initial-disabled production selection, ticket 49's
module seeding must include disabled local modules; this fixture deliberately
starts enabled, seeds it, and disables its real Entry before mount. Do not work
around a missing seed by creating another module system or Loader.

To include just the override in a later composition, add the fixture's
`local-workspace-override` row and omit `slot-override-controls`. Management must
address this locally owned Entry, never the official workspace package or a Host
plugin. Tickets 52 and 53 own navigation and Settings presentation respectively.

## Validation on parent `eda7730`

- RED: with an importable local Entry but no Slot registration, the real browser
  reached the original menu, enabled the Entry and failed the visible replacement
  assertion (`false !== true`). Evidence: `.scratch/test-dsh/slot-red.log`.
- GREEN: original menu before activation, local menu after activation, original
  menu after disable and again after removal. Re-enabling also succeeded. The
  fixture retained the exact Session service and active Session UI fiber.
- Host plugin inventory and redacted configuration values/layers/revisions were
  identical across local actions; no Host management mutation was observed.
  Schema serialization reference IDs are deliberately excluded from configuration
  comparison because the original serializer allocates new IDs on each read.
- The same original Host session accepted one composer submission, returned its
  matching original receipt and one new model-mock reply, and cleared its draft.
- Fresh pristine artifact build: eight gates passed. Original Web `tsc -b` and
  adapted single-root Vite build passed. Three startup-config tests, changed JS
  syntax checks, `git diff --check` and pinned source-integrity verification passed.
  There is no full `checkJs` project for these JavaScript plugins/adapters; these
  results do not claim full JavaScript static type checking.

T3 preview open explicitly reported missing host libraries; the documented Nix
Chromium/CDP fallback used the ordinary public port 4214 without special port
flags. Generated outputs belong to this worktree. The final browser evidence is
`.scratch/test-dsh/slot-override-result.json`, with private logs in
`slot-green-final.log`. The owned Host/carrier/model mock were stopped normally.

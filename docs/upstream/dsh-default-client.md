# Default single-root client (ticket 60)

Both `dsh-startup.mjs` and the direct adapted build now default to `single-root`.
The curated `local/single-root.json` loads local navigation, native Settings and
unified Plugins with LOCAL, INSTANCE CLIENT and HOST actions in the original
React tree. The existing single-instance carrier preserves browser credentials
and original Host permissions. MODEL MOCK replaces inference only.

`MYGO_CLIENT_COMPOSITION=legacy` is an explicit historical fixture, never an
error fallback. Its unchanged `local/startup.json` is also the exact legacy
migration snapshot; do not replace its entries with the new default entries.
Without `DSH_ORIGIN`, default startup refuses rather than rendering a second tree.

## Owned demo and verification

Prepare this checkout using `bash scripts/dsh-test-prepare.sh all`. All pnpm
operations, including launcher-internal dlx, require the local environment first:

```bash
source scripts/dsh-test-env.sh
DSH_CLIENT_PORT=4223 DSH_CLIENT_BIND=0.0.0.0 \
DSH_CLIENT_PUBLIC_ORIGIN=http://100.97.207.47:4223 \
node scripts/dsh-test-host.mjs start
node scripts/dsh-test-browser.mjs check-default
node scripts/dsh-test-host.mjs check-submit
node scripts/dsh-test-browser.mjs check-management
node scripts/dsh-navigation-browser.mjs
node scripts/dsh-native-settings-browser.mjs
node scripts/dsh-unified-plugins-browser.mjs
node scripts/dsh-unified-local-browser.mjs
node scripts/dsh-roster-browser.mjs
node scripts/dsh-test-host-network.mjs
```

Run lifecycle and browser checks sequentially. The overlay browser test performs
its own normal stop/restart; give it the same environment and listener variables.
Run it as:

```bash
source scripts/dsh-test-env.sh
DSH_CLIENT_PORT=4223 DSH_CLIENT_BIND=0.0.0.0 \
DSH_CLIENT_PUBLIC_ORIGIN=http://100.97.207.47:4223 \
node scripts/dsh-overlay-browser.mjs
```

It covers legacy restore, accepted edits, revision refusal, failed configuration,
recovery and reset. `check-default` observes actual React commits using the
DevTools hook, requires one mounted root/renderer and no legacy shell/floating
management, and uses original New Session and composer controls. `check-submit`
also checks durable Host events, request identity, streamed reply and settlement.
The roster observer no longer installs a test-only ownership guard: removal,
restoration and conflict refusal exercise production startup's boundary.

For combined optional lifecycle/permission fixtures, without editing upstream or
rewiring already integrated UI components:

```bash
node scripts/dsh-test-host.mjs stop
node scripts/dsh-default-acceptance-prepare.mjs
source scripts/dsh-test-env.sh
MYGO_STARTUP_CONFIG=.scratch/host-actions/startup.json \
DSH_CLIENT_PORT=4223 DSH_CLIENT_BIND=0.0.0.0 \
DSH_CLIENT_PUBLIC_ORIGIN=http://100.97.207.47:4223 \
node .scratch/host-actions/host.mjs start
MYGO_EXPECT_UNIFIED_MANAGEMENT=1 node scripts/dsh-slot-override-browser.mjs
node scripts/dsh-host-actions-browser.mjs
node scripts/dsh-instance-actions-browser.mjs
node scripts/dsh-composition-diagnosis-browser.mjs
node .scratch/host-actions/host.mjs stop
```

Restart the standard launcher afterward to retain the shipped default demo.
Open `http://100.97.207.47:4223/`; initial access requires the original private
launch entry. `node scripts/dsh-test-host.mjs open` opens an authenticated browser
using a private profile; never print/copy the launch file into public logs.
The ignored launch file and profiles stay workspace-owned and private.

The original pin is `fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159`.
Original artifact gates and Web typechecking do not establish semantic checking
of the adapters: no adapter-wide checkJs or separate TSX typecheck exists.
Browser login supports the original owner view only; restricted-Peer tests
prove original Gateway denial without claiming non-owner browser provisioning.

## Validation on parent 97ad589

- RED: the ordinary legacy default rendered three legacy shell/management nodes;
  the new complete-browser `check-default` failed its absence assertion. GREEN:
  default boot reported one committed React root and one original renderer,
  shared original platform modules and all six curated local entries.
- Original New Session sent one real `session/create`. The original composer
  retained the accepted receipt rpcId, cleared its draft, and displayed exactly
  one new MODEL MOCK reply. Runner verification correlated one durable user event
  and one durable assistant event, three streamed deltas, original usage/stop
  framing and completed turn. Final restart reused the persisted fixture without
  startup model requests.
- Native Settings/local configuration, catalog external-selection honesty,
  three-source Plugins filters, local disable/enable/config rejection and rollback,
  unchanged Host settings/inventory and zero implicit management writes passed.
- Original Slot override enable/disable/remove restored the original chooser;
  combined acceptance then opened local management in that same browser and
  submitted through the retained Session. Owned manifest removal/restoration and
  invalid graph rejection preserved concrete local entries and local management.
- Real Host fixture disable/restore, unauthenticated refusal, original restricted
  Peer permission denial, instance-client retry and graph diagnostics/recovery
  passed against the integrated components. The test profile was restored after
  normal fixture shutdown.
- Exact legacy overlay restore, reload and carrier restart, disabled preference,
  accepted migration, stale revision/configuration refusal, malformed/removed-entry
  recovery and Settings reset passed. Legacy snapshots remain unchanged.
- Anonymous HTTP and WebSocket return 401; invalid Host/Origin return 403;
  tampered/wrong-authority credentials fail. Authenticated original HTTP/WS and
  independent original operator release passed. Missing origin and invalid
  composition refuse startup without a fallback.
- Full repository suite ran once: 27/27. Final pristine artifact build: 8/8 gates
  in 23.49 seconds. Original `tsc -b packages/client/web`, changed JavaScript syntax,
  whitespace and source integrity passed. Pinned tracked/untracked source status
  was clean. The final Slot test extension was syntax-checked and browser-tested
  after these aggregate checks; it changes no runtime implementation.

Private evidence remains under `.scratch/test-dsh/`: `default-red.log`,
`single-root-browser.json`, `submit-validation.json`, `single-management-browser.json`,
`navigation-result.json`, `native-settings-result.json`, `unified-plugin-result.json`,
`unified-local-result.json`, `roster-validation.json`, `slot-override-result.json`,
`host-action-result.json`, `instance-actions-result.json`,
`composition-diagnosis-result.json`, `overlay-result.json`,
`network-validation.json`, `permission-validation.json`, `normal-stop-final.json`,
`restart-final.json`, `no-fallback-final.json`, and final check logs.
Original gate output is `.scratch/upstream/logs/build.log`; Web checking output is
`web-typecheck-final.log`. The Plugins screenshot was visually inspected.

## Review correction

The Spec review found that inventory failures discarded original Remote codes
and details. The unified page now retains the original code, message and details,
with distinct labels for authentication/permission refusal, transport failure and
other Remote failures. The original calls and authorization behavior are unchanged.

The parent reproduced RED through a browser-blocked inventory request: the old
page showed only `original Remote denied or failed`. GREEN retained
`gateway/internal` and the original `Failed to fetch` diagnosis; clearing the
browser cookie retained the original HTTP 401 under a separate authentication
label. These are genuine browser/Remote failures, not replacement response bodies.
Run `MYGO_CHECK_INVENTORY_ERRORS=1 node scripts/dsh-unified-plugins-browser.mjs`
against an owned authenticated test Host to repeat both checks. Initial explicit
onboarding saves precede the Plugins workflow's mutation observation boundary.

The corrected adapted build and full repository suite passed in the parent
workspace (27/27). Private evidence is in
`.scratch/test-dsh/inventory-errors-result.json` and
`.scratch/single-client-tickets/inventory-errors-{red,green}.log`.

T3 preview status/open was attempted first; open explicitly reported missing host
libraries. Documented Nix Chromium supplied browser proof on ordinary port 4223,
without an allowed-port override. Normal shutdown closed owned Host/carrier/mock
listeners; the final standard single-root demo is intentionally retained. Another
physical device's access/routing was not tested. No real model inference, new
non-owner browser login, adapter-wide semantic checking or hostile-code sandbox
is claimed. No GitHub state was changed.

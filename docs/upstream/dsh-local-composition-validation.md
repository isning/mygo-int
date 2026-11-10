# Tickets 42–43: trusted local startup and replaceable shells

Authenticated startup selects `MYGO_STARTUP_CONFIG` (workspace-relative or an
absolute path inside this workspace), defaulting to
`entries/dsh-startup/local/startup.json`. Restart the carrier after changing it.
`alternate.json` selects a different actual plugin module and shell layout.
An empty `entries` array is supported; neither example is a mandatory feature.
Ticket 42 supplies startup loading; ticket 43 supplies the shell examples below.
Remote contribution ownership (44) remains separate.

## Runtime boundary

`dsh-local-composition-build.mjs` loads the pinned upstream Vite configuration
and prepends local startup to its `main.ts` **in memory**. Output goes to
`.scratch/dsh-local-composition/dist`; tracked upstream sources and original
artifact output stay unchanged. This is an adapted entry bundle, not a claim
that its bytes equal the original entry. Existing product isolation, React
deduplication, node-module stub, environment definitions and asset pipeline remain.

The prepended entry obtains Cordis, React, Slot and other framework objects from
the original public `getStaticModules()` and imports the same upstream Loader
implementation used by `AppWebEntry`. It starts a separate local Context and
ordinary Loader entries, waits for quiescence, and requires every enabled entry
to be active. Only then does it import the existing bootstrap module, fetch
remote injections and run the original `AppWebEntry` code. Local startup failure
disposes the local tree, displays a diagnostic and prevents remote startup.
No competing Loader, module registry, generated Remote or SDK is introduced.
The enum mirror comes from the original Web `loader-status.ts` because Cordis's
const enum has no runtime export.

Local entries use Loader's existing relative ESM import path with
`baseUrl = <presentation-origin>/mygo-local/`. Names are restricted to
`./plugins/<name>.js`, served from `entries/dsh-startup/local/plugins/` with
realpath containment. Remote bootstrap cannot select these entries. This is
trusted local code in the same browser realm, **not a sandbox** or implementation
of ticket 44. Remote ClientEntries still owns only the original remote tree.

The base has no marker or shell semantics. Example plugins own their DOM,
labels, placement and `ctx.effect` cleanup. Local presentation surrounds
the remote `#root` and survives its mount. The local Context disposes on actual
page departure; a persisted back/forward-cache page retains its tree.

## Ticket 43: two local shells and the original instance outlet

`startup.json` selects `workbench.js`: a green left rail beside the instance.
`alternate.json` selects `focus.js`: a purple header above the instance. Change
`MYGO_STARTUP_CONFIG` and restart the carrier to select another composition;
this is startup selection, not live navigation or hot replacement.

Both ordinary Loader entries call the plugin-owned `shell-layout.js` helper.
It claims the existing `#root` node before remote bootstrap, places it inside
an explicitly labelled instance `<main>` outlet, and allocates real grid space
for the local chrome. It neither copies nor renders the instance UI. Upstream
`AppWebEntry` mounts its original React/Slot Root into that same node, with its
original modules, Loader and SessionManager. The layout helper owns no session
state or remote configuration. Disposal restores the same node to its previous
parent without unmounting the instance React root. Competing local shell claims
fail activation rather than silently selecting the last one.

The shell has `data-contribution-owner="trusted-local"`; its outlet has
`data-ui-owner="connected-instance"`. These are explicit presentation ownership
labels, **not enforcement or a remote-entry owner ledger**. Both trees still
execute in one trusted compatibility realm. Remote UI can access the DOM; no
sandbox or protection against hostile plugins is claimed.

## Interface for ticket 44

Keep schema 1's `entries` as ordinary Loader `{id,name,config,disabled,inject}`
options. Add local modules under the local plugin directory and select them in
the startup file. The local Context exposes `ctx.mygoPlatform.modules`, the
official static module objects (including `react`, `react-dom/client`, Cordis
and Slot). A local React plugin can consume those objects without another
framework bundle. Its own effect must own and dispose its mount.
The returned `{ctx,dispose}` from `startLocalComposition` is local lifecycle
state, not a remote graph entry. Ticket 44 should attribute remote entries within
the original remote tree without granting them trusted global shell ownership
or disposing the local tree on remote refresh. No general navigation, instance
catalog, shell registry or remote owner ledger is introduced here.
Local ESM modules must use relative imports or the provided
platform objects; the browser does not resolve arbitrary npm specifiers.

## Reproduce

First acquire, frozen-install and build the original artifacts following
[the artifact handoff](dsh-artifact-build.md). Every pnpm invocation must inherit
the workspace-local environment below. Host execution uses pnpm's
`node-linux-x64@24.21.0`; the original artifacts use the installed Nix Node.

```bash
export XDG_CACHE_HOME="$PWD/.scratch/upstream/.cache"
export XDG_DATA_HOME="$PWD/.scratch/upstream/.data"
export XDG_STATE_HOME="$PWD/.scratch/upstream/.state"
export PNPM_HOME="$PWD/.scratch/upstream/.pnpm"
export npm_config_cache="$PWD/.scratch/upstream/.npm-cache"
export npm_config_store_dir="$PWD/.scratch/upstream/.pnpm-store"
nix shell nixpkgs#chromium -c chromium --version
node --test scripts/test/dsh-{local-startup-config,bootstrap-carrier,rpc-carrier,events-transport,session-carrier,carrier-trust,test-model}.test.mjs packages/dsh-host-status/test/status.test.js
DSH_CLIENT_PORT=4187 DSH_CLIENT_BIND=0.0.0.0 \
  DSH_CLIENT_PUBLIC_ORIGIN=http://100.97.207.47:4187 \
  node scripts/dsh-test-host.mjs start
node scripts/dsh-test-browser.mjs check-local
node scripts/dsh-test-host-network.mjs
node scripts/dsh-test-host.mjs check-submit
node scripts/dsh-test-host.mjs stop
MYGO_STARTUP_CONFIG=entries/dsh-startup/local/alternate.json \
  DSH_CLIENT_PORT=4187 DSH_CLIENT_BIND=0.0.0.0 \
  DSH_CLIENT_PUBLIC_ORIGIN=http://100.97.207.47:4187 \
  node scripts/dsh-test-host.mjs start
MYGO_EXPECT_LOCAL_PLUGIN=focus node scripts/dsh-test-browser.mjs check-local
node scripts/dsh-test-host.mjs stop
bash scripts/dsh-upstream.sh verify
git diff --check
```

## Ticket 42 evidence and limits (before shell implementation)

Fresh frozen install and all original artifact gates passed (8/8, 115.85s).
Focused config/carrier/transport/model/Host tests passed 22/22. Actual Nix
Chromium at `http://100.97.207.47:4184/` verified both configured plugin choices:
the selected marker was already visible when `/mygo/index-injections` was
requested, with neither the remote facade nor graph present. It survived the
official remote UI mount and disappeared through Cordis disposal. Screenshots
were inspected. Private evidence is ignored under `.scratch/test-dsh/local-*`.

The original composer completed a MODEL MOCK request: one accepted receipt with
the original identity, one durable user message, one new durable assistant
message, three streamed chunks, preserved usage/stop framing, cleared draft and
no duplicates. This is deterministic local model evidence, not real inference.
Network verification reached the actual Tailscale address: HTTP 200, socket 101,
invalid Host/Origin and missing socket Origin 403, unauthenticated Host 401.
No separate device's routing or ACLs were tested.

T3 preview was attempted first and explicitly failed with “This host is missing
libraries T3's browser needs”; the existing Nix Chromium/CDP helper supplied
browser proof. All owned test listeners were stopped normally. No other
worktree or process was used, and no remote Git/issue/PR/deployment action ran.

## Ticket 43 evidence and limits (2026-11-10)

Fresh workspace frozen install passed. The unmodified pinned artifact build
passed all 8 gates in 100.01s; authenticated startup then rebuilt the adapted
entry with the original Vite configuration. Source verification still reports
`fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159`, with no tracked upstream edits.
Focused startup/bootstrap/lazy/Terminal/upload/download tests passed 13/13.

Nix Chromium reached `http://100.97.207.47:4187/` with each configuration.
Both shells appeared before remote graph acquisition, retained the same `#root`
node, opened the original retained session with visible MODEL MOCK history, and
survived original UI activation. Workbench allocated a 200px rail; Focus allocated
a 56px header. Both the lazy boot module and the original Terminal chunk returned
200, and the original Terminal face mounted. Local Cordis disposal removed the
shell while preserving the original root/editor. Screenshots were inspected;
private evidence is under `.scratch/test-dsh/local-{workbench,focus}.{json,png}`.

The original composer completed one MODEL MOCK submission with one durable user
message, one durable assistant message, three streamed chunks, original receipt
identity, usage/stop framing and a cleared draft. This is deterministic mock
evidence, not real inference. The composer check now waits for warm-up history
before counting replies; its first attempt exposed that existing counting race.
One repeated browser visit on the same Host showed a `gateway/internal` history
stream error; clean Host restarts passed the stricter visible-history check for
both shells. Repeated-connection reliability was not repaired in this ticket.
Terminal environment/execution remains denied (403); only the preserved lazy
face is exercised here. Existing upload/download carrier tests passed, but their
full browser workflows were not rerun for this shell-only change.

T3 preview was attempted first and reported missing browser libraries. The
repository's Nix Chromium/CDP helper supplied the browser checks. Only owned port
4187 and this workspace's scratch artifacts were used. Owned listeners were
stopped normally; no GitHub mutation, push, PR or deployment was performed.

# Ticket 42: trusted local startup configuration

Authenticated startup selects `MYGO_STARTUP_CONFIG` (workspace-relative or an
absolute path inside this workspace), defaulting to
`entries/dsh-startup/local/startup.json`. Restart the carrier after changing it.
`alternate.json` selects a different actual plugin module and visible marker.
An empty `entries` array is supported; neither example is a mandatory feature.
This implements ticket 42 only. Shell switching (43), remote contribution
ownership (44), and upload changes are outside this change.

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
labels, placement and `ctx.effect` cleanup. Local presentation mounts outside
the remote `#root` and survives its mount. The local Context disposes on actual
page departure; a persisted back/forward-cache page retains its tree.

## Interface for ticket 43

Keep schema 1's `entries` as ordinary Loader `{id,name,config,disabled,inject}`
options. Add local modules under the local plugin directory and select them in
the startup file. The local Context exposes `ctx.mygoPlatform.modules`, the
official static module objects (including `react`, `react-dom/client`, Cordis
and Slot). A local React plugin can consume those objects without another
framework bundle. Its own effect must own and dispose its separate mount.
The returned `{ctx,dispose}` from `startLocalComposition` is local lifecycle
state, not a remote graph entry. No shell election or replacement API is defined
by ticket 42; ticket 43 should define it in plugins without moving semantics
into this mechanism. Local ESM modules must use relative imports or the provided
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
DSH_CLIENT_PORT=4184 DSH_CLIENT_BIND=0.0.0.0 \
  DSH_CLIENT_PUBLIC_ORIGIN=http://100.97.207.47:4184 \
  node scripts/dsh-test-host.mjs start
node scripts/dsh-test-browser.mjs check-local
node scripts/dsh-test-host-network.mjs
node scripts/dsh-test-host.mjs check-submit
node scripts/dsh-test-host.mjs stop
MYGO_STARTUP_CONFIG=entries/dsh-startup/local/alternate.json \
  DSH_CLIENT_PORT=4184 DSH_CLIENT_BIND=0.0.0.0 \
  DSH_CLIENT_PUBLIC_ORIGIN=http://100.97.207.47:4184 \
  node scripts/dsh-test-host.mjs start
MYGO_EXPECT_LOCAL_PLUGIN=alternate node scripts/dsh-test-browser.mjs check-local
node scripts/dsh-test-host.mjs stop
bash scripts/dsh-upstream.sh verify
git diff --check
```

## Evidence and limits

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

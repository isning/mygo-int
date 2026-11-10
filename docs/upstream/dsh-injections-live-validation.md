# Issue 30: ordered index injection export

Validated 2026-11-10 on baseline `7ed6109`, using a fresh ignored checkout of
DSH `fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159`. No upstream core edits,
remote deployment, issue mutation, push, PR or browser work was performed.

## Contract and scope

The existing `@mygo/dsh-host-status` Host plugin now also registers exact
`GET /mygo/index-injections`. It uses the same original-request admission and
owner-only authorization as `/mygo/status`, then calls the public synchronous
`ctx.webServer.collectIndexInjections(admission.peer)` once. The response is
`{schemaVersion:1,injections:[...]}` with the full unmodified collection in its
original order. No sorting, filtering, deduplication, Peer fabrication, index
authorization, CORS change, rendering or execution is involved. The status
response remains unchanged. Both registrations belong to Cordis effects.

See the [package contract](../../packages/dsh-host-status/README.md) for the
six original row types, fail-closed JSON encoding rules and explicit HTML
limitations. In particular, raw `tapIndex` transforms, frontend base HTML and the
renderer-generated readiness tail are not collector rows. This ticket does not
implement their reconstruction or issue 31's client consumption.

## Reproduce in a fresh workspace

First run the complete [pinned artifact build](dsh-artifact-build.md). This run's
frozen install succeeded; all **8 artifact gates passed in 101.70 seconds**.
Then run from the repository root, stopping on any failure:

```bash
set -euo pipefail
umask 077
export XDG_CACHE_HOME="$PWD/.scratch/upstream/.cache"
export XDG_DATA_HOME="$PWD/.scratch/upstream/.data"
export XDG_STATE_HOME="$PWD/.scratch/upstream/.state"
export PNPM_HOME="$PWD/.scratch/upstream/.pnpm"
export npm_config_cache="$PWD/.scratch/upstream/.npm-cache"
export npm_config_store_dir="$PWD/.scratch/upstream/.pnpm-store"
export NARB_NATIVE_CACHE_DIR="$PWD/.scratch/status-live/native-cache"
export DSH_HOME="$PWD/.scratch/status-live/home"
export DSH_AGENTS_HOME="$PWD/.scratch/status-live/agents"
export DSH_TELEMETRY_DISABLED=1
node --test packages/dsh-host-status/test/status.test.js
node scripts/dsh-status-live-prepare.mjs
pnpm --config.auto-install-peers=false dlx --package=node-linux-x64@24.21.0 \
  node .scratch/status-live/anchor/smoke.mjs \
  > .scratch/status-live/runtime-official.log 2>&1
cat .scratch/status-live/result.json
node .scratch/upstream/deepseek-harness/node_modules/typescript/bin/tsc \
  --noEmit --strict --module NodeNext --moduleResolution NodeNext \
  --target ES2024 --types node \
  --typeRoots .scratch/upstream/deepseek-harness/node_modules/@types \
  .scratch/status-live/anchor/types.ts
bash scripts/dsh-upstream.sh verify
git diff --check
```

All pnpm invocations, including provisioning and dlx, used workspace-local cache,
data, state and store settings. Ignored artifacts do not transfer with the commit.
The original [status runtime handoff](dsh-status-live-validation.md) explains the
local install anchor and Nix Node native compatibility caveat. This run used the
workspace-local `node-linux-x64@24.21.0` binary for real Host startup. Private logs
contain a synthetic launch token; never publish them. Cookies stay in memory.
The result file contains statuses, row counts and row kinds, not injection values
or credentials.

## Actual verification

- Seven Node HTTP tests passed. They cover existing status behavior, every row
  kind, duplicate/order preservation, fresh collections, exact admitted Peer
  identity, denied admission/non-owner/method/path handling, disposal, and empty
  500 for invalid JSON data without invoking getters or `toJSON` functions.
- Original real launch-token exchange returned **303** and issued its signed
  cookie. No secret, cookie or Peer was fabricated.
- Real owner GET and query GET returned **200** with all **13 original rows**.
  Their kind order was `style, script, global, script, script-preload,
  script-preload, script-src, global, global, global, global, global, global`.
  This includes the theme contribution ahead of bootstrap and contributions
  beyond `__DSH_BOOT__`.
- The smoke temporarily observes the original `admit` and collector methods,
  delegating unchanged to both. It asserts exact admitted Peer reference identity,
  owner principal, one collection per successful request, and deep equality of
  parsed response with the original collector result, without normalizing the
  expected table through JSON first. It never records Peer or row values.
- A temporary real `webserver/index-inject` subscriber prepended a style and
  appended two identical HTML rows. Both requests returned **16 rows** in exact
  collector order, preserving duplicates and a changed live generation value.
  The subscriber was disposed afterward; the original 13 rows were restored.
- Missing credentials and launch-token-only injection requests returned **401**.
  Bad Host, bad Origin and cross-site Fetch metadata with the valid cookie each
  returned **403**. Authenticated POST returned **405**, `Allow: GET`.
  Denied requests never reached collection. Adapter responses used `no-store`,
  and successful injection responses used JSON content type.
- Actual Loader disable disposed the plugin fiber (state 4); both routes returned
  **404**. Re-enable restored status **200** and the original 13-row injection
  response **200**. Normal original launcher shutdown completed, a fresh HTTP
  connection failed with **ECONNREFUSED**, and the runner exited **0**.
- Existing live status assertions (release schema, admission, trust fences,
  methods and query behavior) also passed unchanged.
- TypeScript **6.0.3** strict NodeNext declarations passed **without skipLibCheck**,
  including `IndexInjectionsResponse` using the original Host row type.
- Post-run upstream verification passed; upstream tracked files remain pristine.

No blocker remains for this ticket's pinned owner endpoint. Unverified: external
Hosts, browser consumption, package-manager tarball installation, live non-owner
admission and injected-service loss/recovery. Non-owner denial is covered by the
focused double-based HTTP check, not claimed as live authentication evidence.
No client is implemented here; issue 31 must consume these data using the original
runtime contracts and handle the separately documented HTML/renderer limitations.

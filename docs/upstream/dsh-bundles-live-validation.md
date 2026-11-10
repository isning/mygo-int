# Issue 32: original application bundles and externals

Implementation baseline `2875306`; original DSH source remains pinned to
`fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159`. This worktree acquired its own
ignored checkout, completed the frozen install and rebuilt all original artifacts.
The 8 artifact gates passed in 114.47 seconds; upstream tracked sources remained
pristine. No upstream source or generated Remote contract was patched.

## Bundle capability

The existing authenticated loopback carrier now admits the exact initial batch
and per-package fallback combo URLs in the collected `__DSH_BOOT__` graph.
`graphBundleReferences` checks package identities, canonical original combo URL
syntax, exact revision strings and complete unique batch membership before
publishing the allowlist. Application preloads do not grant additional access.
Changing a revision, adding a query parameter or requesting an undeclared path
does not attach the owner credential or contact the Host.

Before readiness resolves, the independent bootstrap installs the existing
`ClientTransportHooks.loadBundle` seam. It loads only those exact references as
classic scripts. The original loader registers the original package factories,
arrives their dependencies, resolves externals through its original static seed
table and memoizes module exports. Existing independently installed transport
members are preserved. No RPC/event implementation or replacement module loader
is added.

The selected target address is the explicit `DSH_ORIGIN`, restricted to an HTTP
127.0.0.1 origin. Browser bundle requests go to the independent local entry;
only the carrier attaches the explicitly supplied owner cookie to that target.
Host/Origin/Fetch metadata checks, GET-only admission, redirect rejection and
no-CORS behavior remain in force for every admitted bundle. Browser credentials
are never forwarded. The original injected Peer and permission context are
applied unchanged. No `ownsHost` flag is introduced; a remote-supplied package
does not acquire transport ownership. This local development capability does
not establish external-Host or production credential support.

The graph declares bundle URLs, not a complete asset inventory. `resolveAsset`
fails explicitly for undeclared package assets; no generic `/plugins` resource
proxy is available. Package chunks, source maps, revision updates, RPC, sessions
and event streams remain outside this change.

## Reproduce

Complete [the artifact build](dsh-artifact-build.md) in this worktree first.
Then run from its root, stopping on any failure:

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
node --test packages/dsh-host-status/test/status.test.js scripts/test/dsh-bootstrap-carrier.test.mjs
XDG_CACHE_HOME="$PWD/.scratch/browser-cache" nix shell nixpkgs#chromium -c chromium --version
node scripts/test/dsh-bundles-live-prepare.mjs
pnpm --config.auto-install-peers=false dlx --package=node-linux-x64@24.21.0 \
  node .scratch/status-live/anchor/bundles-smoke.mjs \
  > .scratch/dsh-startup/bundles-runtime.log 2>&1
bash scripts/dsh-upstream.sh verify
git diff --check
```

Port 4178 must be free. The test preparer derives an ignored runner from the
existing startup smoke without changing its shared preparer. A CDP observer
captures the original module-system return value and seed arguments; it does not
substitute either. The runner closes its owned browser/carrier with SIGTERM and
shuts down the original Host in `finally`. The owner cookie remains mode 0600;
all runtime logs and browser profiles are private ignored scratch. Never publish
the runtime logs or cookie. Nix Node builds artifacts; the workspace-local
pnpm-provided Node binary runs the Host because of the documented native-runtime
preparation limitation.

## Actual verification and limits (2026-11-10)

The real Host login returned 303 and its 74-entry graph reached the original
loader's `live` mode. Chromium materialized 70 application package records, in
addition to the bootstrap module. For each materialized graph package, importing
its original `<id>/client` alias returned the identical exports object. Actual
factory edges resolved all 11 original platform seed identities, including React,
React DOM, Cordis, store and Slot/UI seeds. For example,
`@deepseek-ai/dsh-client-ui-renderer` resolved React, React DOM, JSX runtime,
Slot and Cordis through the original module table. `ownsHost` was false.

The unchanged official BootPage still reports one required entry failing on an
undeclared package image; optional account/brand packages also reference images.
This is successful original package/external loading, not a completed UI mount
or a connected session. The asset failures remain visible through the official
activation audit. RPC/events and full resource support are unverified here.

Evidence stays in `.scratch/dsh-startup/bundles-live-result.json`,
`bundles-live-dom.html` and `bundles-last-observation.json`. Nine focused Node
tests passed, covering the existing adapter plus exact batch/fallback admission,
changed revisions, undeclared paths, request fencing and method rejection.
Syntax, whitespace and post-run pinned-source checks passed.

T3 `preview_status` was unavailable; `preview_open` explicitly returned
`This host is missing libraries T3's browser needs` (including libglib and
libnss3). The documented Nix Chromium 155 fallback supplied browser evidence.

# Issue 31: independent entry applies real bootstrap

2026-11-10, implementation baseline `2471262`, original DSH source
`fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159`. Fresh ignored acquisition and
frozen install in this worktree; all 8 original artifact gates passed in 102.62s.
Upstream tracked sources remain pristine. No remote deployment or Git mutation.

## Reproduce

First complete [the artifact build](dsh-artifact-build.md) in this worktree.
Then run these commands from the repository root, stopping on failure:

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
node scripts/dsh-startup-live-prepare.mjs
pnpm --config.auto-install-peers=false dlx --package=node-linux-x64@24.21.0 \
  node .scratch/status-live/anchor/startup-smoke.mjs \
  > .scratch/status-live/startup-runtime.log 2>&1
bash scripts/dsh-upstream.sh verify
git diff --check
```

The runner reuses the status smoke's installation anchor and original `runProfile`
launcher. Nix Node builds artifacts; the pnpm-provided Node binary runs the Host
because of the native preparation caveat in the status handoff. All pnpm state is
workspace-local. Chromium comes from `nix shell nixpkgs#chromium`; the runner
uses a fresh workspace-local profile and CDP over loopback. Provision Chromium
beforehand with the same Nix command if its first download exceeds the runner's
30-second readiness wait. Port 4178 must be free. The runner terminates its owned
carrier/browser and invokes the original Host shutdown in `finally`.

Private ignored runtime logs may contain the synthetic launch token. Never print
or publish them. The normal 303 token exchange produces the signed owner cookie;
the runner writes it only to ignored `.scratch/dsh-startup/owner-cookie` (0600).
No token, cookie, Peer or signing secret is fabricated. No admission/CORS policy
is changed. The narrow carrier's explicit credential boundary is documented in
the [entry README](../../entries/dsh-startup/README.md).

## Evidence and exact boundary

Real Chromium passed the following checks against the original Host and adapter:

- Normal login returned 303.
- The actual graph contained 74 entries. Browser graph revision and entry count
  matched `ctx.clientModules.graph()` from the real Host.
- The readiness promise resolved and the original module loader entered `live`
  mode. Its bootstrap script came from the exact original graph combo URL.
- The unchanged official entry and original public apply export were served;
  no replacement module-system constructor or static seed table was used.
- The original BootPage displayed `Failed to load plugins` and
  `web boot: 6 required entries did not activate`, with detailed original bundle
  import diagnostics. The missing-bootstrap-facade failure was gone.

Evidence stays ignored in `.scratch/dsh-startup/live-result.json` and
`live-dom.html`. The focused Node carrier test also verifies denial before
upstream access for invalid Host/Origin/Fetch metadata, method restriction,
unchanged injection response, exact bootstrap URL admission, and no credential
forwarding to application bundle or RPC paths. The seven existing adapter tests
passed unchanged (8 total with the new carrier test). Syntax/whitespace checks
and post-run source verification passed.

T3 preview status was unavailable; `preview_open` explicitly failed with
`This host is missing libraries T3's browser needs` (including libglib and libnss3).
The documented Nix Chromium fallback supplied real browser execution evidence.

This implements injection acquisition/application, readiness and original module
initialization only. Application combo bundles and fallback single-module fetches
remain 404, deliberately ending at issue 32. RPC and event streams remain issues
33/34. Theme/resource and business requests are not comprehensively repaired.
Raw `tapIndex` transformations and Host base HTML are not reconstructed. External
Hosts, production credential custody, rejection-path browser coverage and fully
connected sessions are unverified.

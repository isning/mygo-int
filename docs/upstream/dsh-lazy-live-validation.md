# Ticket 38: one original lazy Terminal UI

Parent: `d81aa3b`. Source remains upstream
`fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159`. This worker owns port **4182**
and `.scratch/lazy-live/`; it does not use the retained 4180 client.

The selected entry is `@deepseek-ai/dsh-client-ui-sidebar-terminal`:
`src/client/index.ts` registers `LazyTerminalBody` in the original
`sidebar.right.pane.tab` Slot. `LazyTerminalBody.tsx` uses React `lazy()` and
`Suspense` to import `terminal.tsx`. The original tsdown preset emits
`lib/client.terminal.js`, registered with the original module loader and the
original owner identity. React, xterm, CSS, services and Slot props are unchanged.

`entries/dsh-startup/lazy-resources.js` derives exactly one reference from that
owner's original boot graph row:
`plugins/@deepseek-ai/dsh-client-ui-sidebar-terminal/client.terminal.js?rev=<row.rev>`.
The row must occur once, have a bounded alphabet revision, and retain its exact
canonical single-entry URL. No chunk wildcard, source map, arbitrary package,
asset path or caller-supplied target origin is admitted.

`scripts/dsh-lazy-carrier.mjs` keeps the owner cookie server-side, fences the
local Host/Origin/fetch-site and GET method, re-reads the configured real Host's
injections before admitting the exact current revision, rejects redirects and
non-JavaScript success bodies, and forwards up to 4 MiB without rewriting bytes.
Responses are no-store/nosniff and never forward Set-Cookie.

## Parent wiring handoff

Shared startup/carrier trust files and `bootstrap.js` are deliberately untouched.
The parent integrates these three seams after reconciling the network worker:

Parent integration has now applied the seams below and uses the shared exact
public-origin trust policy. The retained demo still requires an update/restart;
the browser evidence here belongs to the isolated harness, not that deployment.

1. Serve `entries/dsh-startup/lazy-resources.js` as the exact local module URL
   `/mygo-boot/lazy-resources.js`.
2. In bootstrap, import `lazyBundleReferences`; after the existing
   `graphBundleReferences(graphs[0].value)` validation, add its returned exact
   reference to the existing `loadBundle` allowlist. Preserve the original
   script loading hook and all other transport hooks.
3. Instantiate `createLazyCarrier({origin: DSH_ORIGIN, cookie: ownerCookie})`
   on the server and invoke it before the static fallback. Do not add a
   general `/plugins/` proxy or change bootstrap graph authority.

`scripts/dsh-lazy-live-prepare.mjs` rehearses only these seams by generating an
owned scratch startup module and modifying the bootstrap response in memory.
It fails if an expected source seam changes. It derives an owned Host runner
from the retained test runner, using `.scratch/lazy-live/`, the local HTTP model
mock, an original Host-created session, and port 4182. It then runs the owned
browser checkpoint and stops Host, model, carrier and Chromium normally.
This is integration evidence for the handoff, not production wiring.

## Reproduction

Prepare the original artifacts using `scripts/dsh-test-prepare.sh` first.
Run from this worktree root, with 4182 free:

```bash
set -euo pipefail
umask 077
source scripts/dsh-test-env.sh
export DSH_HOME="$PWD/.scratch/lazy-live/home"
export DSH_AGENTS_HOME="$PWD/.scratch/lazy-live/agents"
export NARB_NATIVE_CACHE_DIR="$PWD/.scratch/lazy-live/native-cache"
node --test scripts/test/dsh-lazy-carrier.test.mjs
node scripts/dsh-lazy-live-prepare.mjs
pnpm --config.manage-package-manager-versions=false --config.auto-install-peers=false \
  dlx --package=node-linux-x64@24.21.0 node \
  .scratch/status-live/anchor/lazy-host.mjs \
  > .scratch/lazy-live/runtime.log 2>&1
bash scripts/dsh-upstream.sh verify
git diff --check
```

All XDG cache/data/state, PNPM_HOME, npm cache and store variables must be set
before pnpm (including provisioning), as the environment helper does.
No API key is needed. No global credentials are consulted.

## Acceptance boundary and ticket 39

Opening the Terminal entry can attempt original terminal service calls. This
change deliberately admits **no terminal RPC or terminal stream**. A loaded
original renderer's visible transport error is evidence of the lazy UI path,
not evidence of a functioning terminal or completed service action. Do not
close ticket 39 based on this check.

The next action is to inspect the original `terminal/environment` request (the
first observed blocker, HTTP 403), then the original controller's parallel
availability lookup and subsequent creation/connection contracts. Select one
bounded real service action with the parent and add its separate capability and
verification. No creation/connection success was observed. Do not broaden the
session multiplexer's allowlist speculatively.

## Verification results

Focused capability tests pass (3/3). The original frozen install passed across
394 projects; the unchanged artifact graph passed all 8 gates in 97.75 seconds.
Upstream source verification and `git diff --check` passed.

The owned Nix Chromium/CDP checkpoint exited 0. T3 preview was attempted first;
it explicitly reported missing browser libraries (`libglib-2.0.so.0`, `libnss3.so`
and others). Browser network observation began before navigation, with cache
disabled. There was no terminal chunk request before opening the original
sidebar guide's Terminal button. Opening it requested exactly once:

```text
/plugins/@deepseek-ai/dsh-client-ui-sidebar-terminal/client.terminal.js?rev=04151f7c6cd2
HTTP 200, text/javascript, 686995 bytes
SHA-256 0d772010be880796af7c59ba6105f425b853b62bc2c937c14867cfa436129fc7
```

The browser body equaled the authenticated original Host body byte for byte;
it came from neither disk cache nor a service worker. The original
`[data-sidebar-terminal]` section measured about 323 × 455 CSS pixels and
visibly displayed its own Retry button and `terminal/environment` HTTP 403
transport error. The screenshot was visually inspected. No uncaught browser
exception was recorded. This proves real lazy code loading and original UI
rendering, **not a usable terminal**. The same screenshot showed an original
session-history `WebSocket closed (gateway/internal)` error after opening this
entry; this run does not establish continued history/composer health. Resolving
that service/stream interaction belongs in the separate bounded action work.

The failed first assertion expected only HTTP 404 for denied terminal RPCs;
the existing inventory carrier correctly denied it with HTTP 403. The browser
assertion was corrected to accept either explicit denial. The second run passed.
Both runs stopped their owned servers normally; no server is retained.
Private logs, owner cookie, profile, DOM, screenshot and network evidence remain
under ignored `.scratch/lazy-live/` and are not committed.

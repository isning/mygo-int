# Ticket 39: original Terminal guide discovers real Host shells

Validated on parent `50ff9ee`, with pristine upstream
`fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159`. This worker owns port **4185**
and `.scratch/terminal-live/`; no listener is retained after the check.

## Actual action and result

The original React sidebar guide's Terminal **Shell** dropdown is an existing
service action. Clicking its `button[aria-haspopup=menu]` calls
`ClientTerminals.launchShells`, which invokes the original generated
`remote.terminal.shells(sessionId, signal)`. `TerminalGuide.tsx` renders the
returned shell names as menu items. Selecting a shell would create a terminal;
this check opens the menu only and never selects a shell or opens a terminal tab.

The real browser made exactly one POST `/api/terminal/shells`, received HTTP 200
and original `result.ok: true`, and visibly displayed **bash**. The response was:

```json
[{"path":"/run/current-system/sw/bin/bash","name":"bash","args":["-i"]}]
```

The harness compares that response with the same real Host's direct
`ctx.terminalController.shells` result and requires every returned name to appear
in a menu item with nonzero width. It checks the exact generated request's
`payload: {args: {agentId: <owned Session id>}}`. HTTP 200 alone cannot pass.
The Host's terminal list remains empty. No `create`, `attach`, `retain`, or
`environment` request is made. The original lazy Terminal renderer is not needed
for this guide action; ticket 38's renderer/chunk proof remains separate.

After the menu action, the original history shows the settled deterministic
local MODEL MOCK reply; no `WebSocket closed`, `gateway/internal`, or plugin-load
failure is visible. The successful run recorded no uncaught browser exceptions.
The final screenshot was visually inspected. This checks this bounded path,
not all reconnect or history behavior after other Terminal actions.

Private evidence stays ignored under `.scratch/terminal-live/`: `result.json`,
`shell-menu.png`, `shell-menu-dom.html`, runtime/browser logs and owner cookie.
The client bound `0.0.0.0:4185` and the browser used the exact public origin
`http://100.97.207.47:4185`. Internal authenticated Host/model services remain
loopback. The harness stops its own carrier, Chromium, Host and model normally.

## Original contract and authority

Original sources inspected:

- `packages/client/ui-sidebar-terminal/src/client/TerminalGuide.tsx`:
  cancellable discovery on opening the Shell menu, real names or visible errors.
- `packages/api/terminal-controller/src/client/index.ts`: `launchShells` rejects
  a failed original Remote result rather than returning empty successful data.
- `packages/api/terminal-controller/src/index.ts`: `@Remote shells(agent, signal)`
  discovers shells using that Agent's execution provider. `environment` is a
  distinct read; new terminal views proceed to shell discovery and creation,
  so merely allowing environment would not yield a successful visible terminal.
- `packages/core/agent/src/index.ts`: the original Agent lookup's wire name is
  `agentId`, with the Session resource identity and original Agent resolver.
- `packages/api/terminal-controller/src/shells.ts`: discovery verifies executable
  paths with the real subprocess provider and omits only executable-not-found
  candidates; other errors propagate.

`scripts/dsh-terminal-carrier.mjs` adds only the exact `terminal/shells` RPC.
It validates the original client-request envelope, one bounded ordinary
`agentId`, JSON POST and 4 KiB request cap. Queries, encoded aliases, extra
arguments, other Terminal endpoints, untrusted Host/Origin/fetch-site metadata,
and arbitrary methods cannot acquire the owner cookie. The existing exact
public-origin trust policy is reused. Browser Cookie/Authorization are dropped,
configured server-side credentials go only to the configured loopback Host,
redirects fail, Set-Cookie is dropped, and original status/body/error are retained.
No generic RPC, proxy, stream, uplink or replacement service is added.

Original Gateway admission, Remote permission checks, Agent resolution,
execution-provider selection and instance ownership remain authoritative.
React, Cordis, Loader, Slot, singleton identities, Remote and SessionManager are
unchanged. All fixture commands/state are limited to this workspace's scratch.
The local HTTP **MODEL MOCK** is only fixture turn preparation; shell discovery
uses the actual original Host and subprocess provider, with no API key required.

## Parent integration handoff

Shared startup, bootstrap and local entry files are deliberately untouched for
the ticket 42 worker. No session-carrier extension is required.

The parent has since applied the server wiring below. The retained demo process
requires an update/restart; this isolated browser proof does not claim it already
runs the new handler.

In `scripts/dsh-startup.mjs`, after obtaining the original `ownerCookie` and
`publicOrigins`, instantiate only when `bootEnabled`:

```js
const terminalReadCarrier = bootEnabled
  ? (await import('./dsh-terminal-carrier.mjs')).createTerminalReadCarrier({
    origin: process.env.DSH_ORIGIN, cookie: ownerCookie, publicOrigins,
  }) : undefined
```

In the HTTP handler, before `inventoryRpcCarrier` (which denies other `/api/`
endpoints), dispatch:

```js
if (terminalReadCarrier && await terminalReadCarrier(request, response)) return
```

No browser bootstrap, graph allowlist, UI, Remote hook or socket change is
needed. The isolated preparation script rehearses exactly this server seam by
writing its own startup copy in scratch and fails if expected seams change.
The parent must integrate the seam; this commit does not claim retained-demo
or production wiring. The guide action works independently of the lazy chunk.

## Reproduction and checks

Run from this workspace root with port 4185 free. All pnpm invocations inherit
workspace-local XDG cache/data/state, PNPM_HOME, npm cache and store settings
from the helper, including initial provisioning. Only Nix/pnpm provision tools.

```bash
set -euo pipefail
umask 077
source scripts/dsh-test-env.sh
bash scripts/dsh-test-prepare.sh all
export DSH_HOME="$PWD/.scratch/terminal-live/home"
export DSH_AGENTS_HOME="$PWD/.scratch/terminal-live/agents"
export NARB_NATIVE_CACHE_DIR="$PWD/.scratch/terminal-live/native-cache"
export DSH_CLIENT_BIND=0.0.0.0
export DSH_CLIENT_PUBLIC_ORIGIN=http://100.97.207.47:4185
node --test scripts/test/dsh-terminal-carrier.test.mjs scripts/test/dsh-carrier-trust.test.mjs
node scripts/dsh-terminal-live-prepare.mjs
pnpm --config.manage-package-manager-versions=false --config.auto-install-peers=false \
  dlx --package=node-linux-x64@24.21.0 node \
  .scratch/status-live/anchor/terminal-host.mjs \
  > .scratch/terminal-live/runtime.log 2>&1
bash scripts/dsh-upstream.sh verify
git diff --check
```

Executed acquisition, frozen install and the unchanged artifact build: all
**8 gates passed in 104.47 seconds**. Focused capability/trust tests: **4 passed**,
including exact public origin, cookie custody, extra-field/method/endpoint
denials, and preservation of original `ok:false` and HTTP 403 refusals.
Final browser/Host run exited 0. Upstream verification and whitespace check passed.

T3 preview was attempted first. After correcting its rejected `about:blank`
URL to the requested HTTP client URL, it explicitly failed with
`This host is missing libraries T3's browser needs` (libglib/libnss3 and others).
The documented Nix Chromium/CDP fallback performed the live browser check.

The first repeat run correctly exited 1 because its saved Session had no active
Host Agent yet. The isolated harness now restores its own saved Session through
the original mock-model prompt path before checking discovery; the next run
passed with settled history. Unexpected carrier exit also exits 1. No original
backend lookup or failure result was overridden to make the test pass.

Terminal creation/input/output, non-owner grants, external instances, arbitrary
shell execution, and a production credential store are outside this proof.
Unsupported actions keep their original visible failure behavior.

# Issue 35: original UI lists and opens a real Host session

Validated 2026-11-10 on parent `c027a65`, using an independently acquired,
frozen-installed and rebuilt `fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159`.
All eight original artifact gates passed in 103.23 seconds. Upstream tracked
sources remain pristine. No remote Git, issue, PR or deployment operations.

## Actual browser result

The unchanged official React entry mounted original `uiRenderer`/`defaultUI`
after original Loader activation, with the actual 74-entry graph in `live` mode.
The original sidebar displayed **Issue 35 real Host session** under **Issue 35
workspace**. Clicking that existing row opened the original session view, changed
the document title, displayed **Connected**, and rendered **Issue 35 read-only
history fixture** from the real Host journal. The runner requires that history
text and rejects a remaining loading/reconnecting state. It also requires a real
HTTP 200 for `session/list` and the original `session/follow` socket request.
This is a combined browser/Host result, not the earlier standalone Node proof.

The test creates a uniquely named Session through `ctx.sessions.create`, appends
local fixture events through the original Session, renames through
`ctx.sessionTitle.rename`, and attaches through the original Workspace entity.
All state lives under this workspace's ignored scratch, including DSH home,
agent home and the fixture workspace. No external user sessions are modified.
No second SessionManager, replacement Remote, fake Peer, module identity change,
Cordis/Slot change, or `ownsHost` override is introduced.

Private evidence: `.scratch/dsh-startup/sessions-live-result.json`,
`sessions-sidebar.json`, `sessions-open.json`, `sessions-network.json`,
`sessions-live-dom.html`, and `sessions-open.png` (visually inspected).
Runtime logs and cookie remain private ignored files; do not publish them.
The runner terminates its owned carrier and Chromium normally and invokes
original Host shutdown in `finally`.

T3 `preview_status` reported unavailable; `preview_open` failed with
`This host is missing libraries T3's browser needs` (including libglib/libnss3).
The documented Nix Chromium fallback supplied the real browser execution.

## Explicit capabilities

`scripts/dsh-session-carrier.mjs` connects the browser's original default
WebSocket implementation to the original authenticated Host socket, using the
original Gateway `ws` dependency. The page uses its original Connection,
Gateway mux framing, generated Remote, recovery, and SessionManager. The server
attaches the configured private owner cookie and the configured Host Origin;
no credentials enter browser globals. The Host's original admission and
permissions remain authoritative. The local listener binds only 127.0.0.1.

Only these capabilities attach that credential:

- POST `/api/session/list`: original envelope, empty `args._request` only.
- POST `/api/session/projections`: original envelope, one bounded `request.sessionId`.
- WebSocket `/api/remote.mux`: exact same-origin browser upgrade, original `open`
  and `cancel` frames, maximum 16 active streams. Allowed openings are `$events`,
  `remoteAccess/follow`, `workspace/follow`, `session/control` with empty args,
  and `session/follow` with one ordinary Session address and bounded history
  window fields. The original follow request includes `activate:true`; this
  permits the Host's original opening-time background activation, not prompt
  submission. Subagent addresses and uplink items are denied.

The permission and workspace snapshot streams are necessary for the original
sidebar and session lifecycle. Closing a denied socket visibly fails the
original client; it never fabricates an empty baseline. Text/binary framing is
preserved, including queued text frames during authenticated upstream upgrade.
Terminal Host frames release active-stream accounting. No arbitrary path,
endpoint or RPC proxy is exposed. Request bounds, exact envelope fields,
Host/Origin/Fetch metadata checks, redirect rejection and no-store responses
remain enforced. Browser Cookie/Authorization and upstream Set-Cookie are not
forwarded. Existing inventory RPC remains separately scoped.

Two exact content-revision image references are shared by the browser resolver
and server allowlist in `entries/dsh-startup/session-assets.js`:

- `plugins/@deepseek-ai/dsh-client-ui-chat/assets/running-whale%402x-06738fa29b2f.png`:
  evaluated by the required original chat factory; blocking it prevented UI activation.
- `plugins/@deepseek-ai/dsh-client-ui-brand-official/assets/breach-atlas-43c5305a3d4d.webp`:
  evaluated by the original brand factory used by the mounted UI.

All other package assets remain denied. These are exact GET references, not a
resource proxy; queries and aliases do not acquire credentials.

## Reproduce

First follow [the artifact build](dsh-artifact-build.md) in this workspace.
Then run from its root, stopping on failure:

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
nix shell nixpkgs#chromium -c chromium --version
node --test scripts/test/dsh-{bootstrap-carrier,rpc-carrier,events-transport,session-carrier}.test.mjs packages/dsh-host-status/test/status.test.js
node scripts/dsh-sessions-live-prepare.mjs
pnpm --config.auto-install-peers=false dlx --package=node-linux-x64@24.21.0 \
  node .scratch/status-live/anchor/sessions-smoke.mjs \
  > .scratch/status-live/sessions-runtime.log 2>&1
bash scripts/dsh-upstream.sh verify
git diff --check
```

Port 4178 must be free. The pnpm-provided Node is required by the previously
documented native Host preparation limitation; Nix Node builds the artifacts.
The focused checks passed (16 tests after the session HTTP case was added).
They cover capability rejection, original-shaped forwarding, cookie custody,
upgrade Origin fencing, text framing, and write-frame denial. Browser smoke
exited 0, followed by pinned-source verification and whitespace checks.

## Limits

Send/reply (issue 36), new-session creation, older-history pagination, subagents,
external Hosts, non-owner grants, and production credential custody are not
implemented or validated. Original UI controls for unsupported actions remain
present and fail through the original error paths. Initial model, credentials,
settings, plugin inspection and provider reads remain 403; they are unnecessary
for this list/open proof. The optional account UI factory still fails on its
undeclared onboarding assets. No general asset repair or font work was added.
Browser reconnect behavior beyond the successful connected opening is not
claimed; issue 34 separately proved original Node recovery.

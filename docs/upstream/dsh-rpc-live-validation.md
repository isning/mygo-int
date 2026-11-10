# Issue 33: original generated Remote read over a narrow carrier

Validated 2026-11-10 in this worktree on baseline `2875306`, with unmodified
upstream `fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159`. Fresh frozen install and
all eight original artifact gates passed (117.64 seconds). No remote changes.

## Implemented boundary

`scripts/dsh-rpc-carrier.mjs` exports `createInventoryRpcCarrier({origin,cookie})`.
This is an explicit loopback owner credential capability, like the bootstrap
carrier, restricted to **POST `/api/pluginInventory/list`** and the exact original
Connection envelope with `{args:{}}`. It is not a general RPC proxy. It rejects
other endpoints, query/encoded aliases, extra envelope fields, nonempty arguments,
wrong methods, non-JSON bodies and bodies over 4096 bytes before forwarding.
Host, Origin and Fetch metadata checks match the existing local carrier fence.
The only upstream destination is a configured `http://127.0.0.1:port` origin;
redirects fail. Browser Cookie/Authorization headers are never forwarded.
Only the explicitly supplied private cookie reaches the Host. No cookies or
CORS grants are returned. Responses are no-store.

Original Host Connection admission and Gateway dispatch remain authoritative.
The carrier preserves the original RPC response bytes, content type, status and
error envelope. Local failures carry `rpc-carrier/*` diagnostic codes and HTTP
status; the original Connection/Gateway client translates transport failures
through its existing error behavior. There is one fetch, no retry/offline policy,
no new business API, no events or writes.

The Node harness uses the original `Context`, Typert registry Client face,
`installConnection`, Gateway Client face and generated
`@deepseek-ai/dsh-host-plugin-inventory/remote` contribution. It mounts that
contribution with `client.remote.$mount(contribution)` and calls
`client.remote.pluginInventory.list()`. Gateway performs generated argument/result
handling; original `createWebConnectionRpc` owns envelope construction, request
correlation and response parsing. Only its physical fetch is adapted. There is
no replacement Proxy, descriptor, RPC codec, Host service or singleton.

## Reproduce

First complete [the pinned artifact build](dsh-artifact-build.md) in this
workspace. Run from the repository root in Bash, stopping on failure:

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
node --test scripts/test/dsh-rpc-carrier.test.mjs
node scripts/dsh-rpc-live-prepare.mjs
pnpm --config.auto-install-peers=false dlx --package=node-linux-x64@24.21.0 \
  node .scratch/status-live/anchor/rpc-smoke.mjs \
  > .scratch/status-live/rpc-runtime.log 2>&1
bash scripts/dsh-upstream.sh verify
git diff --check
```

The own helper reuses the existing status preparation helper without modifying it.
It builds an ignored installation anchor and launches the original `runProfile`
web composition with its real Loader and adapter overlay. All pnpm state is local.
The pnpm-provided Node runtime is required by the known native preparation caveat
in [the status handoff](dsh-status-live-validation.md). Logs can contain the
synthetic launch token: keep `.scratch` private and ignored. No credentials are
printed or written to tracked files. The harness holds cookies in memory.

## Actual verification

The live harness exited 0. Original root token exchange returned 303. The generated
`remote.pluginInventory.list()` returned `ok:true` and **204 real non-group Host
Loader entries**, including `@mygo/dsh-host-status`. The returned module-name list
matched the real `ctx.loader.entries()` order exactly. This count is the Host
inventory, not the 74-entry client bootstrap graph.

A direct missing-auth call to the original endpoint returned 401. A second generated
Remote client using a carrier with an invalid cookie returned `ok:false`, original
code **`gateway/internal`**, with message
`client api: pluginInventory/list failed: transport failure for /api/pluginInventory/list: HTTP 401`.
No success value was fabricated. Carrier rejection checks also passed live for
foreign Origin, a different endpoint, and an envelope-method mismatch.

Both client contexts used a non-loopback target location and omitted `ownsHost`;
the harness asserted `client.connection.isLoopback === false`. This keeps the
ordinary target from acquiring Host ownership merely through the local carrier.
`interactions:'none'` and an explicitly unavailable stream hook prevent opening
any event/lifecycle socket; no stream call is part of the proof.

Two focused Node tests passed. They check rejection before any upstream request,
size/content/method restrictions, construction restrictions, exact request forwarding,
credential isolation and unchanged original-shaped error envelope. Their fake upstream
is distinct from the real Host evidence above. Syntax and whitespace checks passed;
post-run upstream verification confirmed pristine tracked sources at the pin.
The harness disposes Client fibers, closes both owned local servers normally and
calls original Host shutdown in `finally`.

## Exact integration handoff to parent / issue 32

No shared `bootstrap.js`, `dsh-startup.mjs`, `dsh-bootstrap-carrier.mjs`, or shared
live preparation helper was edited. Parent can wire the new module after issue 32:

1. Import `createInventoryRpcCarrier` in the existing local server. Construct it
   once with the same explicitly authorized loopback `origin` and private `cookie`
   used by the bootstrap carrier. Never derive either from a request or graph row.
2. In the existing request dispatcher, call
   `if (await inventoryRpcCarrier(request, response)) return` before static fallback.
   Unhandled paths must still end in the existing denial/404; do not add generic
   `/api`, URL, proxy or credential forwarding. This handler owns `/api/` rejection.
3. Keep original browser Connection/Gateway/generated Remote activation and same-origin
   document-relative fetch. The existing caller posts `api/pluginInventory/list`;
   no new browser RPC implementation is needed. Preserve ordinary-target ownership
   classification; do not set `ownsHost` on account of this local capability.
4. Once those original client plugins activate, invoke
   `ctx.remote.pluginInventory.list()` and use its existing `{ok,value/error}` result.
   For independent validation before bundle wiring, run the concrete harness above.

Limits: this proves one generated unary Remote read against a real loopback Host.
It does not prove the browser/UI bundle activation, browser cookie custody,
external Hosts, non-owner/API Peer permissions, all Remote methods, cancellation,
resource transfer, events (issue 34), or reconnect behavior. UI integration remains
an explicit parent wiring step; the standalone live read does not depend on issue 32.

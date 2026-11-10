# DSH Host status plugin

Issues [29](https://github.com/isning/mygo-int/issues/29) and
[30](https://github.com/isning/mygo-int/issues/30). Provisional package
name: `@mygo/dsh-host-status`; no registry publication or namespace ownership is
implied. This is a Host-only Cordis function plugin with no client entry or build
step. It has no runtime imports and uses the Host's injected services. The peer
dependencies document the tested source baseline, not a promise about other
versions or registry availability.

## Contract

`GET /mygo/status` is an **exact pathname** route registered through
`ctx.effect(() => ctx.webServer.register(...))`. Query strings do not change
pathname matching; trailing slashes and descendants do not match this route.
Other Host routes/fallbacks retain their existing behavior for unmatched paths.
Unloading the plugin or losing an injected service releases its registration
through the existing Cordis lifecycle. Duplicate registrations retain the
webserver's existing error behavior.

Every matching request first calls `ctx.connection.admit(req)` on the original
Node request, preserving Host, Origin, Sec-Fetch and authentication fences.
Admission rejection returns its original 401/403 with an empty body. An admitted
Peer must also have `principal.kind === 'owner'`; other Peers get 403. This
deliberately narrow authorization matches Connection's original exact Fetch-route
restriction. Broader Peer support needs a separate access audit. No credential
issuance, browser Peer fabrication, index authorization, CORS relaxation or new
authentication mechanism is added. A launch token in a URL is not exchanged by
this endpoint; use the existing Host login/connection flow first.

After admission and authorization, methods other than GET return empty 405 with
`Allow: GET` (including HEAD and OPTIONS). Successful GET returns 200,
`Content-Type: application/json; charset=utf-8` and this schema:

```json
{
  "schemaVersion": 1,
  "status": "adapter-ready",
  "adapterVersion": "0.1.0",
  "release": { "version": "0.2.2-rc.1", "commit": "optional-build-commit" }
}
```

All responses produced by this handler use `Cache-Control: no-store`.
`adapter-ready` means this adapter's required services (`webServer`, `connection`,
`clientModules`) are active and its handler can read the graph; it is not a
general Host health assertion. `release` selects only version and optional commit
from `ctx.clientModules.graph().release`. It is null when the public graph has no
release, and omits commit when none was recorded. Release metadata is **not
durable instance identity**, a capability inventory or an authentication view.
The status response exports no graph, bootstrap, private config, credentials or
peer data. The separate injection endpoint below intentionally exports the
original owner bootstrap contributions.

## Ordered index injections

`GET /mygo/index-injections` is a second exact pathname route with the same
admission, owner-only authorization, method, cache and lifecycle rules. It returns
`Content-Type: application/json; charset=utf-8` and:

```json
{ "schemaVersion": 1, "injections": [] }
```

`injections` is the **entire** result of one synchronous call to
`ctx.webServer.collectIndexInjections(admission.peer)` per successful request.
The exact admitted Peer is passed through, retaining the current permission
context. No browser Peer, index authorization or substitute Peer is used. The
original `webserver/index-inject` listeners collect fresh state on every request;
the adapter neither filters to `__DSH_BOOT__` nor sorts, deduplicates, renders or
executes the rows. Listener table order (including theme's prepend behavior),
duplicates, placements, text and URLs are preserved. All six pinned upstream row
kinds are carried: `global`, `script`, `script-src`, `script-preload`, `style`,
and `html`. `IndexInjectionsResponse` reuses upstream's `IndexInjection` type.
The status endpoint and its response remain unchanged.

The pinned upstream contract describes rows as JSON-serializable data, although
`global.value` is typed `unknown`. Before JSON encoding, the adapter checks for
plain JSON data without invoking property accessors or `toJSON` hooks. Non-finite
numbers, negative zero, undefined, functions, symbols, bigint, sparse arrays,
cycles, accessors and non-plain objects fail closed with empty **500** and
`Cache-Control: no-store`; collection failures also return empty 500. No partial
or silently coerced table is returned. Shared acyclic values are supported.
Contributor scripts and globals remain data; this endpoint never evaluates them.
This is a pinned data contract, not a cross-version parser or sanitizer of trusted
owner-supplied executable contributions.

This table is **not the complete served HTML**. The original
`webServer.renderIndex` renders rows and then applies raw `tapIndex` string
transforms; those arbitrary transformations are not collector rows and are not
exported. The pinned non-test source currently registers no raw taps outside the
webserver API itself, but installed extensions may do so. The generated
`__DSH_BOOT_READY__` readiness tail belongs to `renderIndexInjections`, not the
collector. Frontend-static's original base document (entry module, styles, root
markup and other assets), fallback/page handling and HTML transforms are likewise
not rows. This endpoint does not parse HTML to reconstruct those contributions,
resolve relative resource URLs for another origin, apply rows in a client, or
implement independent-client boot (issue 31).

## Local checks and later installation

From this repository root (no dependency install required for tests):

```bash
node --test packages/dsh-host-status/test/status.test.js
mkdir -p .scratch/status-package
# Keep package-manager state within this worktree, including with pnpm 12.
export XDG_CACHE_HOME="$PWD/.scratch/status-package/cache"
export XDG_DATA_HOME="$PWD/.scratch/status-package/data"
export XDG_STATE_HOME="$PWD/.scratch/status-package/state"
export PNPM_HOME="$PWD/.scratch/status-package/pnpm"
export npm_config_cache="$PWD/.scratch/status-package/npm-cache"
export npm_config_store_dir="$PWD/.scratch/status-package/pnpm-store"
pnpm --config.auto-install-peers=false --dir packages/dsh-host-status pack --pack-destination ../../.scratch/status-package
```

For a separately authorized installation later, add the resulting
`mygo-dsh-host-status-0.1.0.tgz` to the **existing DSH runtime's package install
anchor**, using its package manager (for example `pnpm add /absolute/path/to/the.tgz`
from that anchor). Keep the pinned Host's existing peer packages; do not install a
second Host or replace its core. Then run that Host's normal Web composition with
`dsh web --patch /absolute/path/to/host.patch.yml`, using the included overlay or
the equivalent insert row in its existing configuration. The Loader must resolve
this package from that runtime. The three services must already be provided by
the Host composition. No issue 27 artifacts are needed to author or pack this
package; launching a real Host still needs its normal build/runtime prerequisites.

For live acceptance on another authorized pinned Host: authenticate through
its normal flow, GET the route with that access context and verify 200/schema;
verify missing credentials yield 401 and rejected origin/host yields 403; unload
the plugin and confirm the adapter route is gone. Use existing secure credential
handling; do not paste credentials into scripts or commit them. The initial
implementation did not start a Host; the later local validation round is recorded
below.

## Evidence and limits

Source baseline: deepseek-ai/deepseek-harness
`fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159` (package release `0.2.2-rc.1`).
Public signatures and examples inspected in:

- `packages/host/webserver/src/index.ts`: exact route, Node handler and disposer.
- `packages/host/open-in-app/src/index.ts`: function-plugin injection/effect pattern.
- `packages/client/connection/src/rpc-host.ts`: `admit` and owner-only exact Fetch routes.
- `packages/client/modules/src/index.ts` and `src/client/manifest.ts`: graph/release.

The Node built-in tests issue real loopback HTTP requests to the exported plugin's
handler, with small doubles for admission, routing and Cordis effects. They cover
success, denied admission, admitted non-owner denial, method/path restriction,
release projection and registration disposal. They do **not** prove live Host
authentication, its fences, Loader resolution or actual Cordis dependency teardown.
A fresh local round subsequently passed against the real pinned Host, Loader,
Connection and Cordis, including declaration typechecking. See the
[live-validation handoff](../../docs/upstream/dsh-status-live-validation.md) for
reproduction, actual statuses, lifecycle evidence and the Node runtime caveat.
No upstream implementation was copied.

Full authentication, proxy/gateway and UI consumption remain outside this
package. Neither route alone boots an independent client. See the
[issue 30 validation handoff](../../docs/upstream/dsh-injections-live-validation.md)
for the ordered export evidence and reproduction.

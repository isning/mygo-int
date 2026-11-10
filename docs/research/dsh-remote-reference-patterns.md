# Existing DSH remote projects: reference patterns

Read-only source comparison, 2026-11-10. No builds, tests, installs or runtime
experiments. Repository heads were pinned during this review; they target different
DSH releases and are not evidence of compatibility with our fixed DSH baseline.

## Scope and identification

`dsh-remote` is ambiguous. These are separate projects, not interchangeable names
for one implementation. The SSH workspace/tool project `flymysql/dsh-remote` was
excluded from this client-delivery comparison after repository discovery.

## 1. Official page carried through an HTTP/WebSocket bridge

[mrRisega/dsh-remote](https://github.com/mrRisega/dsh-remote/tree/764dc07b479136c72bc47f2ee0703956d43b4dd4)
was reviewed at `764dc07b479136c72bc47f2ee0703956d43b4dd4`.

Its [bridge implementation](https://github.com/mrRisega/dsh-remote/blob/764dc07b479136c72bc47f2ee0703956d43b4dd4/clients/dsh-remote/dsh-bridge.mjs)
forwards HTTP and WebSocket traffic to DSH Web. `doHttp` supplies an authority-specific
upstream cookie and handles a recognized upstream authentication failure. HTML
responses may receive mobile, diagnostic and encryption shims; SSE uses a separate
chunk/end path rather than buffering the entire response. The reviewed implementation
contains both page forwarding and adaptation; it is not merely an RPC endpoint.

Implication: preserve the existing browser runtime for legacy plugins, and account
for streaming, response encodings and credential renewal independently. This source
does not establish independent client startup or simultaneous isolated plugin trees.
The broader encryption protocol was not audited and is not adopted by this review.

## 2. In-process Host authentication and browser contributions

[xgone/dsh-remote](https://github.com/xgone/dsh-remote/tree/dd551970c3ebda18fa48cdacbf7dc8c8056583f4)
was reviewed at `dd551970c3ebda18fa48cdacbf7dc8c8056583f4`.

Its [package declaration](https://github.com/xgone/dsh-remote/blob/dd551970c3ebda18fa48cdacbf7dc8c8056583f4/package.json)
exports Host and client halves, with the existing `dsh.client` web declaration.
Its [Host implementation](https://github.com/xgone/dsh-remote/blob/dd551970c3ebda18fa48cdacbf7dc8c8056583f4/lib/index.js)
wraps HTTP and upgrade handlers, checks its own session, and supplies/repairs DSH's
separate authority-bound authentication cookie. Resource-handler wrapping explicitly
accounts for requests already carrying an admitted Peer. It also handles remote file
presentation and browser-specific adaptation paths.

Implication: gateway login and DSH admission are separate contracts. Preserve the
Host's Peer/access context rather than treating an adapter login as universal Host
privilege. This is an example of a split plugin using existing declarations, not a
reason to introduce another client SDK. Its private Host/auth coupling must be
version-audited before reuse.

## 3. Transparent gateway plus ordinary Cordis client plugin

[summer1238/dsh-remote-web-gateway](https://github.com/summer1238/dsh-remote-web-gateway/tree/5b2db966a6efec024bd7dd19a152691311ebb124)
was reviewed at `5b2db966a6efec024bd7dd19a152691311ebb124`.

The [gateway source](https://github.com/summer1238/dsh-remote-web-gateway/blob/5b2db966a6efec024bd7dd19a152691311ebb124/src/gateway.ts)
creates an HTTP/WebSocket proxy, normalizes upstream Host/Origin and filters headers,
and applies public request policy. Its management-path exclusions and device-session
checks are distinct from transport. The [architecture document](https://github.com/summer1238/dsh-remote-web-gateway/blob/5b2db966a6efec024bd7dd19a152691311ebb124/docs/ARCHITECTURE.md)
describes tunnel carriage separately from pairing and authentication.

Its [package declaration](https://github.com/summer1238/dsh-remote-web-gateway/blob/5b2db966a6efec024bd7dd19a152691311ebb124/plugin/package.json)
uses the original `dsh.client` dependency declarations. The
[client half](https://github.com/summer1238/dsh-remote-web-gateway/blob/5b2db966a6efec024bd7dd19a152691311ebb124/plugin/src/client/index.ts)
uses Cordis service injection, `ctx.effect`, React Slot contributions, locale and
connection services. The [Host half](https://github.com/summer1238/dsh-remote-web-gateway/blob/5b2db966a6efec024bd7dd19a152691311ebb124/plugin/src/index.ts)
owns runtime lifecycle and management RPC registration.

Implication: one package can retain the native DSH Host/client structure while its
remote-access transport is replaceable infrastructure. This is a useful real-world
fixture for split-plugin lifecycle, settings and assets. Its documented DSH baseline
is older than ours; documented test/device results belong to that project and were
not reproduced here.

## 4. Android browser carrier

[hongshuxifan321/dsh-mobile-app](https://github.com/hongshuxifan321/dsh-mobile-app/tree/5977159811e254999749ac1fb6ca74d9deab0230)
was reviewed at `5977159811e254999749ac1fb6ca74d9deab0230`.

[MainActivity](https://github.com/hongshuxifan321/dsh-mobile-app/blob/5977159811e254999749ac1fb6ca74d9deab0230/app/src/main/java/com/dshmobile/app/MainActivity.java)
enables JavaScript/DOM storage, loads a remote URL and handles HTTP authentication
through WebView. The [proxy](https://github.com/hongshuxifan321/dsh-mobile-app/blob/5977159811e254999749ac1fb6ca74d9deab0230/server/plugin/lib/proxy.js)
adds viewport/mobile styles and bootstraps a same-origin WebSocket authentication
cookie separately from HTTP Basic authentication.

Implication: a native carrier can preserve official Web UI, but that alone does not
provide mygo's local Cordis composition, native semantic rendering or offline tree.
The repository also contains an isLoopback patch helper; this review does not treat
all deployment paths as core-modification-free or adopt such patches.

## Architectural conclusions for mygo (inferences, not runtime results)

- Separate reachability/tunnel, authentication/Peer, client bootstrap, resource origin,
  plugin graph ownership and application composition. A single connection URL cannot
  represent all of these contracts.
- Keep a compatible Web execution profile with the official React/Loader/Slot ABI.
  Remote page forwarding is a reference and possible compatibility mode; it is not
  proof that the extracted local client has booted independently.
- Permit a thin optional remote adapter for explicit bootstrap and resource carriage.
  Without it, declare exactly which served-page/version compatibility path applies.
  Do not silently replace an unsupported independent profile with a remote page.
- Inventory HTTP, WebSocket, SSE, upload/download, lazy plugin bundles and CSS assets;
  preserve cancellation, headers, status and streaming semantics as well as payloads.
- Prefer existing client plugin lifecycle and Slot contributions for adaptations;
  DOM patches may remain version-specific compatibility shims, not the public SDK.
- Do not copy a gateway's loopback normalization into client authority flags. A remote
  client does not gain `ownsHost`, and management reachability must remain explicit.
- These projects do not by themselves settle multi-instance module/React/CSS/storage
  isolation, independent local composition or a native rendering contract.

## Planned verification obligations

Later implementation should cover authenticated initial document/bootstrap, first
RPC and first WebSocket, cookie expiry/Host restart, lazy CSS and chunks, long-lived
streams and cancellation, upload/download, graph update/removal, and management
path access. This is a verification plan, not a report of tests run.

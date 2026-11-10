# Browser-authenticated DSH transport

This supersedes the anonymous scoped demo capabilities in the earlier startup,
RPC, session, terminal, upload, download and tailnet validation handoffs. Those
carriers and their tests remain historical fixtures; `dsh-startup.mjs` no longer
instantiates them. `DSH_COOKIE_FILE` now fails startup explicitly.

The active transport selects exactly one operator-configured loopback DSH origin.
It preserves the browser's exact admitted Host, Origin and fetch metadata. The
launcher supplies that public authority through DSH's original `--trusted-host`
option. Browser navigation to the private original `/?token=...` entry goes through
the proxy: DSH exchanges its launch token, returns its original 303 and signed,
authority-bound HttpOnly SameSite=Strict cookie, then the proxy serves the local
composition after DSH accepts the clean index request. `/connect` is transported
unchanged if an API operator uses it; it is not a non-owner login.

Only the browser's DSH cookie named for this exact authority is forwarded. There
is no fallback server cookie, authentication token generator, new Peer minting,
Origin rewrite, redirect following, user-supplied upstream URL or business-method
allowlist. HTTP envelopes and WebSocket bytes reach the original admission,
Gateway, Remote resource and principal checks unchanged. Requests have a general
300 MiB transport body limit; upstream owns its own body/frame limits. Original
ModuleSystem owns bundle/asset resolution, including lazy chunks. React, Cordis,
Loader, Slot, Remote and SessionManager remain original; the independent local
Workbench/Focus composition and entry ownership remain in place. `ownsHost` stays
false. This is one selected instance and one owner authentication view per served
composition; it does not claim concurrent multi-account sandboxing in one document.

## Owned environment and private entry

From this workspace only:

```bash
bash scripts/dsh-test-prepare.sh all
DSH_CLIENT_PORT=4190 DSH_CLIENT_BIND=0.0.0.0 \
DSH_CLIENT_PUBLIC_ORIGIN=http://100.97.207.47:4190 \
node scripts/dsh-test-host.mjs start
node scripts/dsh-test-host-network.mjs
node scripts/dsh-test-host.mjs check-submit
node scripts/dsh-test-host.mjs status
node scripts/dsh-test-host.mjs open
```

Retained clean URL: <http://100.97.207.47:4190/>. It intentionally returns 401
before login. The private authenticated presentation entry is in the ignored
`.scratch/test-dsh/client-launch-url` (0600), never in status output or this doc.
`open` reads that entry privately into an isolated Nix Chromium profile, with no
URL/token output. `check-auth` separately tests the original Host UI.

**4190 is a browser/Node fetch prohibited port (Sieve).** The owned Chromium
helper passes `--explicitly-allowed-ports=4190`. A user opening the entry in their
own Chromium must launch that browser with the same flag; ordinary navigation
without it fails with `ERR_UNSAFE_PORT` before HTTP authentication. Node lifecycle
and network probes use `node:http` for this port. A separate device's routing,
tailnet ACL and browser configuration have not been verified. HTTP over the
explicit tailnet origin provides no TLS/Secure-cookie claim.

Stop with `node scripts/dsh-test-host.mjs stop`; it verifies the exact owned runner
and uses SIGTERM. Restart with all three listener variables above. The private
launch entry is regenerated per Host process, while upstream's persisted signing
secret retains its original cookie behavior. To end browser access, close its
sockets/tabs and clear this origin's DSH cookie. Upstream supplies no logout API;
global revocation requires removing the upstream owner credential by its supported
operator workflow and restarting. Do not reuse credentials or homes for another
instance. The old 4189 environment is outside this workspace and is not managed.

## Permission scope and proof

The pinned source only admits owner browser sessions via launch token; `/connect`
also creates an owner operator, with its own socket lifecycle. Neither is a public
non-owner identity provider. The implementation does not invent one. A restricted
principal can be tested through the public in-process `createPeer` and shared Fetch
interfaces: original Gateway returns an HTTP 200 Remote envelope with
`remote-access/denied`; original exact routes refuse non-owner Peers with HTTP 403.
These are distinct checks, not a claim of restricted-browser login support.

Validation artifacts are private under `.scratch/test-dsh/`: network assertions,
permission assertions, original UI creation/prompt/receipt frames, durable message
correlation, settings/catalog reads and screenshots. `check-submit` now clicks the
original New session control, sends a fresh prompt through the original composer,
and verifies the deterministic **MODEL MOCK** reply. It does not seed assistant
history or call session/create from test JavaScript. All results are mock inference.

## Verified in this workspace (2026-11-10)

Fresh acquisition and frozen installation completed; the unmodified original
artifact runner passed all **8/8** gates (99.42s). All **34/34** focused local and
historical fixture tests passed. Source-pin verification, changed-script syntax
checks and `git diff --check` passed.

Actual Tailscale-address probes passed: anonymous HTTP and WebSocket 401;
authenticated HTTP 200 and WebSocket 101; mismatched/tampered authority cookies
401; Host/Origin/cross-site/missing socket Origin 403. Original `/connect` returned
302, and closing its operator socket revoked that operator's cookie without
revoking the separately authenticated browser. Restricted in-process Peer proof
returned original `remote-access/denied` (HTTP 200 envelope) and exact-route 403.
No restricted-browser authentication mechanism was added or claimed.

Real Nix Chromium exercised normal UI creation and prompt submission, original
receipt identity, one correlated durable user message, one durable assistant
message, three original streamed mock text chunks, 26-token usage, stop framing,
completed turn, one visible conversation reply and a cleared draft. The original
UI makes an initial blank `session/create` during startup; its New session control
makes one further call, reusing that blank according to original DSH semantics.
This is recorded separately from duplicate prompts or duplicate assistant replies.
Settings, model catalog, provider listing and plugin inventory returned 200.
Screenshots were inspected. Workbench and Focus retain the original outlet,
selected-instance/owner entry ownership, original session and Terminal lazy chunk;
local scope disposal leaves original remote entries and session UI intact.

Normal SIGTERM closed all three owned listeners. Restart retained the fixture
session and made zero startup model requests. The final Workbench environment is
retained on `0.0.0.0:4190` with the public origin stated above. Preview automation
was attempted first and returned missing host libraries; the repository's Nix
Chromium/CDP workflow supplied the browser proof instead.

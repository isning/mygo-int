# Single-root DSH startup

The default launcher and adapted build use one MYGO Context and the original
Loader, React renderer, navigation, Settings and unified Plugins page. Run the
owned authenticated Host with `scripts/dsh-test-host.mjs`; see
[default acceptance and demo](../../docs/upstream/dsh-default-client.md).
No composition opt-in or `DSH_ORIGIN` is required. mygo starts with its local
Cordis composition and an empty instance catalog. Each DSH Host is registered
through `/mygo-local/connection`, and only its explicit instance route loads the
remote client graph. Original Host authentication remains in charge; startup
failure stays on the local shell with an explicit diagnostic.

The product build has one startup path. Historical two-root fixtures remain only
as archived regression evidence and are not selectable by the launcher.

The following records describe the earlier diagnostic modes.

The diagnostic mode of this mygo-owned document loads the **unchanged original Web entry bundle** from
DSH `fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159`. That entry constructs the real
`AppWebEntry`, which renders its real `BootPage`. No Host-generated application
HTML or replacement UI is supplied. The optional issue 31 mode acquires the real
ordered injection table through a narrow loopback carrier; see below.

First acquire and build artifacts in this worktree using the exact commands in
[the artifact handoff](../../docs/upstream/dsh-artifact-build.md). Keep the full
ignored checkout and dependency/build products. Documentation commits alone do
not supply these files. Node 24.9+ with TypeScript stripping is required.

From the mygo root:

```bash
node scripts/dsh-startup.mjs build
node scripts/dsh-startup.mjs serve
# Open http://127.0.0.1:4178
# Optional: PORT=4180 node scripts/dsh-startup.mjs serve
```

`serve` rebuilds the small document first; stop with Ctrl-C. `build` writes only
`.scratch/dsh-startup/index.html`. The server mounts the original `dist/assets`
at `/assets` without copying or rebuilding them; the generated document alone
is not a portable deployment. It binds only to loopback and exposes no upstream
source, dependency directories or Host APIs. No package install is needed for
this entry itself.

Before either command, the source verifier checks the pinned revision and pristine
tracked sources, and upstream's `readClientBuildRecord` verifies its artifact
closure. The script imports the original entry/CSS/preload asset tags from the
built index into mygo's own template. All compiled bytes and module IDs remain
unchanged: no second bundler, React/Cordis copy, Loader implementation, session
manager or custom `BootSeams` is introduced. The upstream Vite serve guard stays
unchanged; this explicitly diagnostic static carrier does not invoke Vite serve.

Without bootstrap the expected official report is:

```text
HARNESS
Failed to load plugins
web boot: window.__ModuleLoader__ bootstrap facade is missing
```

This remains the default issue 28 diagnostic mode. Issue 31 mode below supplies
real bootstrap; application bundles, RPC and event transport remain later tickets.
These historical issue 28/31 results do not establish a connected session.
The current authenticated mode additionally supports the scoped issue 35
list/open flow documented below.
Authenticated startup uses the one local Cordis composition and the original DSH
Loader. Instance routes supply remote client entries to that same runtime. Its
entry bundle is rebuilt; official Web libraries, framework identities and remote
bundles are reused.

For distribution, retain upstream LICENSE/THIRD_PARTY_NOTICES and selected asset
licenses (including `assets/fonts/Montserrat-OFL.txt`) and inspect the selected
closure as described in the handoff. This local entry does not perform packaging
or assert complete dependency-license clearance.

## Verification (2026-11-10)

Consumer rebuild in this worktree passed the original 8/8 artifact gates in
102.82 seconds (Node 24.21.0, pnpm 11.28.5, Clang 21.1.8), followed by source
and build-record verification. `build` and `serve` both passed. HTTP checks
confirmed the four entry/vendor JS/CSS assets are byte-identical to upstream,
unknown/source paths return 404 and POST returns 405. Node syntax and Git
whitespace checks passed.

T3 preview could not open because its host browser libraries were missing.
A real Nix Chromium 155 headless run against the loopback server succeeded:
the rendered DOM contained the exact report above, and its screenshot was
visually inspected. Local evidence stays ignored at
`.scratch/dsh-startup/browser-dom.html`, `startup.png` and `browser.log`.
This is browser evidence of the official missing-bootstrap path only; no
connected session, authentication or plugin activation was exercised.

Reproduce the browser check after starting the server (Nix may download Chromium):

```bash
mkdir -p .scratch/dsh-startup/browser
XDG_CACHE_HOME="$PWD/.scratch/browser-cache" nix shell nixpkgs#chromium -c chromium \
  --headless --disable-gpu --no-first-run --no-default-browser-check \
  --user-data-dir="$PWD/.scratch/dsh-startup/browser" \
  --virtual-time-budget=5000 --dump-dom \
  --screenshot="$PWD/.scratch/dsh-startup/startup.png" --window-size=1280,900 \
  http://127.0.0.1:4178 \
  > .scratch/dsh-startup/browser-dom.html 2> .scratch/dsh-startup/browser.log
```

## Apply real injections (issue 31)

Use [the live boot handoff](../../docs/upstream/dsh-startup-live-validation.md)
for the complete real Host/browser reproduction. For an already authenticated local
Host, start this carrier with an owner cookie obtained by the original login flow:

```bash
DSH_ORIGIN=http://127.0.0.1:HOST_PORT \
DSH_COOKIE_FILE="$PWD/.scratch/dsh-startup/owner-cookie" \
node scripts/dsh-startup.mjs serve
```

The file is an explicit owner capability, never a tracked configuration value.
Keep it private (mode 0600); the live preparer writes it without printing it.
By default the carrier accepts only its HTTP 127.0.0.1 browser origin. The
[local test environment](../../docs/upstream/dsh-local-test-environment.md#explicit-tailnet-presentation)
can explicitly admit one public presentation origin with exact Host/Origin checks.
The upstream Host remains loopback. The carrier forwards no browser
credentials, follows no redirects and emits no CORS grants. It rejects mismatched
Host/Origin and cross-site Fetch metadata before attaching its owner cookie.
The bootstrap handler admits exact GET `/mygo/index-injections` and exact
graph-declared bootstrap/application combo URLs. Separate, explicitly scoped
handlers carry inventory and session reads, selected socket streams and two
pinned package images; see the current capability list below. Arbitrary
`/plugins` paths and undeclared API endpoints remain denied.
This is a local development bootstrap capability, not a production gateway or
an external Host authentication solution.

Before the unchanged official entry executes, the document installs the original
`Promise.withResolvers()` readiness shape. `bootstrap.js` fetches the table and
calls the original public `@deepseek-ai/dsh-client-web/injections` compiled export,
served byte-for-byte at `/mygo-boot/apply-injections.js`. Rows remain unchanged
and in order; blocking scripts are awaited through normal DOM script elements.
The carrier only admits the pinned document-relative bootstrap URL form.
Readiness resolves after the last row, or rejects on acquisition/application
failure into the original `AppWebEntry` BootPage. Module-loader creation, graph
parsing, static React/Cordis seeds and plugin activation remain upstream-owned.
No custom BootSeams, Session/client framework, raw HTML tap replay, fake graph
or duplicate framework bundle is introduced.

A successful issue 31 run reaches the original live module loader with the actual
Host graph, then displays the original activation diagnostic while application
bundles remain unavailable. Issue 32 owns their graph/resource carriage; issues
33 and 34 own RPC and event transport.

The current server also mounts the exact inventory RPC capability from
`scripts/dsh-rpc-carrier.mjs`, using the same explicit private Host credential.
The original empty `pluginInventory/list` call remains separately scoped. Its
generated-client proof is in `docs/upstream/dsh-rpc-live-validation.md`.

## Original session list/open (issue 35)

The current authenticated mode mounts the original UI and supports listing and
opening an existing ordinary session. See [the browser validation and exact
capability list](../../docs/upstream/dsh-sessions-live-validation.md) for
reproduction, credential custody, allowed Remote/socket endpoints and the two
exact image references. This combined browser proof uses the original
SessionManager and a real Host fixture entirely in ignored local scratch.
Send/reply, creation, pagination and other UI actions remain unsupported;
the original controls may surface denied-call errors.

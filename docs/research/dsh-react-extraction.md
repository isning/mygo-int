# DSH React client extraction: source-derived seams

Status: research input, not an accepted architecture decision. 2026-11-10.
Source baseline: `deepseek-ai/deepseek-harness@fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159`.
No dependencies were installed, builds executed, applications started or runtime claims verified.

## Finding

An independently packaged React client can begin with the existing exported
`AppWebEntry`, rather than a new UI or state manager. Independent hosting is not
achieved by copying `apps/web/dist`: the original page requires a Host-produced,
peer-specific bootstrap and dynamic module graph. Its static shell and dynamic
plugin closure are separate products which must remain compatible.

This is a source-supported extraction path, not proof of arbitrary plugin,
multiple-instance or cross-origin compatibility. Those requirements expose seams
which must be designed explicitly.

## Existing sequence and ownership

1. `apps/web/src/main.ts` imports the brand font and `AppWebEntry` plus
   `applyIndexInjections` from `@deepseek-ai/dsh-client-web`, finds `#root`, creates
   the entry and runs it. This is a thin original entry worth retaining.
2. Its existing desktop branch waits for `dshDesktopBoot.ready()`, installs
   transport information, applies an ordered injection table and resolves
   `__DSH_BOOT_READY__`. This already demonstrates asynchronous carrier-owned
   bootstrap; an independent carrier need not reinvent the boot kernel.
3. `AppWebEntry.run()` awaits that readiness gate, requires `__ModuleLoader__`,
   creates the module system with `__DSH_BOOT__`, static seeds and optional bundle/
   asset hooks, prefetches immediate entries, creates a Cordis Context, invokes
   `bootClient`, then hands the container to `mountClient`. Disposal releases the
   Context fiber and page resources.
4. `bootClient` installs the original Cordis Loader, assigns `loader.internal`,
   starts manifest entries through `modules.entries.start`, awaits quiescence,
   audits activation and retains original error reporting. The current fatal set
   is a Web composition policy: modules, session-controller, renderer, layout,
   session, chat and sidebar. It is not an inherently generic base contract.
5. `mountClient` hands the element to the dynamic `uiRenderer` service. Retain
   the original renderer/Slots/UI plugins; neither React replacement nor a new
   session model is required for this extraction.

Sources: [main.ts](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/apps/web/src/main.ts),
[boot.ts](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/client/web/src/boot.ts),
[boot-client.ts](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/client/web/src/boot-client.ts),
[mount.ts](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/client/web/src/mount.ts).

## Static build closure versus dynamic closure

The static singleton table contains exactly eleven module specifiers:
`react`, `react/jsx-runtime`, `react-dom`, `react-dom/client`,
`@deepseek-ai/cordis`, `zod`, `@tanstack/react-virtual`,
`@deepseek-ai/dsh-client-store`, `@deepseek-ai/dsh-client-ui-slots`,
`@deepseek-ai/dsh-client-ui-primitives`, `@deepseek-ai/dsh-client-ui-dockkit`.
These are module identities, not eleven complete independent package trees.
`seed.ts` imports their exports and checks the table against `PLATFORM_MODULES`.
The boot shell also statically uses the Cordis Loader and boot-page/base CSS.
Its complete transitive build closure includes dependencies of these packages;
this inspection does not claim a mechanically computed minimal package list.

Vite resolves workspace packages through built exports, not a broad source alias.
The client-web package is a static-linked library produced from TypeScript output
by its `tsdown.config.ts`. The app config dedupes React/ReactDOM, stubs
`node:module`, and supplies browser definitions for Loader's Node environment
probes. Preserve those constraints. App package devDependencies include tests,
mock servers, preview and other unrelated packages: copying that list wholesale
is not a justified minimal extraction.

Dynamic plugins are outside the normal Vite application import graph. Host graph
rows carry package IDs, revisions, injection edges, external requests and batch
references. The factory module loader resolves static seeds first, then its
materialized/registered modules and graph. Factories and their dynamic chunks
must keep original registration IDs and require identities.

Sources: [seed.ts](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/client/web/src/seed.ts),
[platform.ts](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/client/web/src/platform.ts),
[Vite config](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/apps/web/vite.config.ts),
[web package](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/client/web/package.json),
[module contract](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/client/modules/src/client/manifest.ts),
[module system](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/client/modules/src/client/system.ts).

## Bootstrap contract and what is missing

`bootInjections(graph)` emits a queued `window.__ModuleLoader__` facade,
application preloads, blocking bootstrap bundle scripts and `__DSH_BOOT__`.
The facade locates the registered modules bootstrap factory and delegates
construction to it; fetching the graph alone cannot replace this sequence.

The WebServer's `collectIndexInjections(peer)` gathers all subscribers per Peer,
not just modules. `renderIndex()` also applies raw HTML taps afterward.
`applyIndexInjections` already interprets globals, scripts, script URLs, preload,
style and HTML rows in order. A carrier should reuse it rather than parse one
injected global and accidentally omit other plugin contributions.

No generic authenticated external bootstrap endpoint was established by this
inspection. The WebServer has a collection API and the desktop entry has an
injection payload contract; these are reusable implementation seams, not proof
that an unmodified remote Host exposes that payload over HTTP. A thin optional
Host adapter can expose the existing collection under the correct Peer, but
must also specify any raw-tap contributions that the structured table omits.

Sources: [modules bootInjections, lines 602-637](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/client/modules/src/index.ts#L602),
[WebServer collection and rendering](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/host/webserver/src/index.ts#L718),
[injection interpreter](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/client/web/src/apply-injections.ts).

## Resources, generated code and build sequence

- Preserve both resource families: shell JS/CSS/fonts/lazy grammar chunks from
  Vite, and Host plugin bundles/chunks/assets served through the module system.
- Vite uses relative built asset URLs, but source `index.html` includes root
  absolute manifest/icon references. Independent mount paths need deliberate
  correction, not an assumption that `base: ./` fixes every reference.
- Dynamic browser bundles are closure factories. The shared compiler injects
  plugin-tagged CSS at factory execution and rewrites package assets into
  revisioned resources under `plugins/<package>/assets/...`. Script loading alone
  does not redirect CSS URLs, image URLs, workers or plugin-owned direct network
  calls. Keep original resolvers and audit the selected plugin closure.
- Host modules accept only declared `web` client platform in this baseline.
  Existing web compatibility therefore argues for keeping the web face initially.
- Original generation writes `lib/typert.host.*` and
  `lib/typert.remote-client.*` from source contributors before compilation.
  Client TS compilation and client bundles precede the Web build. A shell-only
  consumer of coherent prebuilt artifacts does not need to regenerate every Host
  package; copying client source requires its declaration/codegen dependency
  closure, including generated Remote descriptors.
- The original Vite config deliberately rejects serve/preview without bootstrap.
  Replace that guard only with an explicit independent bootstrap provider; merely
  deleting it makes a boot-manifest-free shell available, not a working client.

Sources: [client bundle compiler](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/client/tsdown.client.ts),
[Typert generation](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/scripts/generate-typert.ts),
[build graph](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/scripts/build.ts),
[index.html](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/apps/web/index.html).

## Network, authentication and independent hosting

`ClientTransportHooks` already supports logical RPC replacement, fetch,
stream opening, WebSocket factory, stream base URL, bundle loading and asset
resolution. Unary RPC converts channel/endpoint to document-relative
`api/...`; sockets resolve beneath `streamBaseUrl` or `document.baseURI` and
change HTTP(S) to WS(S). Setting only streamBaseUrl does not retarget unary RPC,
bundles or arbitrary resource accesses.

Browser authentication exchanges a root launch-token query for an
authority-bound signed cookie; the connection endpoint has a distinct operator
exchange. Original browser sockets rely on the cookie jar unless the carrier
provides an authenticated factory. A separately served client cannot assume its
own origin's credentials authenticate the remote Host. CORS, cookie policies,
WebSocket admission and bundle/asset authorization need an explicit carrier
contract. Do not set `ownsHost: true` for an arbitrary remote server: it changes
privileged/loopback capability classification.

Minimal-diff candidate A is a same-origin carrier/proxy preserving original
routes, cookies, script assets and socket paths. Candidate B is an independently
hosted page plus complete transport/resource adapters and an authenticated
bootstrap API. B requires a wider audit of plugin-owned fetches and DOM resource
URLs; the existing hook list is not universal interception. Selection belongs
to the design decision, not this source-only finding.

Sources: [connection hooks and installation](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/client/connection/src/client/index.ts),
[RPC](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/client/connection/src/client/rpc.ts),
[sockets](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/client/connection/src/client/socket.ts),
[browser authentication](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/client/connection/src/browser-auth.ts).

## Recommended dependency order, without implementation

1. Fix an upstream source/artifact version and retain original public module IDs,
   static seed identities, client compiler and generated contracts.
2. Package the original shell entry/library with its build closure; preserve the
   dynamic UI/logic bundles instead of statically rewriting them into the app.
3. Define a carrier-owned authenticated bootstrap payload and readiness gate,
   preserving the injection order and peer context.
4. Define a complete resource and RPC/socket origin policy. Audit direct accesses
   in the intended plugin set; retain original auth rather than bypassing it.
5. Separate local startup entry ownership from Host-managed entry ownership.
   Original `ClientEntries` explicitly manages only Host-manifest entries and
   leaves other Loader contributors owned elsewhere: reuse that distinction.
6. Only then extend to multiple concurrent instances. Each AppWebEntry currently
   creates a Context but shares page globals, DOM, seeds and document-relative
   routes; two Contexts alone are not proven isolation. Module facades, CSS,
   storage keys, global events and host-origin capabilities need a defined scope.

Source: [Host-managed entry reconciliation](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/client/modules/src/client/entries.ts).

## Unknowns to preserve

Exact source-copy transitive package closure and distributable artifact
availability were not mechanically resolved. No browser authentication/CORS,
redirect, plugin HTML-tap, HMR/version-change or arbitrary community-plugin
compatibility was tested. An external bootstrap route and complete cross-origin
policy remain design work. Desktop/mobile carriers and standard React support
can reuse this Web path; this note does not select their framework or establish
native rendering feasibility. The proposed independent packaging is an
inference from existing entry contracts, not a completed extraction.

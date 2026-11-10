# DSH client and remote plugin contracts

Source-only research, 2026-11-10. All links pin DSH commit
`fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159`. No build, installation, runtime
experiment or prototype was performed. This answers the source constraints of
[the plugin-contract investigation](https://github.com/isning/mygo-int/issues/22),
not the unresolved mygo architecture choices.

## Execution and ownership

A remote origin is not a remote execution location. The Host loads a Cordis
plugin entry, discovers its declared browser face, publishes artifacts and a
boot graph; the browser downloads that JavaScript and executes its client face
in its own Cordis tree. Host services remain on the Host. Client services are
local. Generated Remote methods bridge the boundary; they do not ship a live
Host service object into the browser.

The source establishes these categories:

- **Host-only:** packages without `dsh.client` do not contribute a browser row.
- **Split:** a Host entry with `dsh.client.platform: "web"` and an exported
  `./client` contributes a separate client implementation. Each side has its
  own Context and lifecycle; communication uses explicit contracts.
- **Functionally client-only:** supported through a no-op Host entry. The
  concrete `@deepseek-ai/dsh-client-ui-session` root exports `apply(): void {}`,
  while its browser face implements the UI and its manifest names the client
  dependencies. This is not evidence that a rootless package is automatically
  discovered.
- **Standalone local client plugins:** the browser Loader accepts entries from
  the supplied module graph, and ClientEntries explicitly owns only Host-graph
  entries, leaving other Loader contributors their own ownership. A local
  composition is possible at this seam; its roster production and conflict
  rules are mygo additions, not an existing Host discovery feature.

Evidence: [Host scan and composition](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/client/modules/src/index.ts#L895),
[no-op UI Host entry](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/client/ui-session/src/index.ts),
[UI package manifest](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/client/ui-session/package.json),
[entry ownership](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/client/modules/src/client/entries.ts).

## Existing metadata and module ABI

`DshClientManifest` contains `platform`, optional `inject`, `external`, and
`immediately`. `inject` contains **package names**, not Cordis service names.
The package names order factory arrival and compose client entries; Cordis
service injection independently controls activation. `external` records exact
non-baseline module requests. There is no native-face, permission or renderer
selection field in this existing declaration.

The Host only accepts platform `web` in this scan. It scans enabled Loader
entries that have a fiber and resolves their package manifests using Loader's
resolution base. Multiple active sources resolving one package name to
incompatible locations are rejected. Therefore a rootless client-only package,
a new platform name, or independently sourced roster needs an explicit adapter
or upstream change; changing a JSON field alone is insufficient.

[Manifest declaration](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/util/package-manifest/src/types.ts#L87),
[parser and wire types](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/client/modules/src/client/manifest.ts),
[Host source reconciliation](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/client/modules/src/index.ts#L1034).

Bundles call `window.__ModuleLoader__.load({ id, factory })`. Registration does
not execute the factory; first import/require materializes and memoizes it.
Bare package ID and its `/client` suffix resolve to the same client exports.
The wire distinguishes package rows, revisions, dependency edges and initial
combo batches; URLs are document-relative delivery references. Preserve this
ABI and IDs rather than renaming reused packages into a new plugin SDK.

The platform singleton table includes React, both JSX/DOM runtime entries,
Cordis, zod, react-virtual, store, Slot, UI primitives and dockkit. A standalone
bundle must retain this seed/external identity contract: accidentally bundling
a second React, Cordis or registry implementation can break existing plugins.

[Module ABI](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/client/modules/src/client/manifest.ts),
[singleton table](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/client/web/src/platform.ts),
[bundle preset](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/client/tsdown.client.ts).

## Cordis, Slot, Config and replacement

`bootClient` creates Loader on the supplied Context, installs the module system
as `loader.internal`, creates graph entries, awaits activation and audits the
required Web entries. Reuse this sequence rather than substituting a second
plugin manager. Loader owns plugin fibers, injection waiting, Config parsing,
updates and disposal. Entry configuration supports `inject`, `intercept` and
`isolate`; isolation selects service identities using symbols. It is not a new
module table or a code security sandbox.

[Boot sequence](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/client/web/src/boot-client.ts),
[entry lifecycle/Config](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/vendor/loader/src/config/entry.ts),
[service isolation](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/vendor/loader/src/config/isolate.ts).

Slot compatibility means preserving existing registration, injection, store,
priority and React component behavior, not merely displaying a plugin URL.
React hooks and host context must refer to the same runtime and registry.
Native multi-face slots are a separate proposed extension, unnecessary for
extracting the official React client.
[Slot implementation](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/client/ui-slots/src/index.ts).

ClientEntries serializes graph sync/reload/retry; tracks owned entries and
revisions; tears down replaced fibers, removes owned styles, invalidates module
records and refreshes entries. Removed entries wait for disposal. A Host release
change is gated before graph parsing and announced rather than applied live;
dismissing the notice does not make a different release compatible. Preserve
this behavior when adapting delivery. Do not equate HMR with arbitrary safe
cross-version migration.
[Reconciliation](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/client/modules/src/client/entries.ts),
[release gate](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/client/modules/src/client/release-change.ts).

## Remote is a generated service contract

The client Gateway explicitly says it projects generated Typert Remote
descriptors; it does **not** use a JavaScript Proxy for dynamic discovery.
Contributions mount typed namespace services through `ctx.remote.$mount`,
validate collisions and register scoped/direct variants. Unmount withdraws
methods, aborts their invocation tokens and disposes empty namespaces.
Unary calls resolve the descriptor and caller context, then invoke
`connection.rpc.call('/api', endpoint, { args }, signal)`; streaming uses the
stream carrier and existing framing/supervision. Preserve descriptors, codecs,
errors, resource semantics and cancellation rather than providing only a
lookalike method name.
[Client Gateway](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/api/gateway/src/client/index.ts).

`@Remote` options currently accept name, stream mode and resource readers.
There is no generic offline retry/queue metadata. Host Gateway evaluates
principal access and resources before execution; client access hooks are a UI
projection, not authorization. The client remote-access plugin consumes an
injected access baseline and mounts its generated namespace. Extraction must
retain that baseline/bootstrap path or explicitly adapt it.
[Remote markers](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/typert/protocol/src/index.ts#L319),
[Host enforcement](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/api/gateway/src/index.ts),
[client baseline](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/api/remote-access/src/client/index.ts).

## Thin extraction seams and multiple instances

Existing `ClientTransportHooks` already provide rpc, fetch, stream opener,
bundle loader, asset resolver, authenticated WebSocket creation and stream
base URL. `ConnectionInstallOptions` explicitly accepts instance-local
transport/location/recovery inputs. Defaults assume a browser document and
WebSocket cookie jar; standalone loading must deliberately resolve routes,
assets and authentication against the selected Host. `ownsHost` grants a
privileged interpretation and must not be enabled merely because mygo is local.
[Connection contract](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/client/connection/src/client/index.ts),
[RPC carrier](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/client/connection/src/client/rpc.ts).

The existing HTML boot facade and global `__DSH_BOOT__`, transport hooks and
access baseline are page-oriented. Extraction can reuse their payload and
module-system constructor while adapting how they arrive. It does not need to
replace Slot, Config or Remote contracts. A global facade/table shared between
several Hosts cannot distinguish equal package IDs with differing code; service
isolation alone cannot solve this. Separate module ownership, document/global
state and injected baselines must be addressed by the multiple-instance design.
This finding does not prescribe one realm implementation.
[HTML facade](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/client/modules/src/index.ts#L602),
[Web bootstrap](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/client/web/src/boot.ts).

## Corrections and remaining unknowns

The fixed bundle preset guards its CSS injector with `typeof document !==
'undefined'`; therefore the blanket assertion that this injector necessarily
crashes a headless runtime is not supported at this commit. Other module side
effects still require separate inspection. This extraction preserves Web UI,
so headless execution is not a prerequisite anyway.

Not established here: a supported rootless-client installation convention; full
authentication login/cookie/CORS flows across desktop/mobile carriers; every
plugin's direct global or DOM dependencies; complete cross-release compatibility;
performance; standard React semantics outside the browser; security isolation
of remotely supplied JavaScript; ability to mix different Host releases in one
module table. These require explicit subsequent decisions or focused research,
not invented compatibility guarantees. The DSH-go bridge is not used as a DSH
standard in this note.

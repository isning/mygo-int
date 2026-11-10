# Client and remote plugin architecture

Status: plugin framework boundary confirmed; operational details are design
proposals, 2026-11-10. This builds on DSH's existing
React/Cordis client rather than defining a replacement plugin SDK. The user permits an optional thin DSH remote adapter, reusing existing Host
capabilities without core modifications; an unmodified-Host compatibility path
remains in scope without a promise of equal capabilities.

The user confirmed reuse of the existing Cordis/Loader, package, React/Slot and
Remote contracts; mygo adds local composition, provenance/ownership and connection
adaptation. Concrete isolation, signatures and compatibility versions remain open.

## 1. One plugin model, separate ownership and execution

Use Cordis and its Loader on each executing side. The distinction between client
and remote is not a second plugin framework. Record package source, executing side
and owning composition independently:

- Local client entry: selected by local startup configuration; runs in the client;
  belongs to the trusted local composition.
- Instance-provided client entry: supplied by an instance's graph; runs in the client;
  belongs to that instance's composition.
- Remote backend entry: runs in the instance's Host; its services remain remote.
- Split package: contributes backend and client entries with explicit communication.

The upstream source already supplies a functionally client-only example through
a no-op Host root plus a client export. Do not confuse that with support for Host
auto-discovery of a package having no root at all. Local composition discovery is
a separate input to the client Loader and should not require a fake remote backend.

## 2. Reuse existing contracts

Preserve the upstream client declaration and module ABI:

- `dsh.client.platform`, package `inject`, `external` and `immediately` metadata.
- Factory registration and original package/client module ID normalization.
- Platform-seeded React, React DOM, Cordis, store, Slot and UI library identities.
- Cordis entry Config, service injection, service isolation and fiber disposal.
- React component/Slot props, stores, source subscriptions and lifecycle behavior.
- Generated Remote descriptors, namespace mounting, resources, errors and cancellation.

Package `inject` is not a Cordis service-name list. A package dependency determines
which factory is available; a service dependency determines activation readiness.
Keep both graphs intact rather than merging them into a new generic dependency flag.

Do not implement a lookalike dynamic JS Proxy as a replacement for the generated
Gateway. The actual upstream client mounts namespace descriptors and handles scoped
and direct invocations, access projections and teardown.

## 3. Local and instance graph contributions

The local startup composition selects client entries and configuration. Instance
providers produce the existing compatible graph plus provenance, identity and resource
context. Feed these into the existing module system/Loader seams, retaining ownership
of each contribution.

Upstream ClientEntries already manages only its own Host graph entries and leaves
other Loader contributors independent. Reuse this mechanism so remote refresh does
not unload local client plugins or replace global application authority.

An extra local package descriptor may record installation source or trust, but should
wrap the existing declaration rather than change the existing plugin's source format.
Existing plugins are not required to import a new mygo SDK just to keep working.

## 4. Collision and service rules

Each module table has one coherent implementation for a module identity and its
required singletons. Equal package IDs from different sources are not resolved by
arrival order. Compatible identical artifacts can share a record; conflicting
versions require explicit composition policy or separate tables/contexts.

Cordis service `isolate` can separate service identity; it cannot solve every module,
React singleton, DOM, stylesheet, storage or security boundary. These are different
layers. Do not turn this finding into a mandatory engine-per-instance architecture.

Trusted local plugins can replace the application composition, including navigation
and Root. Instance-supplied contributions stay inside their authorized instance
composition. Loader availability of a package does not grant it global authority.
The confirmed trust policy requires isolation and explicit grants; the carrier must
prove its enforcement. Cordis scope alone is not that enforcement. See
[trust boundaries](trust-and-execution-boundaries.md).

## 5. Bootstrap provider

Introduce a carrier-facing bootstrap source, not a new client framework. Its result
must preserve the upstream ordered injection contract and selected Peer context:
module registration facade, boot graph, access baseline and other plugin injections.
Reuse `applyIndexInjections` and the original ready gate where applicable.

DSH's structured index collection and later raw HTML taps are distinct. An adapter
must account for both or explicitly state the unsupported contribution category.
Fetching only `__DSH_BOOT__` does not reproduce the original boot environment.

The bootstrap source also identifies remote authority, release/graph identity,
resource origin and authenticated carriage. It cannot manufacture privileges or set
`ownsHost` merely because the client is installed locally.

Possible sources include a thin remote plugin exposing existing Host collection,
or a version-specific compatibility adapter for the original served page. They have
different maintenance and fidelity costs. The optional thin remote plugin is allowed;
it must not become an unconditional prerequisite for connecting to DSH. Installation
is not performed by this design decision.

## 6. Transport and resources

Preserve ClientTransportHooks for logical RPC, fetch/stream, WebSocket, bundle loading
and asset resolution. Preserve the original Remote protocol and host enforcement.
Use transport adaptation rather than moving Host service code onto the device.

Inventory all resource paths: shell assets, plugin factories/chunks, CSS URLs, fonts,
images, generated resources and plugin-owned direct requests. The logical RPC hook
does not intercept all browser network access. A per-instance origin facade/proxy is
one candidate for preserving relative URL assumptions; a full cross-origin adapter
requires a larger audit. Neither is silently selected by setting one base URL.

Credential/cookie/WebSocket policies belong to the chosen carrier. A remote plugin's
declared resources cannot implicitly acquire another instance's credentials.

## 7. Update and removal

Keep upstream serial graph reconciliation, revision tracking, fiber teardown, owned
CSS cleanup and release-change gate. Remote graph removal affects owned instance
entries, not unrelated local contributors. Cancellation and withdrawn Remote namespaces
follow existing service disposal.

Package update, service reactivation, graph revision and Host release change are
different events. Do not claim arbitrary cross-release live migration because the
loader supports module invalidation. Persistent state migration is a separate contract.

## 8. Compatibility obligations

Judge compatibility independently at these boundaries:

1. Declaration/discovery and package export shape.
2. Factory ABI, module IDs, dependencies and framework singleton versions.
3. Cordis Config, activation, service resolution and disposal.
4. React DOM, Slot, shared UI and observable-source behavior.
5. Remote descriptors, resources, access baseline and cancellation.
6. Asset/origin/authentication behavior and direct browser APIs.
7. Update/removal/release handling and ownership isolation.

Retain upstream fixtures and add cases for no-op-root client-only, split backend/client,
Web Slot UI, settings, lazy chunks/styles, direct resources, generated methods and
update/removal. Source similarity is not evidence that every community plugin runs.

Native faces extend the original Slot interface with one registration and multiple
renderer faces; see [unified Slot rendering](unified-slot-rendering.md). This is a
client-side compatible extension, not a second plugin SDK. It requires a tracked
client patch but does not require a remote Host core change.

Native faces and additional harness providers are additive integration work. They do
not invalidate the original-compatible React execution profile or require legacy
plugins to express semantic native pages.

## 9. Proposed adapter responsibilities

This section is a design proposal, not an approved new API or an existing DSH API.
Use the smallest wrapper around existing structures; exact TypeScript signatures
follow the pinned upstream types during implementation.

A harness integration is itself a local Cordis plugin. It can contribute connection,
bootstrap and resource providers without teaching the base about harness instances.
For DSH, keep these responsibilities independently replaceable:

- Reachability: direct address, existing gateway, tunnel or platform-provided channel.
  Return authenticated carriage capabilities, not a replacement session model.
- Authentication: establish/renew/revoke the relevant credentials and identify the
  admitted authority. Gateway admission and Host admission can be separate layers.
- Bootstrap: obtain the ordered upstream injections, selected Peer/access baseline,
  graph/release identity and asset context. Explicitly report unavailable fidelity.
- Resource carriage: cover upstream module/chunk requests, HTTP, WebSocket, streams
  and browser-owned assets. Preserve status, binary bodies and cancellation.
- Graph contribution: reconcile only the provider-owned client entries using the
  original Loader/module contracts; retain original package IDs within its module table.

These may be implemented by one plugin or collaborating plugins; they are boundaries
of responsibility, not a requirement for five services or five packages. A provider
must not claim authority that its transport does not possess.

## 10. Proposed compatibility profiles

Do not compress compatibility into a single supported/unsupported bit:

- Extracted official React profile: the local carrier boots the reused official
  client code with a complete compatible bootstrap and resource environment. Local
  composition and instance graph ownership must be demonstrated independently.
- Original-page compatibility profile: a carrier opens/forwards the official served
  page. Existing plugins execute in that original environment. This preserves a
  useful access path but does not claim independent local-client boot, local Cordis
  composition integration or native semantics.
- Semantic/native profile: an additional renderer/component contract for plugins
  deliberately targeting it. It does not replace the React profile for legacy code.

An unmodified Host may support the extracted profile through a version-specific
bootstrap adapter, or only the original-page profile. Declare which is available.
An existing gateway is a carriage option, not automatically a bootstrap provider.
The optional mygo remote adapter should expose existing Host facilities rather than
become the owner of sessions, a parallel agent server or a required central service.

## 11. Proposed lifecycle and failure contract

For each provider-owned contribution, use this sequence:

1. Resolve the selected integration and its local configuration.
2. Establish carriage and authenticate the selected authority.
3. Obtain a coherent bootstrap, graph/release identity and resource context.
4. Validate module identities, singleton requirements and supported profile before
   executing new factories; report conflicts rather than accepting last-arrival wins.
5. Apply the original ordered bootstrap; register entries with explicit ownership;
   activate through Cordis's existing service dependency/lifecycle machinery.
6. Reconcile graph revisions serially through the original module/entry mechanisms.
   Keep local contributors outside the remote provider's removal set.
7. On removal, dispose owned fibers, subscriptions, Remote mounts and styles through
   their original disposal paths. Release provider resources when ownership ends.

Connection loss, authentication expiry, plugin failure and release incompatibility
are separate events. A transient disconnect is not plugin uninstallation and does
not authorize resetting local configuration. A release gate may require rebuilding
or reloading a compatible environment; do not silently mix revisions. Failure to
initialize one optional entry follows the original diagnostics policy, not blanket
unloading of unrelated local plugins.

Existing DSH connection recovery remains authoritative inside the reused client.
A tunnel provider can recover its physical channel, but must not introduce competing
RPC retries, duplicate prompt submissions or a second session recovery manager.
Offline queueing remains a separate unresolved contract; no gateway example proves
safe replay for all Remote methods.

## 12. Selected boundaries and deferred realization

The confirmed policy separates trusted local composition from instance/authentication
compatibility environments, with their own module, DOM, storage and authority boundaries.
A separate OS process per instance is not required. Shared capabilities remain opt-in
interfaces rather than a base-owned universal harness schema.

The current realization starts with the original React/Web client. Specific PC native
backends, cloud providers and distribution channels are explicitly deferred. Carrier
implementations must later pin origin/storage strategy, browser/native backend versions,
bridge enforcement and performance evidence. These are not permission to weaken the
already-selected isolation/compatibility requirements.

An unmodified Host's independent bootstrap fidelity is still version-dependent and
must be demonstrated by the adapter. The optional remote plugin and original-page
compatibility path have different capabilities; neither can be advertised as runtime
verified from these source notes alone.

## Existing remote implementations

[Source comparison](../research/dsh-remote-reference-patterns.md) distinguishes
transparent page carriage, in-process authentication, split Cordis plugins and an
Android WebView carrier. Preserve those separate contracts in adapters. Page
forwarding is not evidence of independent local boot or multi-instance isolation.
Transport providers must account for HTTP, WebSocket, SSE, lazy resources and
upload/download; authentication must preserve the selected Host Peer context.

## Sources

- [Extraction source analysis](../research/dsh-react-extraction.md).
- [Client/remote contract analysis](../research/dsh-client-remote-plugins.md).
- [Upstream entry ownership](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/client/modules/src/client/entries.ts).
- [Upstream client Gateway](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/api/gateway/src/client/index.ts).

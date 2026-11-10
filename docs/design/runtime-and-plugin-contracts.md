# Runtime and plugin contracts

Status: proposed design, 2026-11-09. No implementation or runtime experiment.
Read alongside `client-architecture.md` and `presentation-protocol.md`.
For the resolved reference choices, prefer `design-resolution.md` and
`protocol-specification.md` where this earlier exploration leaves alternatives open.

## 1. Conditional feasibility

mygo is a general-purpose Cordis client. Harness plugins supply integration logic;
platform plugins supply OS services; presentation plugins provide device-adapted UI.
DSH client services are reusable integration components, not a required universal model.

The design is structurally feasible if compatible client logic can execute locally
and UI uses explicit presentation contracts. This does not establish engine performance,
upstream acceptance, arbitrary React compatibility, or implementation effort.

The Android study's exclusion of desktop and Web islands is not adopted as the product
boundary: desktop remains required; mixed native/Web presentation is an architectural
goal, with initial compatibility coverage undecided.

## 2. Three scopes that must not be conflated

### Application domain

Owns connection identities, local plugin installation, grants, credential references,
global navigation, diagnostics, and supervision. A bundled bootstrap starts Cordis
and platform services without a remote host. Infrastructure is plugin-based where
practical; the pre-Cordis loader is necessarily outside that lifecycle.

An OS-owned recovery screen survives plugin failure. It is separate from the normal
replaceable Root Slot; remote packages cannot remove the user's recovery path.

### Connection context

Owns harness-specific business services, subscriptions, state, operations, package
generation, and contributed routes. A connection has its own Cordis context. Closing
a view releases view resources without implicitly disconnecting the harness.

The selected integration, transport carrier, and remote target are distinct objects.
A new tunnel URL need not mean a new workspace; conversely an unchanged URL must not
cause queued work to be sent to a different server identity after replacement.

### Module realm

Owns evaluated modules, globals, singleton versions, and their module table.
A Cordis context scopes services but does not isolate JavaScript module exports.

Conservative default: one module realm per independently versioned connection
generation, with its own Cordis instance. The application domain has its own realm.
Different realms can potentially share an engine, depending on the engine API.
This is not a commitment to one OS process per connection.

The distinction is required by DSH's module-name keyed factory/export cache: two hosts
may supply different versions under the same package name. A shared global table
cannot resolve that using Cordis child contexts alone. Share artifact bytes, not
mutable singleton exports. Communicate across realms using explicit serialized
contracts, never raw Cordis contexts, callbacks, or assumed singleton identity.

Cordis scoping and realms are not by themselves a security sandbox. Untrusted
execution requires enforceable engine/process limits and a restricted platform bridge.

## 3. Plugin descriptor and dependency model

Proposed descriptor dimensions:

- Identity: publisher/package ID, version, provenance, verified artifact digest.
- Runtime: bridge ABI, Cordis ABI, execution profile, required engine features.
- Activation: application, connection, or presentation-occurrence scope.
- Services: provided/required versioned contracts and optional dependencies.
- Presentation: routes, Slot contributions, rendering faces, assets.
- Grants: platform capabilities, connection access, network/resource access.
- Persistence: namespace, schema version, migration and recovery support.

Harness, carrier, renderer, storage, and UI are contribution roles, not exclusive
package types. Module evaluation boundaries nevertheless must allow headless logic
to load without evaluating DOM-only code.

New packages should separate logical, native-description, and Web entry points.
Do not filter whole packages solely by rendering faces: a React-only package may
also register essential services. Resolve a dependency closure before loading.
Existing mixed DSH entries may need refactoring or an explicit compatibility adapter;
a no-op React or document shim is not a supported compatibility model.

The minimum common contracts cover connection creation/disposal, integration discovery,
page registration, navigation, capabilities, persistence, and operation lifecycle.
Chat/tool/subagent contracts can be optional shared profiles. An integration retains
namespaced APIs for semantics that do not fit common profiles. No universal
SessionManager is required.

## 4. Bootstrap and artifact generations

Two manifests have distinct authority:

1. Application installation: trusted local plugins and platform ABI requirements.
2. Connection generation: harness packages, protocol identity, and host dependencies.

A remote manifest is an installation proposal, not permission to replace application
services or acquire capabilities. DSH manifests are translated by the DSH adapter.

Startup stages:

1. Start bundled bootstrap/recovery and platform services.
2. Open application Cordis domain and connection catalog.
3. Select a compatible cached generation or fetch a candidate manifest.
4. Validate identity, grants, dependencies, ABIs, and required entry points.
5. Fetch and verify activation artifacts; atomically commit the generation pointer.
6. Create connection realm and activate dependencies through scoped bridges.
7. Audit required services, publish navigation contributions, and recover remote state.

Use locally verified cryptographic digests for content addressing. DSH `rev` is an
opaque artifact revision, not a guaranteed content hash. Hashes verify bytes, not
publisher trust. A generation's graph identity and each artifact digest serve
different purposes.

Offline completeness requires an artifact closure including lazy chunks and assets
needed by promised offline routes. Missing optional chunks disable those routes
offline, with an explicit explanation. Never fill gaps using another generation.
First-time remote setup cannot work offline without preinstalled artifacts.

Production upgrades stage a whole compatible generation rather than directly applying
remote HMR. Persist drafts and operation records, stop accepting new work in the old
generation, revoke its event epoch and replay lease, dispose it, then activate the new
generation. Candidate staging must not perform live business mutations. Only one
generation owns replay for a connection.

Rollback requires compatible local schemas and host protocol. A host already upgraded
incompatibly cannot be repaired by loading old cached client code. Offer cached reading
or update-required mode. Prefer additive migrations; destructive schema migration
eliminates unconditional automatic rollback.

## 5. State and service boundaries

Harness plugins own domain facts and protocol recovery. The navigator owns routes
and history. The renderer owns focus, scroll, IME composition, and ephemeral selection.
A draft service owns recoverable input. Platform services provide storage mechanisms,
not duplicate business managers. Rendered nodes are disposable projections.

Inside a realm, reuse observables such as `getSnapshot/subscribe`. Across the native
bridge expose source IDs, snapshots, revisions, updates, and explicit operations.
Define a snapshot/subscription cutover that cannot lose changes between the initial
read and listener attachment. Resume from a valid cursor or install a new baseline;
never merge streams across remote identities or incompatible generations.

Connection readiness includes transport, authentication, protocol compatibility,
and business recovery. An open socket is not sufficient. OS online status is a hint.
The adapter owns retry policy; native transport does not independently replay RPCs.

Platform services supply bounded transport, transactional storage, clocks, randomness,
credential handles, lifecycle signals, and scheduling. Suspension and process death
are expected. Do not require a permanently running background engine.

## 6. Durable operation model

Offline policy is per operation: reject, cached read, local draft, or durable replay.
Queued is an explicit outcome, not successful remote execution. Do not change every
DSH Remote method or its return union before specifying the first durable operation.

Record operation ID, connection and remote identity, workspace where relevant,
integration/payload schema versions, ordering lane, durable payload references,
and status. Reference credentials instead of storing secret copies in queue data.

Lifecycle:

`draft -> persisted -> sending -> awaiting-confirmation -> confirmed`

Additional states: blocked, rejected, cancel-requested, cancelled. Persist before
acknowledging local acceptance. Server confirmation and local queue/projection updates
must converge after a crash. Final local retirement should be transactional.

A dispatch timeout means unknown outcome. Reconcile or replay using the original ID;
do not create a new operation ID. The guarantee is at-least-once delivery with
idempotent server effect or durable reconciliation, not exactly-once transmission.

Adapters declare ordering lanes and ordering relative to online submissions. Usually
one conversation is a lane; one blocked conversation need not block all others.
Automatic replay requires durable server deduplication. Otherwise preserve a draft
or require manual reconciliation.

Remote deletion, permission revocation, credential expiry, target identity change,
and incompatible payload versions block replay. Deleting a local record cannot cancel
an operation the host already accepted. Cancellation therefore has its own semantics.

Map DSH text prompt requestId/receipt behavior first, using the supplied study as a
lead rather than assuming all mutations behave alike. Other writes need individual
contracts. Offline attachments require durable local file copies; temporary upload
receipts alone cannot guarantee recovery.

Offline startup, cached browsing, draft editing, queued submission, and offline agent
execution are separate capabilities. Remote agents cannot execute while unreachable.
Local queue persistence is not cross-device queue or draft synchronization.

## 7. Ownership, disposal, and trust

Every resource belongs to application, connection generation, plugin activation,
page occurrence, or surface. Track subscriptions, timers, callbacks, requests,
resource handles, and contributions under that owner.

Disposal revokes event handles before removing UI, cancels owned work, and releases
subscriptions. Durable operations and drafts survive disposal and await compatible
recovery. Cordis cleanup cannot undo remote effects or forcibly stop arbitrary loops;
failed disposal can require terminating a realm.

Grants are capability scoped and checked by platform bridge calls carrying connection
and owner identity. Manifest declarations do not constitute user consent. Keep
credential bytes out of downloaded code when feasible. Web content never receives
unrestricted application IPC.

Bound CPU execution, memory, bridge traffic, node counts, pending patches, and Web
surfaces. Logical error boundaries do not replace hard execution isolation.

## 8. Theoretical walkthroughs

### Different host versions

Two connections evaluate independent module graphs. The application aggregates
serialized route contributions rather than raw services. Events include connection
and generation identity, so switching the active host cannot retarget an old action.

### Process death during submission

The durable record predates local acknowledgement. Recovery reconciles the same ID,
and the projection combines local draft/operation state and the host receipt into one
logical message. Without host deduplication, automatic resend is not promised.

### Upgrade while editing

Save a versioned draft and route identity. Revoke old action handles. New code restores
compatible fields or offers explicit recovery; it does not submit restored state.
Staging activation must not create a second live replay owner.

### Plugin removal

Remove subscriptions and contributions, but preserve recoverable drafts and unavailable
route records. The user can leave the unavailable page. A broken root goes to the
bundled recovery screen, not another downloaded plugin by accident.

## 9. DSH integration boundary

Reuse DSH client logic within its connection realm and provide supported transport
hooks. Check exact platform-singleton and Cordis ABI compatibility. Different realms
may require different Cordis versions; communicate through mygo contracts.

Existing React plugins need a compatible Web host with their services, slots,
singletons, assets, theme, and lifecycle. Native faces require authoring or explicit
adapters. Neither compatibility direction is automatic.

Proposed upstream improvements: non-HTML boot manifest, headless entry separation,
and renderer-aware Slot contracts. They are not existing guarantees. Generic mygo
contracts must remain useful without their adoption. A pinned adapter or maintained
patch set is a possible integration boundary; HTML parsing is a legacy fallback,
not a stable host API.

## 10. Source basis and remaining decisions

Read-only inspection for this design used DSH `fcc0ad4`:

- [Module system](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad4/packages/client/modules/src/client/system.ts): module-name keyed export tables, bundle transport, bootstrap replacement restrictions.
- [Manifest](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad4/packages/client/modules/src/client/manifest.ts): dependency fields, opaque revisions, optional release identity, platform seeds.
- [Transport](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad4/packages/client/connection/src/client/index.ts): logical RPC and bundle/asset substitution.
- [Slot renderer](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad4/packages/client/ui-slots/src/renderer.ts): ReactNode contract, selection, subscription, error reporting.

Other source conclusions in the supplied feasibility study remain attributed to that
study unless independently checked. All mygo contracts above are proposals.

Remaining decisions: PC OS coverage; toolkit and engine; publisher trust/isolation;
initial DSH native/Web coverage; shared chat/tool/subagent profiles; cross-device
synchronization; and platform media, accessibility, file, and background requirements.

# Complete architecture reasoning

Status: complete theoretical design proposal, 2026-11-09. This resolves the design
branches for a coherent reference architecture. Recommendations are not user-approved
technology commitments. No application, prototype, or runtime experiment was executed.

Subsequent decisions supersede parts of this proposal. The current direction is
[official React extraction](react-client-extraction.md), [unified Slot faces](unified-slot-rendering.md),
[isolated module domains](runtime-domain-options.md) and
[platform-specific carriers](platform-carrier-contract.md). Neither one Compose
stack, QuickJS nor a mandatory realm per connection generation has been selected.
Use [project definition](project-definition.md) for confirmed scope.

## 1. Result and boundaries

The reference architecture is an on-device Cordis plugin system with a native
presentation host and optional bounded Web content. Harnesses are integrations,
not application foundations. DSH can reuse its client logic within an integration;
ACP and future integrations can supply different models through the same lifecycle.

The design is internally consistent under these explicit assumptions:

- A selected JS engine executes the supported headless client artifact profile.
- DSH logic can be packaged without evaluating DOM-only UI dependencies, using an
  adapter or maintained patches where upstream separation is absent.
- The selected native toolkit can host bounded Web content on each shipping platform.
- Remote capabilities and reconciliation guarantees are advertised honestly.
- Downloaded code receives only the trust and isolation the implementation enforces.

Theory establishes how these requirements compose and identifies contradictions.
It does not establish measured speed, complete existing-plugin compatibility, a
maintainer's acceptance of patches, or distribution-policy compliance.

The design uses Android and a portable PC host as target classes. The recommended
desktop abstraction covers Linux, Windows and macOS; this is not an agreed promise
to release all three simultaneously. Browser-only and iOS distribution are outside
the current product requirement, without being excluded by the protocols.

## 2. Decisions that close the previous draft

### D01. Cordis at each logical runtime boundary

The application domain and each connection domain are Cordis-based. Application
plugins supply catalog, navigation, persistence coordination, diagnostics and runtime
management. Connection plugins supply harness services and presentation contributions.

Use one independent module realm per connection generation as the conservative
default. Cordis injection scopes alone cannot isolate package versions or globals.
Realm pooling is permitted only for an explicitly compatible trust/version cohort.
The application and a DSH connection may run different Cordis versions, communicating
through a versioned data bridge rather than sharing contexts.

The host-side engine abstraction owns a runtime's execution budget and job queue.
One connection failing must not force termination of the application domain.
Unrelated connection realms may still share a native process; hard process isolation
is a distinct profile, not a property implied by Cordis.

### D02. Local bootstrap, remote augmentation

mygo boots its own bundled minimum graph before contacting a harness. DSH manifests
augment only the authorized connection subtree. Cached manifests and artifacts allow
offline reopening; remote bootstrap is never the sole path to application settings.

The minimum native recovery shell lists failed domains and permits safe re-entry
without loading optional packages. Ordinary Root remains a replaceable Slot for
authorized application plugins. Bootstrap recovery is not replaceable by them.

### D03. Service logic remains in JS

Platform code supplies mechanisms: transport handles, transactional storage, files,
credentials, engine scheduling, rendering and OS events. Cordis plugins supply policy:
connection recovery, session state, operation execution, routes and feature behavior.

Native mirrors are disposable projections, not a second SessionManager. Native input
does own transient editing and durable draft acknowledgement, as specified below;
this is a presentation service, not duplicated harness logic.

### D04. Semantic UI, not arbitrary DOM translation

Plugins declare Page, Section, Collection/Detail, Actions, Presentation and Content.
The host applies device policy. Raw Tab, bottom-bar or window coordinates are not
part of the portable semantic API. Content independently selects native or Web faces.

PC and mobile share route identity, actions and outcomes. They do not share mandatory
widget arrangement. A platform may provide richer layout without hiding core actions
on the other platform.

### D05. Explicit authoring boundaries

The base SDK uses descriptors, observable sources and an optional custom JSX factory.
It is not advertised as ordinary React. A React authoring adapter can run a real
reconciler over the same descriptors, with its own pinned compatibility profile.
That adapter is not necessary for the base protocol to work.

Web entries use ordinary HTML/CSS/React or another framework in a real Web runtime.
One plugin package can contain headless services, a semantic entry, and Web entries.
These share types and resource IDs, not live closures or a single implicit hook tree.
Do not accept JSX such as arbitrary DOM children inside a headless WebContent node
unless an explicit compiler produces a separate entry with serializable props.

Initial authoring uses named Web entries and explicit observable/RPC bindings.
This costs a visible boundary in source code but avoids hidden compilation rules.
An optional compiler may automate it later without changing runtime semantics.

### D06. Restricted nesting

Semantic containers may nest subject to depth and navigation limits. Native containers
can contain Web content leaves. A Web leaf owns its internal DOM; it cannot place
arbitrary native children back into that DOM. Global navigation requests cross the
bridge. A recursive native/Web/native visual tree is outside the reference model.

Inline tools use native summaries and expand/open richer content surfaces. This is
a default resource policy, not deletion of plugin functionality. A plugin requiring
inline Web can declare that capability; absent support yields an explicit alternative.

### D07. Optional shared feature profiles

Define portable profiles for conversation browsing, streaming content, tool activity,
user requests, agent relationships, artifacts, configuration and commands. Integrations
implement profiles they actually support. The UI displays unsupported, unknown and
partial states distinctly. Original provider-specific payloads remain namespaced.

Profiles project integration state and actions; they do not replace the integration's
internal stores. A common UI plugin consumes a profile, while an integration-specific
UI can consume native services and contribute specialized pages.

### D08. Durable operation service, adapter-owned semantics

One local operation coordinator stores records, owns dispatch leases and schedules
lanes. The adapter supplies prepare, execute, reconcile and cancel behavior. Transport
never independently retries a mutating call. Remote-side queues remain distinct from
the client's offline queue.

Only operations with a durable deduplication/reconciliation contract auto-replay.
Others remain local drafts or result-unknown records requiring user reconciliation.
Every local acceptance is after durable storage commit.

### D09. Generation activation rather than implicit HMR

Installed artifact graphs change atomically per connection. Upgrade pauses dispatch,
persists drafts, fences old event/operation owners, then recreates the realm. Production
does not inherit arbitrary development HMR. New grants require separate approval.

Rollback is local and conditional on server and schema compatibility. Staging tests
static/initialization constraints but cannot guarantee absence of all future failures.
An adapter that mutates remote business state during activation violates the contract.

### D10. Trust classes reflect real enforcement

Bundled application code and user-approved integration cohorts can share privileges
inside their own realm. Cordis does not provide per-package hostile-code isolation.
Code sharing a realm can compromise other code in that realm; grants are meaningful
at the enforced boundary, not merely at a caller-supplied package ID.

An untrusted extension needs a separate restricted execution domain and a broker
that stamps its identity. Until that profile is implemented, mygo must not claim
hostile-code sandboxing or auto-enable arbitrary remote code as trusted.
Web content uses its own origin/channel and restricted bridge; it never receives
the platform bridge available to trusted application code.

## 3. Concrete package organization

Recommended package roles, deployable as separate packages or documented subentries:

- runtime-bootstrap: module loading and realm supervision before Cordis activation.
- platform-contracts: serialization, source, resource, clock, storage and transport APIs.
- app-services: catalog, grants, navigation, drafts, operations, diagnostics.
- semantic-ui: page/Slot contracts and headless descriptor production.
- native-renderer: descriptor evaluation, node projection, patching and event routing.
- web-host: packaged content resources, bridge and surface lifecycle.
- profiles: optional reusable chat, tool, agent, request and artifact contracts.
- integration-dsh: DSH lifecycle, upstream manifest adaptation and profile projections.
- integration-acp: ACP lifecycle and profiles, using an explicit carrier.
- carrier-plugins: direct remote transports, SSH/tunnels and supported gateways.
- platform-hosts: Android and desktop engine, storage and rendering implementations.

Dependencies flow from integration/UI implementations to contracts and platform
proxies. The application does not import a particular harness to define its own
route schema. Profile packages do not depend on DSH private types.

Carrier selection and credentials are persisted in the connection catalog. A carrier
may discover targets, but cannot authorize a discovered target implicitly. Starting
an agent over SSH is a declared remote operation, distinct from passive connectivity.

## 4. Plugin package and UI authoring example

Illustrative package entries:

```json
{
  "id": "example.tasks",
  "entries": {
    "logic": "logic.js",
    "presentation": "pages.js",
    "web": { "dashboard": "dashboard/index.html" }
  },
  "provides": ["example.tasks@1"],
  "requires": ["mygo.navigation@1", "mygo.sources@1"],
  "storageSchema": 1
}
```

The semantic entry describes a tasks page, overview/history sections, a detail route,
and a refresh action. A Content leaf names `dashboard` and serializable initial props.
The Web entry opens a granted service proxy and observes `example.tasks@1`. Its DOM
can use React hooks normally. Its refresh button calls the same operation as a native
toolbar action; it does not create another task store or connection.

The lifecycle owner is issued by the host, never inferred from a global current tab.
Descriptor evaluation is pure relative to rendering: effects are registered in
activation/occurrence lifecycle scopes. Repeated projection does not re-send commands.

## 5. Page and navigation policy

The navigator stores a workspace containing route occurrences and semantic relations.
A route's stable key is connection/plugin/route/validated-parameters. An occurrence
ID permits multiple views of the same route. History belongs to the occurrence group,
not to transient layout nodes. Detail links retain their source route.

Reference policy:

- Compact: primary destination, selected section, optional pushed detail and transient UI.
- Expanded: destination list, active workspace, optional detail pane; other occurrences
  remain accessible through the host's workspace navigation.
- Width transition: reproject the same logical selection/history. Do not record resize
  as a navigation action or create duplicate business subscriptions.

Back dispatch order: platform IME handling; active transient/selection mode; opted-in
Web local history within the current surface; active semantic detail/history; workspace
root/system exit behavior. Web handling is bounded and cannot consume back forever.
Unsaved-change guards have timeout, cancellation and forced-exit recovery behavior.

Navigation requests include intent and target, not arbitrary platform instructions.
External links and other connections require the corresponding host capability.
Plugin removal retains an unavailable destination with export/recovery and exit actions.

Multiple occurrences of one draft bind to one draft record with an editor lease.
A second view can observe read-only or explicitly take over editing. Do not use
unversioned last-write-wins for simultaneous IME composition.

## 6. State lifecycles

### Connection

`configured -> resolving -> authenticating -> negotiating -> recovering -> ready`

From active states, failures lead to retry-wait, auth-required, incompatible, suspended,
or closed. Retry-wait returns through negotiation/recovery as needed. Cached viewing
is a separate availability flag, not a false ready state. Business mutation is allowed
only when its method-specific readiness contract holds.

### Plugin

`discovered -> resolved -> fetched -> verified -> granted -> activated -> disposed`

Required dependency or ABI failures stop before activation. Partial optional feature
failures remove only affected contributions. Runtime violations can quarantine an
activation; durable data survives for a compatible recovery path.

### Surface

`declared -> attached -> synchronizing -> interactive -> suspended -> disposed`

Sequence gaps return to synchronizing. Suspension revokes active event handles.
Restoration recreates projections from saved state; it never replays UI clicks.
An interactive surface can still display remote-offline state.

### Durable operation

`draft -> persisted -> dispatching -> awaiting-confirmation -> confirmed`

Additional states: blocked, rejected, cancel-requested, cancelled and result-unknown.
Unknown dispatch is reconciled before any unsafe retry. Confirmation means the remote
accepted the operation under the adapter contract, not that the agent task finished.
Task execution has a distinct provider-owned lifecycle.

## 7. Storage and crash consistency

Platform storage offers transactional records/blobs behind scoped handles. Recommended
native implementation is SQLite for records and an owned file store for large blobs.
JS plugins define schemas and migrations. Exact tables are implementation details;
logical collections are connections, manifests/artifacts, cached sources/cursors,
drafts, operations/receipts, navigation, grants and diagnostics.

Atomicity requirements:

- Draft capture plus operation insertion occurs in one local transaction on submit.
- Only the captured draft revision is marked submitted; later typing is retained.
- Operation confirmation, receipt linkage and local message reconciliation commit
  together; a crash may repeat reconciliation, never require a new operation identity.
- Cached snapshot and cursor advance commit together. Otherwise reconnect requests
  a new baseline rather than applying a cursor ahead of stored data.
- Generation pointer changes only after its required artifact set is durable.

Each draft edit receives a monotonic revision. Native editing is immediate; the host
persists via the draft service without requiring a round trip through harness logic.
Display saved only after commit. Before that, sudden process/power loss can lose the
unacknowledged tail. Do not promise preservation of every physically typed keystroke.
Submit waits for captured text/attachments to be durably recorded.

Caches are evictable; unconfirmed operations and unsent drafts are not. Artifact GC
retains active/rollback generations and required recovery dependencies. Storage-full
failure preserves the draft and reports failure to queue; it never shows queued first.

Credentials are stored through platform secret storage; records contain handles.
Capabilities can expire/revoke independently of persisted records. Diagnostic export
excludes secret material and redacts potentially sensitive arguments by default.

## 8. Multi-device behavior

PC and Android may independently observe the same remote session. The remote host is
the shared authority; each device's view/drafts/queue are local unless a future sync
plugin supplies a separate protocol. No central mygo server is required.

An approval response includes remote request identity and freshness/revision. Another
device may answer first; stale responses become already-resolved, not another approval.
Approvals, stop/cancel and permission changes are not generic offline-replay operations.
Their effect depends on current remote state and must be revalidated online.

Operation IDs include a collision-resistant device-origin component. The host still
needs durable deduplication for safe replay. Origin identity is not an authorization
mechanism. A second device does not take over the first device's offline queue merely
because it opens the same conversation.

## 9. DSH integration design

Reuse the pinned DSH client tree only inside its compatible realm. The adapter supplies
bootstrap/module-loader facades, transport hooks, assets, configuration, and source
projections. It exposes DSH settings and session services rather than implementing
them again in Kotlin. Exact supported upstream versions are declared and pinned.

Split compatibility into independently advertised dimensions:

- protocol/session behavior;
- tools and presentation metadata;
- headless services and commands;
- authored native faces;
- mygo semantic pages;
- existing DSH browser-client UI;
- dsh-go-specific native manifest/view bridge.

DSH browser UI needs a real compatible browser host and its client services. It may
not be extracted into arbitrary individual panels. A coarse compatibility page is
acceptable where fine-grained slot extraction is unsupported. Its internal navigation
remains Web-owned; mygo must not also claim native control of that internal history.

Choose an explicit ownership mode per browser compatibility activation:

1. Integrated surface: the connection's headless services remain authoritative, and
   a versioned Web adapter mirrors those services and forwards operations. This is
   possible only for browser plugins whose required API can be supplied by that adapter.
2. Full browser-client profile: the browser Cordis tree owns that connection generation's
   business logic. mygo brokers transport, platform services and navigation at its
   boundary. Do not simultaneously activate another headless session/replay controller
   for the same generation. Native views require exported profile projections; if not
   exported, that generation exposes the compatibility page instead.

Opening the host in an external browser creates an independent remote client and is
reported as such. It is not an integrated surface or a claim of shared local draft state.
This prevents accidental duplicate session managers, replay workers and subscriptions.

dsh-go JSON cards can be translated through a versioned adapter. Interactive panels
need the dsh-go bridge and remote carrier support; native schema compatibility alone
does not supply handlers or channels. This is separate from DSH's own tool presenters.

The generic protocol does not require DSH upstream changes. Preferred improvements
are headless entries, JSON boot manifest and typed multi-renderer Slots. A pinned patch
set can supply missing support; if neither patches nor upstream changes are available,
the deep-headless compatibility tier is unavailable, not theoretically guaranteed.

## 10. ACP and future integrations

ACP adaptation and remote carriage are separate. The official v1 transport reference
defines stdio and permits custom transports; it describes remote HTTP as in development.
Do not assume every ACP agent is an authenticated mobile-accessible server.

For a stdio-only agent, a host-side gateway or SSH process carrier must launch/attach
to the process and relay JSON-RPC with documented authentication and lifecycle. A
client plugin cannot create this server-side capability merely by speaking ACP.
Remote transport variants need their own advertised compatibility profile.

ACP file-system and terminal requests must resolve in the correct execution domain.
If tools operate on a remote workspace, the remote carrier/gateway must provide those
resources under explicit authority. Do not accidentally answer a remote agent's
workspace request using Android device files or the PC client's unrelated directory.

Missing session history, subagent detail, replay, or plugin UI capabilities remain
missing. Project supported ACP events into common profiles without fabricating them.
Preserve unknown extension events in a readable namespaced detail view.

Managed providers later contribute target provisioning/lease operations and then a
normal connection. A local agent core later contributes a local carrier/integration.
Neither requires changing page semantics or making DSH's models universal.

## 11. Reference implementation recommendation

Recommend Kotlin platform hosts with Compose for Android and a Compose Multiplatform
desktop renderer, keeping all harness business logic in JS. This directly extends
the supplied Kotlin/Compose exploration and provides one node interpreter family.
Desktop Compose uses a JVM host; this is not a promise that every element is a native
OS widget. The portable requirement is non-DOM primary presentation plus platform
navigation/input/accessibility integration.

Recommend a replaceable embeddable engine port with QuickJS as the initial reference
candidate, not a selected third-party Kotlin binding. Require job pumping, interrupts,
memory/stack limits, owned module loading, diagnostics and Promise/cancellation bridging.
Do not expose QuickJS OS helpers to downloaded packages or distribute engine bytecode
as a cross-version package format. Cache source/artifacts; bytecode is local and
engine-version-specific if used at all.

Hermes/V8 remain alternatives behind the same port when their footprint, binding or
throughput better meets the required workload. Node-based execution is a separate
profile with a larger system API surface; Node compatibility is not the headless base.

Web embedding is platform-specific: Android WebView; desktop a browser backend behind
the same WebSurfaceHost. Compose does not itself select a universal desktop WebView.
The backend must support clipping, z-order, focus, IME, bridge/origin policy, packaging,
and Linux display-system constraints. A backend unable to compose these correctly
may use a dedicated plugin page/window while retaining the semantic route contract.
Exact library selection remains empirical/dependency due diligence, not an architectural
hole; replacing a port does not alter plugin contracts.

RN remains possible as another native interpreter, but is not required by React plugin
authoring. Tauri/Web-primary and Flutter hosts are also alternative interpreters;
the framework name alone does not prove or disprove responsiveness.

## 12. Closure and residual assumptions

The proposed architecture now defines ownership, identities, execution boundaries,
dependencies, authoring semantics, navigation, state, offline operations, upgrades,
trust and adapter boundaries. Wire operations and failure walkthroughs are specified
in the linked documents. The remaining unknowns have bounded replacement paths:

- Unsupported engine -> replace EnginePort or narrow/publish its execution profile.
- Inseparable DSH DOM dependency -> split/patch the integration or use a Web tier.
- Insufficient native node vocabulary -> add a versioned node or use a Web surface.
- Incompatible desktop embedding -> change backend or use a dedicated content window.
- No remote idempotency -> keep drafts/manual reconciliation, no replay promise.
- No upstream adoption -> maintain a pinned adapter/patch set, not a generic-client redesign.

These paths preserve the product model but can change cost or supported compatibility
tiers. Full dsh-go parity and every third-party plugin are not proven by structural
feasibility. The product baseline inventory must remain visible until each item is
mapped to a supported capability and presentation path.

## Sources

- [DSH pinned module system](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/client/modules/src/client/system.ts).
- [DSH pinned renderer contracts](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/client/ui-slots/src/renderer.ts).
- [ACP transports](https://agentclientprotocol.com/protocol/v1/transports), accessed 2026-11-09.
- [Compose platform entry points](https://kotlinlang.org/docs/multiplatform/compose-multiplatform-entry-points.html), accessed 2026-11-09.
- [Compose Multiplatform project](https://github.com/JetBrains/compose-multiplatform), accessed 2026-11-09.
- [QuickJS embedding API](https://bellard.org/quickjs/quickjs.html), accessed 2026-11-09; supports runtime limits and interrupt hooks, not a complete application sandbox.
- [Remote DOM](https://github.com/Shopify/remote-dom), accessed 2026-11-09; a reference for component/mutation transport, not an existing Compose receiver or a verified drop-in engine runtime.
- [MCP Apps](https://apps.extensions.modelcontextprotocol.io/api/documents/Overview.html), accessed 2026-11-09; a Web UI resource/bridge protocol, not native semantic navigation.

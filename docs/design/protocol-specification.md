# Protocol specification

Status: normative within the proposed reference design; not an implemented API.
Version: design-v1, 2026-11-09. All examples use invented mygo names.

## 1. Protocol layers

Keep three independent layers:

1. Harness protocol between an integration and its remote host.
2. Client service protocol between Cordis domains and platform services.
3. Presentation protocol between descriptor producers, native hosts and Web surfaces.

An adapter translates layer 1. Layers 2 and 3 never embed DSH-specific method names
as universal requirements. Platform transport carries framed data but does not infer
business success from transport delivery.

## 2. Identity and data model

All public IDs are opaque strings with bounded lengths. Separate identities:
installation, device origin, connection, remote authority, workspace, package,
generation, plugin activation, page occurrence, surface, node, subscription, operation.
Neither a display name nor a URL is a durable authority identity.

Persist stable identity and schema version; issue fresh runtime epoch and bridge
channel IDs after recreation. An event address contains connection/generation/epoch/
surface/node/action-handle. A saved route contains no callback or epoch.

Base wire values are finite JSON values. Reject non-finite numbers, cyclic structures,
functions, symbols, engine objects and unbounded payloads. Encode large integers,
timestamps and binary/resource references using documented tagged representations.
Opaque resource handles are scoped to issuer, owner, rights and expiry.

The receiver derives principal identity from the authenticated channel. A `pluginId`
in a payload cannot grant authority. Correlation IDs correlate messages only.

## 3. Envelope and transport

Illustrative envelope:

```ts
interface Envelope {
  protocol: "mygo-client";
  major: 1;
  channel: string;
  epoch: string;
  kind: "request" | "response" | "notification" | "cancel";
  id?: string;
  method?: string;
  payload?: JsonValue;
  error?: BridgeError;
}
```

Before activation, `hello/welcome` negotiate major version, schema/features, platform
capabilities and limits. Unsupported major versions refuse activation; unknown optional
fields are ignored. Required unknown features reject only the relevant activation.
Contract IDs include major versions; additive optional methods do not change majors.

Each runtime runs on a dedicated serial executor. Native UI dispatch stays on its UI
thread. Native storage/network completes asynchronously and schedules JS continuations
on the owning executor. Never synchronously block the UI waiting for JS while JS waits
for UI; do not allow reentrant execution during a bridge callback.

An EnginePort must pump Promise jobs, timers and cancellation, report uncaught errors,
and support execution interruption and memory limits. Interrupting one activation may
invalidate its whole realm. Source maps and structured logs are optional diagnostics,
not privileges to inspect another realm.

Requests may resolve out of order. Notifications have no business acknowledgement.
Per-source/per-surface order is explicit through revisions/sequences. Each request has
a deadline and cancellation handle. Cancellation requests do not imply remote rollback.
Disconnect settles pending bridge calls with an interrupted/unknown outcome as appropriate.

## 4. Platform service contracts

Required application contracts:

- storage: read, transactional compare-and-set/write, enumerate owned records, owned blobs.
- resources: acquire/read/release bounded resource handles; package/owner verification.
- credentials: create/reference/revoke grants and authenticated transport bindings.
- transport: open channel, send, receive, close; separately negotiate tunnel/process roles.
- lifecycle: foreground/background, memory pressure, shutdown hints.
- runtime: activation, disposal, execution supervision and capability queries.
- time/randomness: monotonic deadlines, wall-clock presentation, collision-resistant IDs.

Portable plugin services add sources, navigation, drafts and durable operations.
There is no public bridge method for arbitrary Kotlin reflection, Java class loading,
native library loading, filesystem path access or unscoped HTTP with credentials.

Storage mutation checks both namespace ownership and expected record revision.
Transactions expose only the authorized namespace/record set. Host-owned draft and
operation collections provide dedicated methods rather than raw plugin writes.

## 5. Source subscriptions

`source.open(sourceId, parameters, resumeCursor?)` returns subscription identity and
a baseline at revision R. The producer serializes registration, snapshot read and
notification sequencing on its executor. Later updates begin strictly after R.
The receiver buffers updates arriving before the baseline is installed.

A producer backed by an external stream must construct a consistent cut: attach and
buffer while reading an authoritative snapshot/cursor, then discard events covered by
that cursor. If the source cannot provide such a cut, return reset snapshots; do not
claim lossless deltas. No generic bridge can create missing upstream ordering metadata.

Each update carries source incarnation, base revision, next revision, and replace/patch
payload. A changed incarnation or missing base requires reset. Applied cursor and data
are persisted together. Cache keys include authority, principal, integration schema,
query and any fidelity/projection mode; changing modes does not reuse incompatible data.

`source.close` is idempotent. Late messages are ignored after ownership revocation.
Bound buffers; on overflow require a fresh snapshot instead of retaining infinite deltas.
Source queries carry stable resource identity, not whichever session is currently active.

## 6. Native projection

Snapshot: surface identity, epoch, schema, sequence and complete bounded tree.
Patch: surface identity, epoch, baseSequence, sequence and atomic edit list.

Allowed edits: insert a described subtree, remove a subtree, move a keyed node,
replace properties, and replace a text/content segment. Every edit names a valid
parent/node and respects containment. Receivers validate all edits before commit;
there is no partially applied batch. Parent removal also revokes descendant actions.

Keep at most one unacknowledged projection batch per surface in the reference design.
New state can coalesce behind it. If the producer cannot efficiently derive a patch
from the acknowledged state, send a replacement snapshot. This bounds sequencing
complexity without implying one entire runtime update per frame.

An acknowledgement reports appliedSequence, not tool/task success. A gap, malformed
patch or unsupported required node requests resynchronization with a reason. The
renderer may retain the last frame read-only with a stale indicator.

Collection nodes carry a data source handle, stable key extractor contract, item-view
entry and paging semantics. Window requests include source revision, range or cursor,
and cancellation identity. Item actions name the stable key and revision, never only
an array index. Late windows from old revisions cannot be installed.

Native content vocabulary is deliberately finite: layout stacks/rows, text/rich text,
image/resource, key-value, progress/status, code/diff, collection, form fields and
actions. Domain composites such as Message, ToolCall and AgentLink can be versioned
components layered over these. Arbitrary CSS/layout engines are not transported.

## 7. Actions and user requests

Events carry a unique event ID plus owned action handle, validated arguments, context
revision and optional native editing revision. Handles are bound to method, principal,
connection and resource context; their invocation cannot retarget another resource.
Reject events after handle revocation, capability withdrawal or epoch change.

UI deduplication stops duplicate bridge events but is not server idempotency. A handler
invoking a durable operation supplies an operation ID and observes the coordinator.
UI busy state and remote task running state are distinct.

Approvals and questions expose request identity, source revision, options/schema,
expiration if supplied, and response contract. Responses revalidate current readiness
and request state online. No generic durable queue replays approvals. If another client
resolved it, return stale/already-resolved and refresh; never automatically answer a
new request based on reused visual position.

Native trusted request surfaces display the canonical request, target and scope.
Web plugin buttons may request actions but cannot mint native approval authority.
Required user gestures are attested by the host bridge, not a boolean from plugin JS.

## 8. Draft and submit transaction

`draft.open(key)` returns a record revision, text/attachment state and an editor lease.
Edit batches are local monotonically versioned mutations. `draft.saved(revision)` means
durable storage committed. IME composition can be shown immediately before that.

`operation.captureSubmit(draftKey, draftRevision, intent, contextRevision)` atomically:

1. Validates ownership, editor lease and captured revision.
2. Copies captured content into a stable operation payload and pins attachments.
3. Inserts the operation under a unique ID and declared ordering lane.
4. Marks only that draft revision consumed or creates a successor draft.

A stale capture either submits the explicitly captured snapshot while preserving newer
edits, or asks the user to resolve; it never silently submits different text.
Local acceptance follows commit. Storage failure leaves the draft intact.

Operation worker leases live in durable storage with a monotonic fencing token.
Every local transition checks the token and expected operation revision. Renew using
platform scheduling; a single platform coordinator owns lease arbitration. Do not
use device wall-clock adjustments as the only protection against simultaneous owners.

Local fencing cannot cancel an already-dispatched remote effect. An upgrade or crash
with an in-flight request moves it to result-unknown, and the new worker reconciles by
the original operation ID. Without server idempotency it remains blocked for manual
resolution. A successful local lease takeover alone is not permission to blindly resend.

## 9. Web surface bridge

Web initialization binds content generation, host-issued surface identity, origin,
fresh channel challenge and granted service profiles. The native broker stamps the
principal and connection. Nested iframe messages cannot impersonate the top content.
Dispose/reload revokes the old channel even when the page URL stays the same.

Methods: host-context observe, granted service invoke/observe, navigation request,
resource acquisition, draft binding, state checkpoint and teardown acknowledgement.
Web content cannot read native credential handles or choose arbitrary IPC methods.
Sanitize labels, links and HTML-bearing content according to the receiving renderer.

Host context includes theme, locale, text scale, dimensions/insets, visibility and
allowed presentation modes. Change notifications do not require a reload. Internal
Web navigation is owned by the surface; moving to a native semantic destination uses
the navigation service. Do not maintain two contradictory route stacks.

For MCP Apps, an adapter maps its documented resource/bridge lifecycle onto a bounded
Web surface only when tool/resource access is actually exposed by the integration.
Speaking ACP or DSH does not imply a direct MCP connection or authorize hidden tool calls.

## 10. Errors and recovery

Stable categories: unsupported, incompatible-version, permission-denied, auth-required,
offline, not-ready, stale-context, conflict, cancelled, deadline, resource-exhausted,
invalid-data, internal, and result-unknown. Include retryability only where the owning
operation contract knows it. A generic internal error is not evidence of safe retry.

Errors include correlation and owner context for diagnostics, with no secret literals.
UI shows the actionable scope: surface resync, plugin reactivation, connection recovery,
auth renewal, or whole-realm restart. One malformed Web/native contribution does not
invalidate unrelated connections.

## 11. Resource profiles

Negotiate limits in hello/welcome. Proposed starting design budgets, not performance
claims: 1 MiB maximum regular bridge payload; depth 32 and 4096 nodes per ordinary
surface; one unacknowledged batch per surface; 256 buffered source updates before
reset. Binary resources and very large histories use separate chunked handles.
Each node family may set tighter limits.

Large lists use bounded windows and message bodies use lazy resource/content reads.
Web surfaces are mounted on demand; hidden surfaces may checkpoint and suspend.
These defaults are versioned policy, adjustable without altering business identities.
If a required content shape exceeds limits, use a paged/resource representation or
report incompatibility; never truncate user actions while claiming completion.

## 12. Dependency activation and configuration

Resolve artifact dependencies separately from Cordis service activation dependencies.
Each graph declares required versus optional edges. Required artifact cycles that the
selected module profile cannot materialize reject the graph before evaluation. Mutual
optional services use deferred registration rather than accidental import-order effects.
Activate required service providers before consumers; a required provider loss suspends
dependent contributions. Optional provider loss removes only associated features.

An activation transaction tracks registrations and disposables so failed activation
withdraws its partial contributions. It cannot reverse arbitrary module-body side
effects. Package profiles therefore prohibit business mutations during module evaluation
and activation. A corrupted/failed runtime is terminated, not treated as fully rolled back.

Configuration reads return schema identity/version, effective value, inherited/base
value where meaningful, user override, revision, field writability and secret-reference
metadata. Unsupported schema widgets use a declared custom surface or explain why
editing is unavailable. Do not guess a password control from an arbitrary string field.

Configuration writes include expected revision and explicit changed fields. Conflicts
preserve the draft and return a new authoritative baseline. Only a contract-defined
three-way merge may propose automatic reconciliation. Secret values are write-only or
credential references; neither diagnostic snapshots nor generic forms reveal them.

Effective state can differ from stored configuration until restart or host application.
Return stored/applied/restart-required separately. Schema or grant changes invalidate
the form's action handles and require revalidation before a new save.

## 13. Reactive evaluation and face selection

A descriptor occurrence declares or records the observable sources it reads. Evaluate
against a stable set of source revisions on its owning JS executor. Changes schedule
one coalesced reevaluation; subscriptions belong to the occurrence, and dependencies
no longer used are released after the next committed projection. Rendering cannot
perform business mutations; effects use separately owned lifecycle registrations.

Stable descriptor keys map to stable node identities. Duplicate keys or invalid parent
relationships fail the affected contribution before emitting a patch. An evaluation
error retains the last known frame read-only or presents a host error boundary according
to the Slot contract. It does not leak half-registered actions into an interactive tree.

A Slot declares allowed faces and fallback policy. Eligibility means the contribution
has at least one executable permitted face plus satisfied required contracts. Elect
the contribution using its Slot's priority/composition rules, then select that entry's
face by the host's declared preference, normally native before Web. If the Slot forbids
Web, a Web-only higher-priority entry is ineligible and a native default can win.
Do not choose a different contribution merely because its face is aesthetically preferred.

Ties have deterministic order using declared order and stable contribution identity;
runtime arrival timing must not change the winner. A face failure is recorded for
that activation. Re-election follows explicit failure policy and never bypasses required
behavior. Parent-owned Web fallback is a bounded content surface, not recursive conversion
of every unsupported native child into a separate WebView.

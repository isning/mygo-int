# Consistency and failure analysis

Status: theoretical walkthrough, 2026-11-09. These are reasoning obligations, not
executed tests, model-checker output, benchmarks or a claim of exhaustive proof.

## 1. Invariants

I01. Application bootstrap and recovery do not depend on a remote host.

I02. Every service, resource, action and state source has an owner and connection
authority; active-tab selection never supplies missing authority implicitly.

I03. Incompatible artifact versions do not share mutable module-singleton state.

I04. Business state has one integration owner; renderers consume projections.

I05. Semantic route identity is independent of layout and transient runtime epoch.

I06. An event can execute only under its original live owner/epoch and current grant.

I07. A surface patch applies completely against its declared base or does not apply.

I08. A source's persisted cursor never advances beyond its persisted baseline/data.

I09. Saved/queued status is emitted only after the corresponding durable commit.

I10. Unknown remote mutation outcomes do not cause a new operation identity or unsafe retry.

I11. Local worker fencing prevents conflicting local state transitions, not already-sent
remote effects. Safe resubmission additionally requires host reconciliation/idempotency.

I12. Renderer fallback never changes business authorization or silently discards a
mandatory workflow outcome.

I13. A content/compiler boundary never implicitly serializes closures, hooks, OS handles
or unrestricted platform authority.

I14. Connection generation upgrades do not replay obsolete UI events or auto-submit drafts.

I15. Cache eviction does not erase unconfirmed operations or unsent saved drafts.

I16. A feature's reported capability is no stronger than its least-capable required
platform/carrier/integration/host/grant component.

I17. Local and remote queues, accepted submissions and finished agent tasks remain distinct.

I18. Navigation, disposal and cancellation preserve an escape/recovery path without
claiming to undo completed remote actions.

## 2. Normal end-to-end trace

The application starts bundled services (I01). A chosen connection installs a verified,
compatible graph into its realm (I03), negotiates its remote identity/capabilities (I16),
and recovers source baselines (I08). The integration publishes a conversation page
and current state (I04); the host chooses a compact or expanded layout (I05).

User text edits are native and versioned. Draft storage acknowledges revision R (I09).
Submit captures R and creates operation O transactionally; later typing is a successor
draft. The coordinator dispatches O through the owning adapter, which returns remote
acceptance or an unknown outcome (I10, I17). The source stream correlates O and its
remote message into one logical message. Renderer patches display it atomically (I07).

Tool and subagent updates are separate keyed source items, not unstructured snippets
used to infer control authority. Opening a detail changes navigation, not execution.
An approval response is checked against its current remote request and grant (I06).

## 3. Failure walkthroughs

### F01. No network at cold startup

Bundled recovery/catalog opens. A complete compatible cached generation can expose
cached reading/drafts; missing artifacts expose an explicit unavailable contribution.
No ready or remote-execution status is fabricated. Preserves I01, I09 and I16.

### F02. Two hosts publish the same package name at different versions

Separate realm/module tables materialize their own graph. Serialized navigation/source
contributions are aggregated by connection identity. No singleton lookup is keyed only
by application-wide package name. Preserves I02 and I03.

### F03. A logic package also imports DOM UI

The profile rejects headless evaluation or a source adapter separates the entry. Merely
filtering a rendering face is insufficient. A compatible Web tier is an explicit
alternative; no phantom native support is advertised. Preserves I13 and I16.

### F04. UI patch is dropped or reordered

The next baseSequence mismatches. Receiver does not partially apply it, freezes affected
action handles and requests a snapshot. A new baseline restores interaction. No action
is derived from visual position alone. Preserves I06 and I07.

### F05. Source update arrives during initial snapshot

Producer supplies a serialized cut or buffers events against an authoritative cursor.
Receiver installs baseline before later revisions. A source without ordering metadata
uses reset snapshots rather than promising lossless deltas. Preserves I08 honestly.

### F06. Native input outpaces JS acknowledgement

Acknowledgement names its base edit revision. The host cannot overwrite a later revision
or in-progress IME composition. Submit captures the explicitly selected revision and
preserves successor typing. Preserves I04 and I09.

### F07. Process dies before draft save

Immediate UI text may have been visible but not acknowledged as saved. Recovery restores
the last committed revision; the design explicitly permits loss of unacknowledged tail.
There is no false guarantee of persistence before a storage write. Preserves I09.

### F08. Process dies after operation commit but before send

Recovery finds O persisted and dispatches it when prerequisites are ready. The same ID
and payload are retained. Draft revision R is already linked to O, so recovery does not
create another operation from it. Preserves I09 and I10.

### F09. Host accepts O but receipt is lost

O becomes result-unknown. Reconcile by O's original ID or safely resubmit under durable
host deduplication. A host without that capability blocks automatic retry. A timeout
does not prove rejection. Preserves I10 and I11.

### F10. Host receipt arrives before matching source event

Record receipt and await authoritative projection, or expose an accepted local item
correlated by O. Later source event merges by stable correlation, not text equality.
Remote acceptance is not shown as task completion. Preserves I04 and I17.

### F11. Upgrade interrupts an in-flight operation

Old dispatch ownership is fenced locally. The remote request may still finish. New
generation reconciles its original ID and schema before retrying. If incompatible,
the record stays recoverable/blocked. Preserves I10, I11 and I14.

### F12. Manifest or lazy chunk fetch fails halfway

Candidate generation is not committed; active graph remains intact. Optional missing
offline routes remain unavailable instead of mixing code revisions. In-flight mutation
records do not live in artifact cache. Preserves I03 and I15.

### F13. Host upgrades incompatibly while client is offline

Cached view can open but handshake rejects unsupported live operations. Fetch compatible
artifacts or remain cached/read-only. Rolling back local code is not presented as a
server rollback. Preserves I16.

### F14. Target at a saved URL changes identity

Block cached-state merge and replay until identity is reconciled. Tunnel/path changes
with the same verified authority need not invalidate data. Principal changes partition
cache and grants. Preserves I02, I08 and I10.

### F15. Remote object is deleted while operations are queued

Revalidation rejects/blocks the affected lane. Preserve payload for recovery; do not
recreate a different conversation or retarget another workspace silently. Other lanes
can progress. Preserves I02 and I10.

### F16. Another device answers an approval first

Request revision/identity is no longer current. Return already-resolved, refresh and
remove the actionable card. Do not queue the stale answer or approve a newer card.
Preserves I06 and I17.

### F17. Unsupported face has higher priority

Eligibility removes it before permitted Slot election, leaving a supported lower-priority
entry or contract-specific unsupported view. Required guards live in services, so
renderer fallback cannot weaken them. Preserves I12 and I16.

### F18. Plugin is removed with an open page

Revoke action/bridge ownership, stop observations, retain unavailable route and durable
data. Application-owned recovery allows exit/export. Agent task lifetime is unchanged
unless an explicit supported cancel operation succeeds. Preserves I06, I15 and I18.

### F19. PC detail pane becomes a phone-style pushed page

Reproject the same route and selected resource. Renderer-local focus/scroll restore where
compatible. Business sources remain keyed to resource identity, and history does not
gain a resize entry. Preserves I04 and I05.

### F20. Web surface reload or malicious stale frame

Fresh channel/epoch replaces old bridge; old events fail ownership checks. Web script
gets no native platform IPC or credential access. Same-realm hostile code is not claimed
isolated without the separate sandbox profile. Preserves I06 and I13.

### F21. Storage full or corrupted cache

Failed submit capture does not report queued. Saved drafts/operations are protected
from ordinary cache eviction. Corrupted cached projection resets from authority when
possible; durable data recovery is reported explicitly. Preserves I09 and I15.

### F22. Connection is removed while work is pending

Closing is separate from forgetting configuration or erasing durable data. Pending work
is paused and the UI explains its disposition. Remote tasks continue unless a separate
cancel succeeds. Deletion policy cannot pretend to undo already accepted work.
Preserves I10, I15 and I18.

### F23. ACP agent requests a file read

The adapter resolves its execution-domain contract. Remote workspace handles route to
the host/gateway; local device files require separate grants. No implicit substitution
of Android storage or the desktop client's current directory. Preserves I02 and I16.

### F24. Plugin busy-loops or bridge queue overflows

Engine budget interruption may terminate its realm. UI keeps an explicitly stale frame
and recovery controls. Source overflow resets; rendered projections coalesce. Durable
actions are persisted or explicitly rejected, never silently dropped. Preserves I07,
I09 and I18 subject to the selected engine's enforceable limits.

## 4. Complexity and resource reasoning

Visible native UI should scale with visible items and bounded prefetch, not total
conversation history. A changed message projects its own content rather than the
entire session. Stable keys avoid accidental remounts or action retargeting.
Bridge backlog is bounded by negotiated per-surface/source limits.

Per-connection realms trade memory for compatibility and failure isolation. On-demand
activation and suspension limit active graphs; artifacts remain shared on disk. Web
content is lazy and checkpointable. These strategies bound architecture-level growth
but do not prove particular memory, startup or frame-time targets.

Native composition and Web platform views have focus, clipping and z-order constraints.
Restricting nesting to semantic native containers with Web leaves reduces ambiguity;
it does not eliminate backend-specific integration work.

## 5. What the reasoning establishes

Every identified state has an owner and every cross-boundary mutation has an authority,
identity and failure outcome. No required operation depends on serializing arbitrary
closures, translating arbitrary DOM to native, a mandatory mygo server, universal DSH
models, or unverified upstream features.

Subject to stated runtime/transport assumptions, the reference design has a defined
path for startup, interaction, failure, recovery and evolution. Unsupported upstream
capabilities produce explicit limitations rather than contradictions in the generic
client. This is the completed theoretical argument, not empirical validation.

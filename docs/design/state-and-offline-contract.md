# State and offline contract

Status: capability-dependent offline semantics confirmed, 2026-11-10. Wire/storage
shapes below remain implementation proposals. No persistence/replay is implemented.

## Authority

Remote integrations retain their actual business authority: sessions, workspaces,
agent execution and accepted operations belong to the selected harness. Local
plugins own configuration, declared drafts, navigation state, caches and optional
outboxes. The platform supplies storage/transaction/credential primitives rather
than a universal queue or SessionManager.

Partition remote data by instance and authentication/access view. Permission changes
invalidate or revalidate affected data; an offline cache must not present revoked or
unverifiable data as currently authorized. Retained cache visibility follows the local
trust/retention policy, not the existence of a cached response alone.

## Different operation states

Distinguish local draft, durably queued intent, dispatch in progress, remote accepted,
remote completed, failed/rejected, and unknown outcome. A transport timeout after
sending does not establish rejection. A render acknowledgement is not remote acceptance;
an accepted agent prompt can still produce a later failed execution.

A queue receipt means the local durable store recorded an intent. It cannot be
returned as if the original DSH Remote method already succeeded. Adapt submission UI
and settlement where queueing is introduced; do not let unchanged upstream failure
cleanup silently withdraw a durably queued item or send it again under a new key.

## Replay eligibility

Queue only a method whose integration explicitly establishes idempotency identity,
acceptance/receipt lookup and relevant ordering/expiry rules. Preserve the original
operation identity through retries and process recovery. DSH's generated Remote
metadata does not currently imply generic queue safety; policies may be adapter-side
without inventing an upstream decorator already present in source.

After an unknown outcome, reconcile against authoritative receipts/history where
supported before retrying. Without sufficient remote guarantees, expose uncertainty
and a deliberate recovery action rather than automatic replay. Never re-execute an
expired approval or answer a superseded question from an old queue entry.

Preserve meaningful causal order per owning operation stream. Failure in one instance
must not block all unrelated queues. Logout, permission change, removed workspace and
remote release changes can make a pending intent ineligible; they require revalidation,
not retargeting to another instance/account.

## Durable outbox and recovery

Record the intent atomically before reporting durable queue acceptance. A recovered
outbox must preserve its operation ID, payload version, owner, dependencies and outcome
state. Claiming an item for dispatch needs ownership that survives/reconciles concurrent
consumers so multiple windows do not race to submit it.

Remove or settle only after sufficient remote evidence. Crash between remote acceptance
and local deletion must recover via the same identity and reconciliation. Do not promise
exactly-once transport; the goal is no duplicate business effect under the remote's
actual idempotency guarantee.

Storage transactions and ordered replay do not guarantee that every remote operation
is idempotent. The integration must document the specific operations supported.

## Attachments and streams

A local file selection is a scoped file capability, not a durable remote attachment.
Offline attachment support requires retention of readable local content, upload
identity/receipts, expiry handling and dependency on the final submit. Do not queue
only the text half and claim the attachment is preserved.

Journal/snapshot streams may resume only using supported remote cursors/baselines.
A stale cached projection must be labelled and reconciled; it is not a live stream.
Resource eviction cannot remove pending operation data without a declared failure.

## Process loss and upgrades

Persist declared drafts/outbox/checkpoints; rebuild executable contexts and obtain a
compatible remote baseline. Do not persist arbitrary closures, React state or tokens
that belong to a previous runtime generation. Version migrations must define what
happens to pending intents and their remote compatibility.

A rollback of executable packages is not automatically a rollback of data schemas.
Keep last-known-good configuration and compatible state backups where the migration
policy supports it, and refuse incompatible blind replay after rollback.

## Multi-device boundary

Use remote history and capabilities actually offered by the integration. Local drafts,
reading positions and queue ownership are device-local unless an explicit plugin adds
synchronization and its conflict/duplicate rules. No mandatory central service is
introduced. One device must not assume it owns or can replay another device's intent.

## Future validation

Exercise offline reads, stale access, draft restoration, crash before/after dispatch,
unknown acceptance, repeated identities, receipt reconciliation, expired approval,
attachment dependencies, two windows and migrations. Cite the remote guarantee for
each replay-enabled method. These are implementation gates, not tests run here.

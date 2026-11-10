# Instance and connection model

Status: conceptual boundary confirmed in live discussion, 2026-11-10. Concrete IDs,
service signatures and storage layouts below are implementation proposals. This is
a plugin-domain model, not additional semantics built into the base.

## Ownership

A local composition provides the client shell and chooses harness integrations. An
integration provides access to remote instances. An instance represents a remote
harness, independently of which address currently reaches it. A connection profile
selects carriage and authentication; a live connection is its current execution.
A runtime generation belongs to a connection lifecycle, not to durable instance identity.

Several profiles can reach the same instance through LAN, a tunnel or a gateway.
Merge their instance association only after verifying compatible remote identity or
explicit user confirmation. Names, equal filesystem paths and matching session IDs
are insufficient. A provider without verifiable remote identity must expose that
uncertainty rather than synthesize proof from the current URL.

Local references allow saved configuration before the remote is reachable. They are
not a claim that the remote has supplied a globally stable identity. Replacing a
server at the same address must not silently inherit the old server's credentials
or private cache; an identity mismatch requires an explicit reconciliation path.

## Distinct identity dimensions

Keep these dimensions separate even if one implementation stores them together:

- Local instance reference: stable handle for the locally configured remote target.
- Remote identity evidence: what a specific integration can establish about the
  server, its persistence and its trust relationship. Not assumed to exist in DSH.
- Connection profile: transport route, endpoint and authentication selection.
- Authentication view: authenticated principal and access context for remote data.
- Live connection generation: current handshake/recovery lifetime and cancellation.
- Remote release/graph revision: executable compatibility and module graph state.
- Workspace/session reference: remote identifier qualified by instance and relevant
  authentication view. Remote path strings are not globally unique identifiers.

The exact DSH mapping must preserve original session/workspace IDs and access
behavior. Do not rename them on the wire or rewrite the original state manager.
Adapters supply qualification at the application boundary.

## Cache and state ownership

Configuration and local UI state have explicit composition/instance ownership.
Remote data must additionally be partitioned by authenticated identity and applicable
access context. A changed permission projection invalidates or revalidates affected
cached data; it must not leave revoked data visible merely because the instance ID
is unchanged. Expired credentials do not automatically erase unrelated local settings.

Read positions and unsent drafts can be device-local plugin state. Their retention,
protection and logout behavior belong to the state/trust decisions; this model does
not infer a new cross-device sync requirement. Selected attachments are local file
capabilities, not portable paths automatically meaningful on another device.

## Connection and view lifecycle

A view refers to an instance/authentication view; it does not own the sole existence
of the instance. Switching views must preserve other active tasks, pages and connections.
The navigation plugin can change the selected instance independently per window.
A connection manager plugin can own shared connections through explicit consumers;
window closure releases that consumer rather than indiscriminately disconnecting
other windows. The eventual platform model decides whether processes share a manager.

Reconnection replaces transport generations while preserving the configured instance
association. Endpoint changes and route switching are not evidence that existing
RPCs can be replayed. Keep original DSH recovery authoritative. Multi-route failover
requires identity verification, compatible authentication and stream recovery; generic
retrying of writes is not authorized by this identity model.

Two simultaneous routes may each have a connection while referring to the same
instance. This model does not require pooling or automatic failover. A provider
must prevent concurrent retry policies from duplicating a user operation.

## Scenario checks

- Same DSH, LAN and tunnel: associate profiles only after verification/confirmation;
  reuse remote identity without leaking one route's credentials into another origin.
- Same hostname, replaced server: report the identity mismatch before reusing private
  state; do not treat an unchanged URL as continuity proof.
- Two servers called “Work”: retain distinct instance references and qualify sessions.
- One server, two accounts: retain separate authentication views and caches, even if
  session IDs happen to match.
- Host restart: preserve instance association; renew admission as needed, then follow
  the upstream release/graph and connection recovery protocols.
- Two windows: independent current selections; close one without destroying the other's
  active connection. No unspecified cross-process sharing is assumed.
- Two devices: each device can have local references to the same remote; only capabilities
  actually supplied by DSH or an explicit synchronization plugin are shared.

## Consequences for subsequent decisions

Service scopes can follow these ownership relationships, but do not provide module,
DOM, CSS or security isolation. The trust/runtime decisions choose enforcement.
Persistence chooses retention and migrations. Delivery chooses compatible versions.
None of those choices may collapse instance, URL, authenticated user and JS realm
back into one overloaded identifier.

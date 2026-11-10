# Trust and execution boundaries

Status: isolation and explicit-grant policy confirmed, 2026-11-10. Operational
mechanisms below are design obligations/proposals. This document does not
select an engine, browser backend or OS process architecture.

## Established constraints

Trusted local plugins can replace the full client composition. Remote-supplied
contributions default to their owning instance and do not automatically gain global
Root replacement. Cordis scopes represent service/lifecycle organization, not a
security sandbox. A client package supplied by a remote executes on the device.

## Confirmed authority boundary

Keep the trusted local composition and instance-provided executable code in distinct
authority domains. A remote compatibility environment retains its required browser,
React, Cordis and Slot services, but does not inherit unrestricted native IPC, local
filesystem access, credential storage, other instance connections or application Root.
Ordinary browser networking and same-origin permissions still apply; do not advertise
a complete arbitrary-network firewall merely because the native bridge is restricted.

An execution environment can correspond to a browser document/origin, engine or
process as appropriate to the selected carrier. A different JS realm alone does not
prove isolation when host objects, credentials or native bridges remain shared.
Conversely, the policy does not require a separate OS process for every instance.
Execution placement is a later decision constrained by these required guarantees.

## Capability carriage

A local plugin owning a capability chooses whether and how to expose it to an
instance environment. The bridge binds each request to its owning environment,
instance/authentication view, allowed operation and lifetime. The receiver derives
that binding from the mounted channel; it must not trust a caller-supplied instance
ID as proof of access. Avoid exposing a generic invoke-any-local-service endpoint.

Credentials remain with the responsible local/platform provider whenever possible.
A browser authentication flow may require origin-scoped cookies; that is an explicit
credential surface, not a reason to serialize all stored secrets into plugin props.
Bridge and network grants have separate audit and revocation paths.

Granting a filesystem handle, terminal channel or notification action exposes a
specific operation/resource, not the full service registry. Bound handles expire on
unmount, revocation or authentication changes as appropriate. Pending operations must
receive cancellation or a clear failure. Capability revocation cannot erase information
already read, undo accepted remote operations or guarantee termination of arbitrary
JS without runtime support.

## Legacy plugin consequences

A legacy DSH plugin may manipulate its own browser document and instance Root, rely
on CSS globals or call direct network APIs. Preserve those within its compatibility
environment rather than loading its arbitrary DOM code into the global native shell.
Plugins within the same original Host environment retain their original mutual
visibility unless a stronger supported boundary is deliberately introduced.

This is instance-level isolation, not a promise of per-plugin sandboxing. Host
backends retain the permissions granted by DSH on the remote machine; a mygo client
sandbox cannot reduce those already-held Host privileges.

A plugin requiring unrestricted application-native access cannot silently obtain it
through legacy compatibility. It requires a reviewed local installation/grant or is
reported as incompatible with that profile. Local installation is a separate trust
act; a remote package cannot promote itself by setting metadata.

## Updates and withdrawal

New executable revisions must be tied to their source and compatibility graph.
An update does not automatically widen granted capabilities. Package provenance,
integrity and authentication support trust decisions, but are not proof of safe code.
The distribution decision must choose how revisions and grants are reviewed.

On instance removal, revoke its bridges and dispose its owned contributions without
removing unrelated local plugins. On logout or access reduction, stop affected remote
operations and revalidate private caches. Physical disconnect is not automatically
uninstallation or permission revocation; recovery behavior must remain explicit.

## Evidence required during implementation

Attempt cross-instance credential/service access, native bridge escalation, forged
owner identifiers and unauthorized Root contributions. Verify navigation to another
origin cannot retain a privileged bridge, and revocation closes retained handles.
Also verify legitimate original plugin behavior still works in the compatibility
environment. These are future checks, not tests run in this planning session.

The browser/engine policy must include CPU/memory exhaustion and failure containment
limits that its chosen implementation actually enforces; no absolute availability
or crash-containment guarantee is made from Cordis disposal alone.

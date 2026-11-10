# Execution provider extension boundaries

Status: separated provider/integration/carrier roles confirmed, 2026-11-10. No cloud provider,
managed service or embedded agent core is selected or implemented.

## Distinct responsibilities

A provider owns environment discovery/provisioning and its lifecycle. An integration
understands the harness protocol, domain model and UI. A carrier establishes network
reachability/carriage. A platform adapter exposes device primitives. A package may
implement several roles, but their authority and failure behavior remain separate.

An instance represents a remote harness target, not a cloud lease or a specific
transport. A provider can expose one or more targets. Creating an environment may
produce a connection profile; opening an existing profile need not provision anything.

## User-owned machine

A configured PC is an existing execution environment. Reconnecting does not grant
permission to start arbitrary software, reconfigure the machine or replace its harness.
A connection address does not establish ownership. Credentials and Host admission
remain with the chosen explicit integration/carrier.

## Managed isolated environment

Provisioning can expose discover/create/status/renew/release operations and resource,
expiry and cost information where the actual provider supplies them. These are
capabilities, not mandatory universal API methods or invented billing guarantees.
Long-running creation needs progress/cancellation and authoritative outcome lookup
where supported. Unknown create outcomes must not blindly create another paid resource.

Lease expiry or environment deletion invalidates affected connection capabilities;
other providers and local composition remain intact. Keep shutdown, release, deletion
and loss of network connectivity distinct. Define which resources are user-owned,
provider-owned or attached before exposing lifecycle actions.

The local composition controls allowed provisioning/lifecycle operations and user
intent. A remote-supplied UI cannot obtain arbitrary account credentials or permission
to create/release environments merely by naming a provider service.

## Future embedded core

An embedded agent is an explicit local execution provider/integration. It declares
local process, filesystem, tool and credential authority through platform capabilities.
It is not implicitly spawned by a remote plugin. Its state and model can differ from
DSH; shared presentation/capabilities are optional interfaces.

Keeping this extension possible does not require implementing the core now or turning
the minimal base into an agent runtime. Local execution also does not remove isolation
requirements for downloaded code or grant global platform access to its UI.

## Notifications and resource interfaces

A provider can cooperate with notification/file/terminal plugins through explicit
capabilities. Terminal and file operations identify the executing environment. Out-of-app
notifications require an actual delivery mechanism and authentication; a visible
session or persistent connection is not a suspended-process delivery guarantee.

No central mygo server is required. A selected managed platform or push provider may
operate its own service without making that service a mandatory hub for all instances.

## Validation obligations

Test capability absence, provisioning failures/unknown outcomes, lease expiry, endpoint
change, account revocation, ownership-qualified release and local-execution refusal
without grants. Exact scenarios depend on the selected provider; none were run here.

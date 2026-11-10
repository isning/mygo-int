# Harness integration contract

Status: independent integrations with optional shared capabilities confirmed,
2026-11-10. Concrete additional providers and carrier protocols are not selected.

## DSH baseline

Reuse the official React/Cordis client, generated Remote, session/workspace services,
module loader and Slot/UI behavior. The integration adapts bootstrap, admission,
resources and connection carriage. Do not run a second competing session or submit
controller alongside the original merely to expose a generic-looking API.

The optional thin remote adapter reuses Host capabilities without modifying core.
An unmodified-Host path declares its version and compatibility profile; original page
forwarding and independently booted client composition remain distinct guarantees.
Client-side unified Slot patches are tracked separately from remote adapter behavior.

## Independent provider model

A harness integration is a local plugin or cooperating plugin set. It can provide
its own domain services, protocol bindings, state and UI through Cordis and unified
Slots. It need not emulate DSH's private Session/Workspace schema or mount a counterfeit
DSH generated Remote namespace.

Shared contracts are optional interfaces for actual common capabilities: for example,
a resource reader, selected file/diff presentation or a terminal channel. Declare
semantics, ownership, errors, cancellation and supported operations. Do not normalize
different harness concepts into one universal shape merely because labels coincide.

## ACP and remote carriage

Treat ACP protocol support, network reachability and remote execution as separate
responsibilities. A local integration uses an explicit carrier/gateway when the
actual agent connection requires one. It must identify which machine owns the agent
process, terminal, filesystem, credentials and process lifetime; calling a protocol
remote does not relocate those capabilities automatically.

Report negotiated/actual capabilities rather than infer file or terminal support
from protocol identity alone. Unsupported operations remain unsupported or use an
explicit cooperating provider; the integration must not silently execute a command
on the user's device instead of the intended remote machine.

## State and UI

An integration qualifies remote resources by instance/authentication view and uses
its real recovery/receipt semantics. It can reuse compatible presentation/data plugins
or supply its own. Cross-environment UI uses declared state/service bridges. Native
faces and old Web contributions share the Slot contract but not arbitrary live refs.

Every public mount or method retains source and owning instance authorization.
An integration does not acquire global Root replacement merely because its Host
provides UI code. Local trusted composition decides which global features to compose.

## Compatibility claims

Distinguish official DSH Web plugin compatibility, deliberately native-capable mygo
faces, dsh-go-specific schemas/bridges and another integration's own plugin system.
DSH compatibility does not automatically implement dsh-go's bridge vocabulary, and
neither implies arbitrary ACP agent UI compatibility.

Publish versions and tested profiles, not a blanket “supports all plugins” claim.
Keep a maintained client patch boundary if upstream has not adopted native faces.
Do not replace an unavailable independent profile with a remote page without telling
the application composition that its capabilities changed.

## Future validation

Verify DSH baseline boot/behavior, additional provider ownership and negotiated features,
file/diff/terminal execution location, cancellation, recovery and unsupported operations.
Use original/split-plugin fixtures where licensed and appropriate. No new harness
adapter, server or agent core was implemented during this planning session.

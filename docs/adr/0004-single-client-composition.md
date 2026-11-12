# One client composition with owner-scoped management

Status: accepted, 2026-11-11.

The accepted single-client specification replaces the earlier two-root startup
assembly. mygo supplies one client Cordis Context and the original DSH Loader.
Local entries and unchanged instance-delivered client halves participate in that
runtime, using original services, React singletons, Slots, Remote and event APIs.
The Host continues to own a separate server-side runtime. No plugin rewrite,
second SDK or serialized remote UI protocol is required by this integration.

Local plugins contribute navigation, Settings and a unified Plugins page through
original Slots. The default path has no outer shell or independently mounted
floating settings application. There is no alternative product composition or
startup fallback.

The Host manifest controls only its managed client entries. Configured local
module identities are protected before reconciliation; conflicting graphs fail
with diagnostics while unrelated entries remain intact. Package identity,
concrete Entry identity and owner identity serve different purposes.

Unified presentation does not unify mutation authority. LOCAL actions use the
device composition adapter; INSTANCE CLIENT actions expose the original managed
roster's supported lifecycle; HOST actions explicitly invoke the connected
Host's original controller and permissions. Local enablement and configuration
do not implicitly issue Host management writes. Trusted plugin code retains its
declared RPC behavior; ownership attribution is not a security sandbox.

The persistence, runtime-first commit, rollback and admission decisions in
[ADR 0003](0003-local-management-and-device-startup-overlays.md) remain in force.
Invalid saved overrides expose recovery to the operator baseline rather than
silently reinterpreting entries.

Instance routing and switching are defined by [ADR 0007](0007-explicit-instance-routes.md)
and [ADR 0008](0008-zero-instance-base-and-dsh-adapter-seams.md). Native renderers
and non-owner browser provisioning remain future work. Original browser authority
from [ADR 0002](0002-dsh-browser-authority-and-permissions.md) remains unchanged.

See the [specification](../specs/mygo-single-client-composition.md) and
[integrated validation](../upstream/dsh-default-client.md).

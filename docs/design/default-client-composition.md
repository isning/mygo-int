# Replaceable client composition

Status: original-service reuse and replaceable local composition confirmed, 2026-11-10.
Existing confirmed constraints remain authoritative; this is not application code.

## Base and startup

The base starts Cordis/runtime/platform mechanisms and evaluates a local startup
configuration. The configuration selects trusted local entries and their dependency
versions/configuration. It does not hard-code chat, navigation, instances, DSH or an
offline queue. A bundled default is one configuration, replaceable by another.

Preserve DSH's boot/entry/platform recovery layers. Do not add an invented mandatory
recovery application or assume arbitrary absent product services are base failures.
The selected composition declares its required services/entries and receives useful
activation diagnostics when those requirements cannot be met.

## Default plugin responsibilities

The default composition can supply these roles through one or more local plugins;
this is not a mandatory package count or fixed public API list:

- Application Root and navigation: global shell, instance selection, destinations
  and presentation policy under the unified Slot contract.
- Instance catalog and connection ownership: qualified targets/profiles/authentication
  views and consumers, independently of the currently visible view.
- DSH integration: preserved official bootstrap/modules/Remote/state/UI plus the
  minimum transport/resource/admission adaptations.
- Presentation/renderer adapters: original React DOM and unified Slot native-face
  machinery when its selected platform backend is available.
- State/delivery/diagnostics policy: local configuration/cache/drafts, capability-safe
  outboxes where declared, coherent package selection and owner-attributed diagnostics.
- Platform adapters: scoped primitive storage/credentials/transport/mounts/OS services.

Preserve the original official client services and UI instead of creating parallel
session/settings managers. A local shell may mount an instance's original-compatible
Root in its authorized environment. That nested Root is not a grant to replace the
trusted application Root. Remote code is not evaluated globally merely to avoid
writing an adapter.

## Public service boundaries

Use explicit Cordis service injection and typed interfaces. Distinguish package
availability from service readiness. Declare which plugin owns a service and its
lifetime; withdrawal must dispose subscribers/handles through the owning lifecycle.
Do not use a global service locator accessible from every remote environment.

DSH private services keep their actual contracts. Another integration can publish
its own domain services. Shared functionality becomes an opt-in capability interface
with supported operations, authentication/instance ownership, errors, cancellation,
versions and state authority. Missing a shared capability is not proof that a remote
is disconnected or that its private services are invalid.

Cross-environment consumers use scoped proxies and serializable data/capability
handles, not shared component objects or unrestricted ctx references. Keep business
operation receipts distinct from IPC/render acknowledgements.

## Replacement and failure

Replacing a local plugin must preserve or explicitly migrate the contracts required
by its dependents. Same service name alone does not prove semantic compatibility.
Replacing navigation/layout must not replace the authoritative remote state model.
A failed optional UI entry should not destroy unrelated instances.

Local composition updates are explicit coherent selections, not remote graph changes.
A remote refresh removes only its owned contributions. Version or permission conflicts
produce a diagnosis/unsupported state rather than last-loaded-wins behavior.

## Validation obligations

Boot the original-compatible default and an intentionally changed local composition;
verify required dependencies, Root authority, original client behavior and scoped
communication. Remove a remote graph without removing local entries; replace a local
renderer/navigation plugin without duplicating session submissions. No such tests
have been executed during planning.

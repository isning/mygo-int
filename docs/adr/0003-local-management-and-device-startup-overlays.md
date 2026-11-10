# Local management and device startup overlays

Status: accepted for the current single-carrier implementation, 2026-11-11.

Local plugin management operates over the original local Cordis Loader tree.
The connected Host's plugin manager remains a different authority. Reusing its
UI does not authorize routing local actions to its Remote controller.

Use three replaceable local plugin roles: composition/lifecycle management,
instance catalog, and management presentation. The presentation adapts the
pinned original DSH Settings panel, manager rows and public form primitives.
It uses ordinary React, SlotCore and Loader identities. The base offers startup
middleware/error notification and platform modules; it owns no product page.

Persist accepted local config/enablement overrides in browser device storage,
scoped by presentation origin and configured instance/authentication-view ids.
Keep the operator startup JSON as the explicit base, and bind overrides to its
exact composition. Do not implement another configuration schema for plugins:
original Loader and plugin activation validate their JSON config. Reconcile
runtime first, commit accepted desired state second, and report rollback and
startup recovery separately from ACTIVE. Protect the management service entries
against accidental self-disable; operator configuration can replace them.

Gate local mutations with original DSH browser admission through a fixed-target
read-only probe. Do not add anonymous server writes, filesystem paths, launcher
cookie fallbacks, Host Origin trust as authentication, or local actions on the
Host's generated Remote. Device storage is not an isolation boundary against
trusted same-realm code or the browser owner.

Keep explicit stable instance/profile ids and authentication views in a durable
catalog without credentials. Only the operator-bound carrier is connectable.
Catalog selection of an external target is a desired preference, shown as
unavailable while the actual connected outlet remains unchanged. No catalog
address is used as a proxy target. Concurrent multi-instance connections and
independent authority domains remain unimplemented.

See [implementation and validation](../upstream/dsh-local-management.md).

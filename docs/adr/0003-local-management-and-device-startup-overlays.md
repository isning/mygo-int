# Local management and startup overlays

Status: accepted, amended by ADRs 0007–0009, 2026-11-12.

Local plugin management operates on the original local Cordis Loader. The
connected Host's plugin manager is a separate authority; reusing its UI never
routes local actions to its Remote controller.

Mygo has replaceable composition, instance-catalog and management-presentation
plugins. Presentation reuses the pinned DSH Settings and Plugins primitives.
The base provides startup middleware, platform modules and recovery only.

Accepted local enablement and configuration overrides live in mygo's private
server-side configuration and bind to the exact operator composition. Runtime
activation is validated before desired state is committed. Failed changes roll
back and surface diagnostics. Protected management entries can only be replaced
through the operator composition.

Mygo's future outer authority governs mygo-local mutations. DSH admission is
specific to an explicit instance route and does not authorize local management.
Instance catalogs and credentials follow ADRs 0007 and 0008: all profiles are
equal, use explicit reverse-proxy routes and have no fixed carrier or seed.

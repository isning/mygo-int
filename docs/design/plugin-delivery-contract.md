# Plugin delivery and update contract

Status: fixed local composition and instance-owned remote revisions confirmed,
2026-11-10. Package tooling and exact manifest signatures remain proposals.

## Separate authorities

Local startup configuration selects the complete trusted local composition. Pin its
resolvable package graph, configuration and relevant ABI/framework versions. Local
installation/upgrade is an explicit local choice, not a remote graph instruction.
A default bundled composition is replaceable configuration, not a fixed feature core.

Instance-provided client entries follow their Host's coherent release/graph/revision
and existing loader update lifecycle. They cannot replace the application configuration,
install global plugins or expand platform grants. A Host update can invalidate its
compatibility environment without authorizing a global client update.

## Resolution and integrity

Preserve existing DSH module IDs, package dependency metadata, service injection and
framework singletons within a compatible module domain. Record provenance separately
from execution/ownership. Equal IDs do not imply equivalent code; byte deduplication
and module-object sharing are different operations.

Resolve required dependencies and verify compatibility before activating a new local
composition. Keep artifacts and resources required by that selected graph coherently
available. A cache hit or version label is not provenance/integrity proof. An upstream
revision field is not assumed to be a cryptographic content hash.

An optional installation envelope can record source, integrity, grants and compatibility
without requiring old DSH plugin sources to import a new SDK. No central marketplace
or globally unique plugin registry is required by this architecture.

## Installation and activation

Separate acquisition, validation, staging and activation. A partial download must not
become the current complete configuration. For local updates, switch a coherent
manifest/configuration after staging and keep the previous complete selection for
recovery. Activation follows Cordis dependency/lifecycle behavior; errors are attributed
to entries and their owning graph rather than hidden by an all-purpose retry loop.

Native executable components belong to platform releases/approved platform extension
mechanisms. Downloaded JS/face packages cannot install arbitrary native machine code
through a UI registration. Changes to the native component vocabulary use versioned
capabilities and compatible platform delivery.

## Remote graph changes

Reuse upstream serial graph reconciliation, revision handling, owned style cleanup,
fiber teardown and release gating. Required old-plugin behavior remains intact. A new
native face uses the unified Slot extension; an unmodified Host is not assumed to know
new face metadata or perform renderer-specific graph filtering.

Remote code changes stay within the authorized environment. A changed package does
not silently widen capabilities. If an updated graph requires unavailable platform
features or incompatible singleton versions, report that state rather than mix
incompatible artifacts or load them into the trusted local domain.

## Rollback and recovery

Retain a known-complete prior local composition and startup diagnostics. Reverting
packages is only safe with compatible configuration/data schemas. Do not blindly
roll back migrated data or reuse a pending outbox under an incompatible integration.
User-owned state and package cache have separate retention policies.

Remote release recovery follows the Host's actual supported graph; a client cannot
force the Host to run an old backend by selecting an old cached client bundle. Cached
offline boot must expose its release identity and limitations rather than feign a
current authenticated connection.

Recovery follows DSH's layered boot/entry/platform policy. No automatic disabling,
fixed recovery application or silent uninstall behavior is introduced by this document.

## Diagnostics

Associate errors with composition, source/owner, instance/authentication view, remote
release/graph, module ID/revision, face, mount generation and carrier/backend as relevant.
Avoid logging credentials or private payloads. Distinguish acquisition, integrity,
compatibility, service activation, rendering, authorization and transport failures.

## Future validation

Check partial/interrupted acquisition, wrong dependency/React version, conflicting
modules, local update/removal, remote graph refresh, failed migration, recovery to a
complete compatible selection and unchanged grants. Include a legacy split plugin
and multi-face Slot fixture. No package manager or update process is implemented.

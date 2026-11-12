# Instance plugins load the official client composition

Status: accepted, amended by ADRs 0006, 0008 and 0009, 2026-11-12.

Mygo's base creates one Cordis Context and original Loader. It starts the local
composition without a DSH or renderer. A selected instance then supplies its
official client manifest to that existing Loader; mygo does not keep a duplicate
chat, session or settings roster.

The `dsh-instance` bootstrap plugin attaches the original module facade,
transport, `ClientEntries` reconciliation, activation audit and renderer mount.
Local module identities are reserved before remote reconciliation. Original
React, Cordis and UI modules remain shared platform libraries.

Overrides are descriptor-level application modes defined by ADR 0006. An override
replaces its explicit remote client-module target before the module system captures
its table; it is not a central override plugin or a second Loader entry. The
default composition currently declares no override.

The base exposes its root, container, startup configuration, platform modules and
local ownership predicate through `clientHost`. An integration plugin may supply
`clientRuntime` prepare, mount, recovery and disposal hooks. These are mygo
composition seams, not additions to the upstream Cordis API.

Local configuration remains in mygo. Host status/bootstrap and credential
carriage follow ADRs 0002, 0007 and 0008. Trimming the local roster never mutates
the Host's plugin graph or settings.

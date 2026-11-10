# Distribution and maintenance policy

Status: explicit compatibility matrix and deferred channel choices confirmed, 2026-11-10. No public license,
business model, app store, release channel or support period is selected.

## Compatibility matrix

Track the pinned DSH release/commit, generated Remote and module ABI, React/renderers,
Slot extension revision, plugin package graph, platform carrier/browser/native backend
and required capability set. A matrix entry distinguishes source-supported design,
implemented adaptation, runtime verification and known unsupported combinations.

Do not advertise all upstream/community plugins or platforms based on source reuse
alone. A Web-compatible plugin need not support a native face, and an available native
backend need not support every embedding shape. Describe those limits explicitly.

## Reproducibility and source ownership

Record retained upstream paths and notices, generated artifacts, package sources,
versions and the maintained delta. Keep the React extraction and unified Slot patches
reviewable so an upstream change can be assessed against actual affected consumers.

Before copying/distributing source or binaries, inspect governing licenses and
redistribution obligations for those exact artifacts. Do not infer permission from
an adjacent SDK's license or another repository's README. This document is a process
obligation, not legal clearance or a licensing conclusion.

## Channels and platform delivery

The selected platform carrier can use its appropriate package/channel. Do not select
a store or require publisher accounts merely to finish architecture. Native toolkit,
signing/update mechanism and OS/browser minimums are chosen when the relevant platform
implementation is undertaken; PC native implementation is explicitly deferred.

Local plugin choices remain pinned and explicit. Platform updates and remote Host
graph updates have different authorities. An app updater must not become a channel
for arbitrary remote plugins to install native code or widen grants.

Before an actual release, verify the selected channel's then-current requirements
and plugin execution/update policy. No store-compliance claim is made during planning.

## Offline and recovery materials

Retain coherent local composition manifests and all declared artifacts/resources
needed by supported offline profiles, with integrity/provenance and known compatibility.
A cached executable set cannot supply current Host authority or remote capabilities
while disconnected. State migrations constrain rollback independently of package cache.

Preserve source/version diagnostics and a known complete recovery selection. Exact
retention size and update policies belong to the selected storage/distribution
implementation, rather than invented limits in this architecture.

## Maintenance responsibilities

An upstream change requires reviewing affected module/Remote/Slot/service/resource
contracts and their consumers. A platform browser update requires reassessing relevant
backend compatibility. Record unverified combinations rather than implying support
from a successful build on another OS.

The future verification plan owns evidence gates; this document defines what a
compatibility/release claim must identify. No package, channel or support promise
has been published by this planning work.

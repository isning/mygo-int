# Platform-specific carrier contract

Status: platform-specific native support and isolated module domains confirmed,
2026-11-10. Both React and native presentation belong to the complete target.
Implementation starts with the reused React client; PC native implementation is
explicitly deferred. SwiftUI is a later candidate, not a selected dependency.
This document specifies shared obligations; concrete API signatures are proposals.

## Common contract, independent implementations

Share Cordis/client plugin code, original module/Remote contracts, unified Slot faces,
semantic component declarations and authorized bridge behavior. Implement platform
mechanisms through independent carriers. Do not mandate one Compose, RN or Tauri
framework for every target. The default client composition is replaceable everywhere.

A carrier owns application/process lifecycle, OS integration and rendering primitives.
A renderer owns component reconciliation and maps face output to those primitives.
A navigation plugin owns presentation policy. These roles can be packaged together
but must remain distinguishable in the public contract and diagnostics.

Tauri is a candidate carrier rather than the base's plugin framework. A Tauri plugin
supplies OS/platform functions; a Cordis plugin supplies client composition behavior.
A backend bridge can connect them without conflating package formats or lifecycles.

## Confirmed implementation order

Extract and compose the official React client first. Preserve unified Slot faces and
platform ports so native backends can be added without changing the plugin model.
Do not block that work on PC native toolkit or browser-carrier selection. PC native
support comes later in implementation order; SwiftUI is a candidate for a suitable
Apple-platform backend. Windows/Linux backends are not selected by mentioning SwiftUI.
Tauri remains an example carrier rather than a mandatory stack across targets.

This is dependency/order planning, not an MVP or release scope split. It does not
remove either presentation profile or any previously selected target platform.

## Runtime and module domain port

The platform creates/retains/disposes executable contexts and reports lifecycle and
failures. Each context has a coherent module table and framework singleton binding.
The local composition and instance/authentication views use distinct authority domains.
Immutable package bytes may be cached independently of evaluated module objects.

Preserve original official browser bootstrap and generated Remote inside compatible
contexts. Native faces execute in a matching React environment, potentially the same
browser engine with a native host renderer. Headless hosting is optional and requires
its own compatibility evidence, not a prerequisite for extraction.

The platform must declare its module loading, browser profiles/origins, cookie/storage
partitioning, debug hooks and cancellation guarantees. Separate JS contexts with a
shared privileged host object do not satisfy the trust contract.

## Surface port

Provide mount, coherent update, visibility, placement, focus and unmount operations
for declared render profiles. Bind mount handles to an execution owner and generation.
Report renderer requirements and unsupported operations before mounting when possible.
The base sees surfaces and capabilities, not sessions, routes, Page or Section.

A native receiver maps supported host components to precompiled platform components;
no remote Kotlin/Rust/OS-native code is downloaded through the Slot protocol. Native
and Web faces can use different layouts under one registration. Cross-independent
Web surfaces use explicit entries/model bridges rather than serialized closures.

Expose actual embedding constraints: supported native-parent/Web-child combinations,
clipping/z-order, transforms, viewport/scroll ownership, focus, accessibility and IME.
A backend cannot claim arbitrary nesting because it can open a second browser window.
Unsupported combinations need a declared alternative or unavailable state.

## Capability and event port

Bind channels to actual mounted origins/documents/owners and granted operations.
Validate command arguments on the native side. Do not expose unrestricted service
registry lookup, filesystem paths, arbitrary URL forwarding or create-privileged-view
commands to instance code. Revoke handles on relevant unmount/navigation/authorization
changes and reject old-generation events.

Transport cancellation, render acknowledgements and remote business receipts differ.
A click acknowledged by the native renderer does not prove that DSH accepted an
operation. Reconnection and retry policies remain with the owning DSH/integration
services rather than being duplicated by the carrier.

## Platform services

Expose narrow primitives for storage/transactions, credential operations, cancellable
transport, file selection/handles, clipboard, notifications, window/lifecycle signals
and diagnostics as supported. Implementations report versioned capabilities. A local
plugin may wrap them into richer services; a remote plugin receives only explicit grants.

The carrier must not own an instance catalog, universal session manager, queue replay,
page vocabulary or package update policy. Providing durable storage does not make
the carrier responsible for business migrations or optimistic operation settlement.

OS notification delivery while the application is suspended needs an actual provider
and platform delivery path. A live WebSocket inside a WebView is not a background
delivery guarantee. Credentials and notifications must remain bound to the selected
instance/authentication view.

## Backend selection records

For each platform/backend, record implementation/version, browser engine, native
component receiver, permitted embedding shapes, authority boundaries, storage profile
behavior, deployment prerequisites and known limits. Implementations need not have
the same internal structure, but must pass the same semantic contract where supported.

The Tauri evidence is in [carrier research](../research/tauri-carrier-facts.md). It
establishes browser and command mechanisms, not native component/embedding conformance.
Android can use a platform-native host/toolkit without committing desktop to it.
Windows, macOS and Linux can share carrier code where appropriate while their native
backends and Web engines retain platform-specific behavior.

## Validation gates

During implementation, prove coherent bootstrap/module identity, original-plugin
behavior, data/credential partitioning, bridge authorization, native/Web composition,
IME/focus/accessibility and lifecycle recovery for each selected backend. Measure
startup, streaming, list scrolling, retained-view memory and restoration latency on
representative devices. No numeric performance guarantee follows from framework names.

If a backend cannot meet isolation or embedding requirements, replace that backend,
constrain its declared capabilities, or revisit the explicit product contract. Do
not relabel Web controls as native to mark a requirement complete. Validation gates
are future work; no runtime was executed during this design.

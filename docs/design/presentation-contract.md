# Presentation contract

Status: revised by [ADR 0010](../adr/0010-native-renderer-seam.md). GPUIX is a second
renderer face of the official UI contribution, not an independent presentation system.

## Ownership

The official DSH UI plugin owns its page, navigation, Slot declaration, controller,
state, services, Remote calls, actions, permissions, localization and lifecycle. MyGO
does not introduce a presentation plugin that redefines those semantics.

The base supplies React rendering, platform surfaces and system capabilities. It does
not invent Page, Section, chat, settings or instance semantics.

## One contribution, two faces

An official Slot registration may expose renderer-specific faces:

- `react`: the existing DOM component;
- `gpuix`: a GPUIX component implementing the same official contract.

The existing `register(options, Component)` form remains a React-only registration.
An updated official UI package adds `gpuix` to that registration. It does not create a
second plugin entry, Slot key, child declaration, store or subscription.

Both faces receive the same official props and use the same renderer-neutral model.
They preserve the same Slot cell, priority, order, child ownership, commands, errors,
navigation meaning and accessibility intent. Face eligibility is applied before the
existing Slot election; election behavior is otherwise unchanged.

Renderer-neutral official code may be shared directly. A DOM-specific view gets
a sibling GPUIX view inside the same official UI package and shares its controller or
extracted model.

## GPUIX renderer

GPUIX faces are ordinary React components evaluated by `@gpuix/react`.
They are not JSON descriptions and are not produced by directly calling component
functions.

The GPUIX adapter owns a standalone operating-system window and GPU surface. The desktop root is
not a DOM document and is not hosted by Electron. Browser runtime costs are introduced only when a
declared Web compatibility surface is actually mounted.

GPUIX theme and control libraries may use renderer-specific types directly. They share official
theme semantics and feature models without pretending to define a future Compose interface. Alma
is a visual-quality reference for those desktop controls and the Settings surface only. The GPUIX
UI does not add Alma features, navigation or information architecture.

## Web compatibility

React-only plugins retain their original browser environment. A native host can mount
that content through an explicit Web compatibility surface. The Web document owns its
DOM, CSS, browser events, hooks and refs.

That surface is a bounded compatibility child, never the desktop application shell.

Across a native/Web boundary, state and operations use an explicit scoped bridge. Live
closures, context values, refs and DOM nodes do not cross environments. A Web fallback
does not acquire extra authority or change the owning instance.

## Lifecycle and failure

The single registration owns activation and disposal. Removing it removes both faces
and its child/store ownership once. A face-specific render failure may retire that face
without treating the shared model as failed; a shared service or lifecycle failure
applies to the whole contribution.

Hide and unmount remain distinct. Platform process loss restores only declared model,
navigation and draft state; it does not claim to preserve a live React heap.

Unsupported required content must show an explicit unavailable or Web-compatible path.
It is never silently omitted. Optional decorations may be absent only when their Slot
contract allows it.

## Verification obligations

For every migrated official feature, verify that React and GPUIX:

- resolve the same logical Slot contribution;
- observe the same model snapshot and perform the same mutations;
- retain the same Remote and permission failures;
- expose the same required actions and navigation destinations;
- react to the same locale and theme inputs;
- dispose the same owned resources exactly once.

Also verify platform focus, IME, back/escape, accessibility, scrolling and Web surface
lifecycle. The React face must remain behaviorally unchanged.

## Related design

- [Native renderer architecture](native-renderer-architecture.md)
- [Unified Slot rendering](unified-slot-rendering.md)
- [React boundary semantics](react-surface-semantics.md)
- [Platform carrier contract](platform-carrier-contract.md)

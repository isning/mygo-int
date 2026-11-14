# ADR 0010: Official UI plugins own renderer faces

Status: Proposed

## Context

MyGO needs native desktop rendering while preserving DSH's Cordis client, official UI plugins,
Slot composition and Remote-backed feature models. A separate presentation plugin would duplicate
the product UI and allow its navigation, state and feature behavior to drift from the official
React UI.

GPUIX provides a concrete React renderer for a standalone native desktop application. There is no
maintained general React-to-Compose renderer to treat as equivalent infrastructure; inventing one
would recreate the central complexity of React Native.

## Decision

Each official UI plugin owns one logical Slot contribution and may provide renderer-specific faces
on that same registration:

- `react`, rendered by the existing DOM renderer;
- `gpuix`, rendered by the GPUIX desktop renderer.

The existing component registration form means a React-only face and remains source-compatible.
Face availability is checked before the existing Slot election. Both faces return `ReactNode` and
share the official controller, services, stores, actions, permissions, lifecycle, navigation,
localization and accessibility intent.

GPUIX views live with their official feature package. Renderer-neutral official components may be
shared directly; DOM-specific views gain a sibling GPUIX view backed by an extracted shared model.

GPUIX theme and primitive packages are desktop rendering infrastructure, not a presentation plugin
or a generic native component framework. Alma guides their visual quality and the visual finish of
the Settings surface. It does not add features, page structure or navigation absent from the
official UI.

React-only third-party plugins remain compatible through the existing React face and an explicit
Web surface on native hosts.

On desktop, GPUIX owns the operating-system window, event loop and drawing surface. Electron or a
Chromium document is not the application shell. A browser engine may exist only inside an explicit,
isolated compatibility surface for content that actually requires DOM APIs.

## Consequences

- MyGO has one Cordis client tree, one Loader graph and one Slot ledger.
- Official UI packages remain the source of feature and page semantics.
- React and native behavior can be tested against the same models and mutations.
- GPUIX support requires changes across official UI packages as their faces are implemented.
- A future renderer adds its own face only after a maintained renderer and authoring model exist;
  the GPUIX work does not invent that model for Android.
- The desktop deliverable is a standalone native application, not an Electron application.
- Existing plugins continue to work without adopting GPUIX faces.
- There is no MyGO-wide presentation plugin or second product UI graph.

## Follow-up

The API, rollout and conformance gates are defined in
[Native renderer architecture](../design/native-renderer-architecture.md).


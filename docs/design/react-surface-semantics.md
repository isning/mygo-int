# React and presentation surface semantics

Status: explicit cross-environment state/service bridge confirmed, 2026-11-10.
Detailed bridge and platform mechanisms remain design proposals.
Mechanism evidence is in [React UI research](../research/react-ui-mechanisms.md).
The official React DOM execution profile remains the extraction baseline.

## Invariants

Standard React means actual component rendering, hooks, effects and event handling
through a compatible renderer. Calling component functions as descriptor generators
is insufficient. A render tree resolves compatible React/renderer singletons.
Legacy DOM components retain a real browser environment; arbitrary DOM is not
translated automatically into native widgets.

## Confirmed explicit boundary

Within a rendering environment, components use ordinary React context, hooks and
renderer-defined event ancestry. Across an independent Web environment, a plugin
mounts an explicit Web entry/module with serializable initial props and a declared
service/state channel. Each side owns its React root, hooks and effects.

A callback handle represents a bounded remote call, not the transfer of a function's
lexical environment. React context objects, refs, DOM nodes and closures are not
serialized as live objects into the other environment. A plugin can ship both entries
in one package with tooling, but transparent arbitrary source splitting is not promised.

## Shared filter and draft scenario

A plugin owns one declared shared model for a native filter control and Web chart.
Both roots subscribe to that model through the declared bridge. A filter action
updates that authority; the chart receives the new revision. The roots do not each
maintain an independently authoritative filter and attempt bidirectional effect sync.

Input/IME drafts can remain local to the editing surface until an explicit update
boundary. The shared model states which values are committed, pending or local.
A remote event is not automatically the original platform's trusted user gesture;
clipboard, dialogs and file selection follow actual carrier rules.

## Lifecycle and presentation ownership

The official UI plugin owns placement and navigation semantics. Its React and native
faces express the same contribution; the selected renderer implements physical layout,
visibility and platform interaction without inventing another page model. Mounting
binds a surface to an owner and channel lifetime; unmounting disposes that root,
subscriptions and callbacks. Hiding can preserve a mounted root where supported,
but must not be confused with unmounting or imply that an Android WebView survives
Activity/process destruction.

Refs and measurements are local to their renderer; cross-surface size/focus requests
are explicit platform operations. Keyboard/IME, back navigation, accessibility and
focus traversal require coordinated contracts. A web surface does not pretend its
DOM node is a native component ref.

## Boundary deliberately not promised

The chosen contract does not promise a transparent React tree across independent
native and Web environments. Ordinary serialization, React DOM portals and a WebView
inside a native widget do not supply that guarantee. Tooling can improve authoring
convenience while preserving this explicit boundary; it must not imply that live
context, effects, closures or refs have moved to another runtime.

## Future conformance checks

Verify shared-model updates, simultaneous edits, mount/unmount and stale callback
rejection; verify context remains ordinary inside each root and is not claimed to
cross an unsupported boundary. Exercise focus, IME and back behavior on real selected
platforms. No prototype or runtime experiment was executed here.

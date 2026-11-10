# Presentation contract

Status: unified original Slot interface confirmed, 2026-11-10. Native faces extend
existing Slot registration; they are not an independent contribution registry.
Detailed mechanics are in [unified Slot rendering](unified-slot-rendering.md).

## Roles and authority

The base supplies mounting/update/event/platform mechanisms. It does not recognize
Page, Section, instance navigation, chat or settings. A local presentation plugin
provides those vocabularies and policy. A different local composition can replace
it without changing the base's harness-neutral role.

Trusted local Root composes the application. An instance compatibility environment
can own its own official Root and Slots; that does not grant replacement of the
application Root. Rendering authority follows the surface's mount owner and granted
capabilities, not a plugin's priority value or a claimed slot name.

## Original-compatible path

Run the reused official React DOM renderer with its original module/React identities,
Cordis services, Slot component props, observables and Remote descriptors. Keep its
existing plugin graph and lifecycle. A DOM-heavy legacy contribution can render
inside that environment without adopting semantic components or a mygo SDK.

When embedded inside a different presentation shell, the original-compatible page
is an explicit surface. Its document owns its DOM, CSS and browser event tree. A
native parent does not reach into that document to relocate arbitrary DOM controls
into native tabs or infer navigation by scraping its HTML.

## Unified Slot and semantic components

A local plugin can publish semantic React components and a matching real renderer.
The vocabulary can express a destination, peer sections, collection/detail, actions,
transients and a bounded Web surface. These are plugin APIs, not universal base types
or promises that every external harness uses the same session model.

A semantic contribution declares intent and stable ownership. It should not require
a desktop Tab widget or Android bottom bar. The chosen local layout/navigation
plugin maps that structure to device-appropriate UI. Native and Web representations
may coexist, but only supported, authorized contributions are eligible for a mount.

Use one registration ledger and extend each entry with optional rendering faces.
The legacy component argument remains the React face. Bind each renderer to supported
faces, then elect entries with original cell/priority rules. Shared children, stores,
services, locale and disposal stay with the one registration. Semantic components
are optional plugin-provided vocabulary inside that unified interface.

The client ui-slots/renderer extension needs a tracked compatibility-preserving patch;
upstream acceptance is not assumed. It does not require changing remote Host core.
Old React plugins are not rewritten. Child ownership, factories, standard props,
chains/HOCs and face-local errors must be adapted coherently, not just return types.

## Surface boundary

A mount identifies its owner, render profile, executable entry, initial serializable
values and granted service/resource channels. Its execution generation distinguishes
current callbacks from stale ones. Exact field names and wire schemas are not fixed
by this conceptual contract.

Within a surface, ordinary React controls rendering, hooks and effects. Across an
independent Web surface, use explicit value snapshots/subscriptions and commands.
No arbitrary closure, context object, ref or DOM node crosses as a live object.
A bridge call binds authorization to the mounted channel; its payload cannot select
an unauthorized instance merely by changing an identifier.

Visibility, focus, layout bounds, scale, locale/theme, keyboard/IME state and back
requests have declared owners. Hide is distinct from unmount. A parent can preserve
a surface while changing layout where the carrier supports it; process death still
requires restoration from declared state, not reconstruction of a live JS heap.

## End-to-end example: native selection with a Web detail view

1. A trusted local integration supplies an instance/authentication view and services.
2. A plugin registers a semantic collection/detail destination with an explicit Web
   detail entry and a shared selection model. No business operation runs at render time.
3. The local navigation plugin opens a destination occurrence. The presentation
   plugin selects a split view or stacked view based on its own platform policy.
4. A real React renderer evaluates semantic components. The platform mount maps
   supported elements to precompiled native components and mounts the Web surface.
5. A native selection event invokes a scoped command on the shared model. The model
   publishes a revision; both roots observe that revision. React context is local.
6. The Web detail can request an allowed operation through its scoped bridge. The
   DSH integration uses its original generated Remote and connection recovery; it
   does not translate the operation into an invented universal session protocol.
7. Layout changes preserve destination/model identity where appropriate. Closing
   the destination disposes surface handles, roots and owned subscriptions; switching
   visible instances does not dispose unrelated instance connections.

The original DSH chat can instead remain an entire compatible Web surface. This
example describes an optional native-capable plugin, not a required chat rewrite.

## Unsupported content and failure

An unsupported renderer requirement is reported before mounting where possible.
Optional decoration may be omitted by its contract; required content needs an
explicit unavailable state or an authorized alternative, never silent loss of a
required action. Legacy Web fallback mounts its own entry and scoped capabilities;
it does not rerun arbitrary native callbacks in a remote page.

Surface failure is contained according to the chosen carrier. Preserve DSH's layered
boot/entry diagnostics and the platform fatal-recovery boundary. Do not add a fixed
product recovery UI or automatic disabling policy without a decision.

## Protocol responsibilities left to implementation design

A chosen remote renderer must define coherent commits/snapshots, revision ordering,
stale-event rejection, bounded queues, resynchronization and disposal. List rendering
must define stable keys and viewport/paging behavior rather than sending unbounded
conversation trees. Input handling must preserve IME composition and local edit
revisions. These constraints do not fix a custom wire protocol or numeric limits
before choosing reusable renderer machinery.

## Verification obligations

Verify ordinary hooks/context within each root, shared-model behavior across roots,
legacy Slot behavior, native parent/Web child composition, authorization and disposal,
and focus/back/IME/accessibility across target carriers. Test unsupported contributions
without losing required operations. No renderer or prototype has been implemented.

## Related design

- [Confirmed project definition](project-definition.md)
- [React boundary semantics](react-surface-semantics.md)
- [Trust policy](trust-and-execution-boundaries.md)
- [Plugin contracts](client-remote-plugin-architecture.md)
- [Source mechanisms](../research/react-ui-mechanisms.md)

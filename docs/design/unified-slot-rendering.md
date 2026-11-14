# Unified Slot rendering

Status: unifying native capability in the existing Slot interface is user-confirmed,
2026-11-10. Detailed API shapes and mechanics below are design proposals; no public
API patch, renderer or experiment has been implemented.

## Decision and scope

Extend the existing Slot contract rather than introducing an independent renderer
contribution registry. One registration can expose several renderer-specific faces. The
original component registration is the React face by default. Old plugins keep their
module names, registration form, React behavior and service contracts.

Page, navigation and feature semantics remain owned by the official UI plugin that
already defines the React contribution. GPUIX support does not introduce another
vocabulary or a presentation plugin: the same official contribution gains another
renderer face. Neither a face nor priority changes an authority boundary.

## One registration, several faces

The official registration owns identity, cell/key, priority/order, children declarations,
store declaration, injected domain services, locale and lifetime. Faces provide the
renderer-specific components and requirements for that one registration. A plugin
can remain React-only or expose several faces. MyGO's desktop migration adds `gpuix` beside
the existing official `react` face; it does not create another contribution.
Registering a second face must not re-run its business plugin, redeclare children or
duplicate subscriptions.

Keep the old `register(options, Component)` form unchanged. A new, unambiguously
identified multi-face argument or overload belongs to the original ui-slots package.
For example, an exported branded `faces({ react: WebComponent, gpuix: GpuixComponent })`
helper could distinguish the new form from ordinary React memo/lazy component objects.
This spelling is illustrative, not a chosen API. Do not infer a face map merely
because a component is an object or contains a property matching a face ID.

A GPUIX face is evaluated by `@gpuix/react`, not by directly calling a function to
collect descriptors. It returns GPUIX host components while
the React DOM face retains actual DOM behavior. Both implement the same official
feature contract. A component cannot assume every renderer supports its host element
vocabulary.

## Preserve ledger and election semantics

Use one underlying registration/declaration ledger in each authority domain. Keep
raw inspection distinct from renderer-specific eligibility and winners.

For a requested renderer/mount:

1. Verify the registration is live and authorized for that mount.
2. Determine eligible faces from renderer, component capability and ABI requirements.
3. Exclude entries lacking an eligible face from that renderer's election.
4. Apply the original cell, priority, tie, ordering and selection rules to survivors.
5. Render the chosen face with renderer-bound standard props.

At the pinned upstream baseline, lower numeric priority is tried first. Single has
one cell; keyed uses key; list and hoc use id. Same cell/same priority conflicts
remain conflicts, even when entries have disjoint face sets. Extend an existing
registration when adding its other face instead of relaxing collision rules silently.
Chain routes use ordered selectors rather than ordinary cell shadowing; HOC entries
compose compatible wrappers in their original nesting order.

Filtering must precede cell election: a React-only overriding entry cannot hide an
eligible GPUIX entry and then leave the GPUIX mount blank. Diagnostics retain all
entries, exclusion reasons, the requested renderer, selected face and winner.

## Child-slot declaration and authority

Upstream register rejects duplicate child declarations. The child table also grants
permission to render those keys. Keep one declaration owner per child key, shared by
that registration's faces. Per-face renderSlot bindings have the same declared keys
and disposal checks, while returning that renderer's node type.

Different winning entries must not acquire each other's child authority merely
because they occupy the same parent cell. A replacement needing different children
must follow the actual declaration/ownership contract; choosing a new winner does
not manufacture a compatible subtree. This is especially relevant to Root and
shadowed layout entries. Report incompatible replacements rather than bypassing
ownership checks.

A mount's choice of renderer does not authorize undeclared child keys. Renderer
eligibility is a presentation decision; access control belongs to services and
mounted capabilities. Required authorization cannot be implemented only in a HOC
that another renderer might omit.

## Renderer-bound types and standard props

A generic render-result type is necessary but not sufficient. The inspected source
also types fallback, scoped renderArea/SessionProvider, renderSlot helpers, factories,
HOC composition and component props in React terms. Audit all these consumers.

Keep semantic owner values, observable sources, store actions and domain methods
common where they are renderer-neutral. Bind hooks, render callbacks, child nodes,
refs and renderer-specific component positions at the selected renderer. A React DOM
node cannot become a GPUIX child merely by widening a type to unknown.

A face/type map can express renderer-specific contracts while retaining the original
React-facing exports and defaults. Existing compiled bundle ABI and declaration
merging identities must remain compatible. Removing React imports from a core module
must not accidentally remove types relied on by existing source plugins.

## Stores, factories, chains and wrappers

Preserve existing store ownership: a shared declared handle and a per-entry factory
have different identities. Share the same domain-owned state across faces only where
that declaration already defines shared ownership. Do not make all state global.

Factory definitions and caller-supplied component positions also need face-aware
contracts. Retain the upstream per-occurrence store retention/release behavior. A
face switch may remount React components and lose hook-local state; only declared
model/draft state has an explicit preservation guarantee.

Chain selectors keep domain routing separate from component host rendering. Do not
serialize selector closures across runtimes. Evaluate through the owning authorized
runtime or expose a declared service. Mixed-renderer HOC nesting is invalid unless
an explicit surface adapter supplies the boundary; a React wrapper cannot consume
an arbitrary renderer node object.

## Failure, removal and revision

Current upstream abdication retires an entry through a global WeakSet. A multi-face
extension must distinguish renderer-face failure from shared business/service failure.
A failed GPUIX face should not automatically retire the still-working React face.
A truly invalid shared registration/service must not remain usable on another face.
Choose failure keys that retain existing React-only behavior and avoid poisoning
unrelated mount occurrences accidentally. Exact face-versus-occurrence granularity
must be stated and tested before implementation is complete.

Disposal removes the whole owned registration and its faces, revokes child bindings,
and follows original recursive child/store cleanup. Changing renderer support or
face revisions invalidates relevant eligibility/winner subscriptions. Diagnostics
must not use the old renderer-agnostic winner projection as if it described all mounts.

## Where React evaluates GPUIX faces

Evaluate a face in an authorized JS environment with the matching React instance,
module graph, hook scheduler and domain service bindings. GPUIX host widgets consume
renderer output; Kotlin/another native language does not call the component directly.
A face and the renderer that invokes it must agree on executable identity and types.

For the GPUIX desktop application, the `gpuix` face is evaluated in the application's JS
runtime alongside the Cordis client tree, and GPUIX directly owns the operating-system
window and drawing surface. There is no browser or Electron root. The original React DOM
renderer runs only inside an explicitly mounted Web compatibility environment. That
environment requires coherent bundle loading and explicit service boundaries; it is not
a reason to serialize native component closures or duplicate the client tree.

## Web fallback is an explicit mount

A GPUIX mount may use a declared Web compatibility alternative where supported.
This is another rendering path of the same Slot system, not a second registration
system. A chosen Web face runs in its own browser/React environment with explicit
entry, state/service bridge and authority, preserving the previously confirmed
cross-environment React boundary.

An arbitrary in-memory React closure cannot be transported by serializing its props.
Where the parent or child needs document-only props, closures or ReactNode children,
the compatible Web boundary must move to an ancestor that can own those interactions,
or report unsupported composition. A face ID alone does not solve that problem.

Do not promise one WebView per message, per inline token or unrestricted mixed HOCs.
The eligible mount granularity, viewport, focus, scrolling and GPUIX/Web constraints
are part of renderer capabilities. Optional content may be omitted only by its Slot
contract; required content needs an explicit unavailable state or supported alternative.

Fallback preference between a lower-priority GPUIX face and a higher-priority Web
compatibility face is a presentation policy that must be explicit. Do not add an
automatic Web fallback and accidentally undo renderer-aware native election.

## Upstream and local ownership

This decision permits a compatibility-preserving client-side ui-slots/renderer patch.
It does not imply that DSH upstream has accepted it. Track the delta and update all
client consumers/tests affected by the public contract; propose upstream integration
where appropriate. If upstream does not accept it, a maintained client patch remains
a design option, with its maintenance cost visible.

The remote adapter remains thin and need not change Host core. Old Host graphs and
React-only plugins need not advertise GPUIX faces. Packaging/filtering GPUIX-only
client bundles is a separate delivery capability; do not assume an unmodified Host
will discover or selectively deliver new face metadata.

## End-to-end example

An official UI plugin registers one contribution with shared children/data contracts
and React/GPUIX faces. The GPUIX renderer elects the `gpuix` face and renders the same
official page or control through real React. A child Slot can select another GPUIX
face or an explicit Web compatibility surface. Both faces observe the same official
model, services and generated Remote, while each renderer owns its hooks. Unloading
the plugin disposes that one registration, all faces and declared child bindings once.

## Required conformance checks

- Existing React registration, election, child ownership, stores, factories, chains,
  HOCs and errors retain upstream behavior.
- Eligibility precedes cell election and keeps original ascending priority/tie rules.
- One multi-face registration declares children and owns effects once.
- GPUIX face failure, shared service failure and registration disposal differ.
- Factories/occurrences and face switching preserve only declared state guarantees.
- Web fallback rejects unsupported closure/node transfer and stale bridge handles.
- Remote contributions cannot replace global Root or inherit other-instance authority.

These checks are future implementation obligations; no tests were run here.

## Source and related contracts

- [Pinned Slot core](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/client/ui-slots/src/index.ts)
- [Pinned renderer contract](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/client/ui-slots/src/renderer.ts)
- [React boundary](react-surface-semantics.md)
- [Trust boundary](trust-and-execution-boundaries.md)
- [Plugin preservation](client-remote-plugin-architecture.md)

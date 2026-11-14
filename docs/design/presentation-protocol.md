# Semantic presentation and mixed rendering

Historical proposal. The current contract is [native renderer architecture](native-renderer-architecture.md)
and [confirmed React boundary](react-surface-semantics.md). The descriptor-first
proposal and its separate presentation host are superseded. Official UI plugins own
the React and GPUIX faces of the same Slot contribution.

Status: proposed design, 2026-11-09. No renderer or SDK is implemented.
The resolved choices and concrete wire/limit proposal are in `design-resolution.md`
and `protocol-specification.md`; this document supplies the presentation rationale.

## 1. Independent semantic and rendering contracts

Semantic presentation describes pages, sections, actions, resources, and relationships.
Rendering describes native nodes or Web surfaces. Navigation is not reconstructed by
inspecting arbitrary DOM. A section does not prescribe a Tab widget, nor a detail
relationship a desktop window. The host owns final layout and accessibility.

Proposed semantic vocabulary:

- Page: route definition, title, parameter schema, actions, content and state version.
- Section: peer content within a page with a stable selection identity.
- Collection/detail: selected resource and independently addressable detail.
- Action: command ID, label, enabled/busy state, event endpoint.
- Transient request: confirmation, selection, or temporary inspection with cancellation.
- Content surface: bounded content with rendering faces and capability requirements.

The plugin contributes destinations, not mandatory Android bottom tabs or desktop
windows. Required workflow actions remain available when the host moves them to menus.

## 2. Navigation and occurrence identity

A route contains connection ID, plugin ID, route ID, validated serializable parameters,
selected section, and optional resource identity. An occurrence ID distinguishes two
open instances. Persistent routes omit transient epochs; event addresses include them.

Operations express intent: open destination, select section, open detail, present,
dismiss, request back. The host executes them within grants and owns history.
An integration cannot silently navigate another connection's pages.

Android back first resolves transient UI then active route history, with an explicit
IME/Web history arbitration policy. PC close uses the same unsaved-change guards.
Guards are bounded decision requests and cannot trap the user indefinitely.
Width changes alter presentation without duplicating domain subscriptions or history.
Plugin removal retains an unavailable route with recovery and exit controls.

## 3. SDK authoring model

Specify a framework-neutral descriptor API and a JSX facade. Proposed Page, Section,
Action, and WebContent primitives are semantic registrations, not ordinary DOM.

Normal React components cannot simply be called as functions in a headless engine:
hooks and lifecycle require an actual supported renderer. Two options exist:

1. Descriptor functions, explicit observable sources, and a custom JSX factory that
   constructs descriptions. No promise of ordinary React hook semantics.
2. A supported custom React reconciler and remote rendering runtime.

The initial proposal is option 1, with ordinary React/DOM content in separate Web
entries. Option 2 can add React ergonomics later without changing the semantic wire.
This corrects the earlier illustrative JSX examples, which did not define a runtime.

Functions are never serialized. Bundles register content factories and event handlers
under IDs. Web content receives a scoped bridge, theme, locale, dimensions/insets,
and versioned context through documented APIs.

## 4. State ownership and input

Business facts belong to integration services, routes/history to the navigator,
focus/scroll/IME to the host, and recoverable input to a draft service. Node trees
are disposable. Recreating or reevaluating a surface cannot submit operations or
duplicate background subscriptions.

Native input keeps immediate edits and composition locally. Updates carry editing
revisions; delayed JS acknowledgements cannot overwrite a newer edit. Remote edits
during composition are deferred or exposed as conflicts. Flush drafts at lifecycle
and submission boundaries, not only a debounce timer. Recovery requires a declared
field schema and explicit migration, not restoration of arbitrary old rendered props.

## 5. Node and event protocol

Every occurrence has runtime epoch, connection, surface ID, schema version, and
monotonic sequence. Node IDs are stable within that occurrence.

Start with a snapshot. Patches include base and next sequence; validate and apply
atomically. On a gap, freeze affected actions and request a full snapshot. Retained
old frames are visibly stale and non-interactive until reconciled.

Events include epoch, surface, node, action handle, event ID and relevant edit revision.
Reject disposed handles and old epochs. Deduplicate critical actions; coalesce
high-frequency value updates. Render acknowledgements are separate from remote
operation receipts.

Bound pending updates and bridge traffic. When behind, coalesce projections or
replace them with a new snapshot while preserving durable user operations. Negotiate
limits for tree depth, nodes, payload size, frequency, and resource handles. Concrete
numeric budgets remain a later design decision.

## 6. Large lists and streaming

List sources expose handles, revisions, stable keys, paging/window requests, and
insert/update/remove/reset semantics. Stale responses cannot be applied to a new
revision. Declare whether count/random access are supported; cursor-only lists use
paging rather than pretending to support arbitrary indexing.

The renderer requests overscanned visible windows and releases evicted observations.
Message streaming updates keyed content rather than regenerating an entire tree per
token. Coalesce rendering without losing ordered business events. Native list and
Web content performance still requires eventual measurement.

## 7. Slot election and rendering faces

Eligibility checks renderer, feature, ABI, grant and scope requirements before applying
priority. Diagnostics preserve exclusion reasons and the original contribution ledger.

Exclusive/keyed slots elect eligible winners per cell; list slots retain stable
ordering. Chain/HOC slots require typed composition semantics: a React HOC cannot
wrap a native node producer. Authorization and mandatory behavior must be enforced
in services or required contracts, not bypassed by dropping an unsupported face.

Fallback depends on the Slot contract:

- Optional decoration can be omitted.
- Required content displays a host-owned unsupported/error view and alternatives.
- Missing application root activates bundled recovery.

An eligible GPUIX default can remain below an unsupported high-priority plugin.
An exception cannot silently authorize a less restricted operation. Remote connection
plugins may replace only authorized parts of their connection subtree; Root being a
Slot does not grant them application-wide replacement authority.

## 8. Web surfaces and compatibility

Initially allow native semantic containers around bounded Web content. Do not promise
native controls arbitrarily inserted inside DOM. Inline Web content in long message
lists needs a separate sizing, scrolling, pooling and memory policy.

Surface metadata identifies owner, resource/content entry, package generation, bridge
profile, restoration state, and budgets. Resources resolve through ownership and
connection policy. Do not put raw authentication tokens into plugin-controlled URLs.

Bridge messages validate channel/origin and owner, expose only granted operations,
and carry versions. The host controls external navigation, files and permissions.
Disposal revokes bridge handles and subscriptions. Suspension restores explicit state
rather than promising a preserved JS heap. Do not equate every region with a dedicated
WebView; platform composition/pooling remains an implementation choice.

Existing DSH React plugins can require a full DSH browser context. Their compatibility
adapter needs a supported service/slot matrix. A generic Web surface alone does not
guarantee that they work unchanged.

## 9. Accessibility

Native nodes carry roles, labels, value/state, focus order and action descriptions.
Web content owns its internal semantics. The host coordinates focus transfer, theme,
locale and text scale across boundaries. Shortcuts are scoped; plugin handlers cannot
silently take over global escape/back. A detail always has an accessible return path.

## 10. Theoretical acceptance scenarios

- One page declaration maps to desktop panes and an Android navigation destination.
- Resize preserves selected resource, section, draft and logical history.
- Upgrade cannot dispatch a stale event to a new handler reusing the same node ID.
- Lost patches cause bounded resynchronization without duplicate submissions.
- Unsupported optional content does not hide required workflow outcomes.
- Removed plugins leave drafts recoverable and navigation escapable.
- List revision changes do not bind an action to a different item at the same index.
- Delayed acknowledgements cannot overwrite newer IME composition.
- Closing a Web surface revokes its bridge and observations.

These are specification obligations, not tests claimed to have run.

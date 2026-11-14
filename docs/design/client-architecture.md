# Client architecture

Status: historical proposal, expanded 2026-11-09. Confirmed direction is recorded
in [project definition](project-definition.md); CONTEXT.md is the domain glossary.
No implementation, builds, or runtime validation have been performed for this design.

The [current project definition](project-definition.md) records subsequent user
clarifications and takes precedence over earlier proposals below. The client is a
local plugin composition on a minimal base; standard React authoring is required;
this planning effort does not split scope into product releases.

The semantic presentation-host proposal below is superseded by
[ADR 0010](../adr/0010-native-renderer-seam.md). Official UI plugins own both faces
of the same Slot contribution.

The user has now fixed the starting implementation direction: extract DSH's React
client with near-total code reuse, then establish client/remote plugin contracts and
existing-plugin compatibility. Earlier native/headless designs are alternatives for
later architectural evolution, not prerequisites or a replacement for that extraction.

Read the [extraction-first route](react-client-extraction.md) for the current plan.

Current contract documents:

- [Client and remote plugins](client-remote-plugin-architecture.md)
- [Unified Slot rendering](unified-slot-rendering.md)
- [Instance and connection identity](instance-and-connection-model.md)
- [Navigation](navigation-and-page-model.md)
- [Platform-specific carriers](platform-carrier-contract.md)
- [Implementation dependency plan](implementation-dependency-plan.md)

[Earlier theoretical reasoning](design-resolution.md) remains historical analysis;
its Compose/QuickJS and per-connection-realm recommendations are not selected.

## Foundation

The application starts a local Cordis-based runtime. Platform, presentation, and
harness capabilities are provided by plugins. The runtime can start without a DSH host.
DSH-provided client packages are one integration-specific package source rather
than the definition of the entire application.

## Proposed scopes and ownership

An application scope owns platform service registrations, connection configuration,
application navigation, and integration discovery. Each connection has a logical
child domain containing its harness services and associated contributions. A logical
child domain can use a separate module realm and Cordis instance when dependencies
or versions require it; it is not necessarily an in-process Cordis child context.

Integration services own their business state. Platform code supplies storage and
transport mechanisms without duplicating session models or recovery policies.
Presentation reads observable state and invokes declared operations.

The same integration can serve multiple connections without shared mutable
connection state. Removing one connection disposes its subscriptions and views
without terminating unrelated connections.

Cordis dependency scopes are not a security sandbox. Downloaded code trust,
execution isolation, and access to platform services require a separate policy.

## Proposed contract boundary

The minimum common contract covers integration discovery, connection creation and
disposal, page contributions, navigation targets, capability discovery, and
namespaced persistence. It does not require every harness to implement DSH session
or settings models.

Reusable chat, tool, and subagent presentation contracts can be introduced where
their semantics align. Integrations retain explicit extension points for capabilities
that do not fit those contracts.

## Presentation direction

Official UI plugins retain their pages, sections, actions, navigation and detail
relationships. Each registration can add a renderer-specific `gpuix` face beside its existing
`react` face. GPUIX implements that desktop view directly; there is no generic cross-platform
native control layer, separate MyGO semantic SDK or presentation host.

Existing React-only plugins keep the React face and use an explicit Web compatibility
surface on native hosts. Arbitrary DOM is not automatically converted to native controls.

## Completed design coverage

- [Complete architecture reasoning](design-resolution.md): reference decisions,
  package structure, plugin authoring, lifecycles, persistence, DSH/ACP, and platform ports.
- [Protocol specification](protocol-specification.md): identities, messages, sources,
  projections, events, drafts, replay, configuration, limits and error behavior.
- [Product and integration coverage](product-and-integration-coverage.md): dsh-go
  remote-client baseline, capability mapping, and documented upstream contradictions.
- [Consistency and failure analysis](consistency-and-failure-analysis.md): 18 invariants,
  normal end-to-end behavior, 24 failure walkthroughs, and theoretical limits.
- [Proposed architecture decision](../adr/0001-cordis-client-and-semantic-presentation.md):
  compact record of the reference design and its tradeoffs.

Reference-design precedence: the completed reasoning and protocol specification refine
the supporting drafts. Product scope follows confirmed user requirements; implementation
claims require future evidence. Numeric budgets are proposed defaults, not benchmarks.

## Supporting design detail

- [Runtime and plugin contracts](runtime-and-plugin-contracts.md): bootstrap, realms,
  package generations, ownership, durable operations, and pinned source evidence.
- [Presentation protocol](presentation-protocol.md): semantic routes, authoring model,
  native/Web content, node/event consistency, input, and fallback rules.
- [Contract examples and decision register](contract-examples.md): illustrative APIs,
  design dependencies, alternatives, and remaining contradictions to resolve.

These documents refine the initial proposal. They do not mark unconfirmed choices
as accepted architectural decisions.

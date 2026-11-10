# ADR 0001: Cordis client with semantic presentation

Status: proposed, 2026-11-09. The general Cordis/harness direction is confirmed;
the concrete reference-design recommendations below await adoption.

## Context

mygo needs full PC/Android interaction, readable tools/subagents, multiple harnesses,
and extensible plugin UI. DSH supplies reusable client logic but its browser UI and
module assumptions cannot define every integration or native platform.

## Proposed decision

Use Cordis application and connection domains. Isolate independently versioned
connection generations in module realms. Bootstrap locally and broker platform
capabilities through serialized contracts.

Harness plugins own business logic. Optional shared feature profiles enable reusable
UI without requiring universal DSH session/settings models. Semantic pages and routes
are adapted by the host; native and Web content are explicit rendering faces.

Use a framework-neutral descriptor protocol and JSX facade first. Ordinary React
requires an explicit reconciler adapter; DOM content runs in separate Web entries.
Native containers may enclose Web leaves, without arbitrary alternating DOM/native
nesting. Existing DSH Web compatibility has explicit integrated or full-browser ownership.

Store drafts and durable operations locally with transactional capture and remote
idempotency/reconciliation prerequisites. Upgrade artifact generations atomically
and reject stale events. No central mygo service is required.

The reference platform recommendation is Kotlin/Compose hosts with an EnginePort
and WebSurfaceHost, initially evaluating QuickJS as the engine candidate. Exact bindings,
desktop Web backend and measured resource suitability are not decided by theory.

## Consequences

- New harness support is supplied through plugins and carriers.
- Device navigation can differ without duplicating harness business state.
- Multiple remote versions and future local/managed agents have explicit boundaries.
- Package provenance, trust enforcement, engine hosting, semantic SDK and native/Web
  bridges become maintained infrastructure.
- Existing React plugins do not automatically gain native faces or semantic navigation.
- Strong offline replay depends on remote guarantees; unsupported operations stay drafts.

## Alternatives considered

A DSH-specific application core conflicts with general harness support. A universal
session manager over-normalizes providers. One shared module table fails arbitrary
version coexistence. Arbitrary HTML-to-native conversion has no supported semantics.
Web-primary, RN and Flutter hosts remain possible renderers but do not themselves
solve plugin contracts, navigation semantics, or realm boundaries.

## Full rationale

See [Complete architecture reasoning](../design/design-resolution.md),
[Protocol specification](../design/protocol-specification.md), and
[Consistency analysis](../design/consistency-and-failure-analysis.md).

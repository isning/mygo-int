# Implementation dependency plan

Status: user-confirmed implementation route, 2026-11-10. It is not implementation authorization
and does not divide the product into releases. Open architectural choices stay
explicit; a work package is ready only when its relevant decisions are resolved.

## Contract inputs

Use the confirmed [project definition](project-definition.md),
[plugin boundary](client-remote-plugin-architecture.md),
[unified Slots](unified-slot-rendering.md), [instance identity](instance-and-connection-model.md),
[navigation](navigation-and-page-model.md), [platform ports](platform-carrier-contract.md),
[state semantics](state-and-offline-contract.md), [plugin delivery](plugin-delivery-contract.md)
[integration boundaries](harness-integration-contract.md),
[default composition](default-client-composition.md), [providers](execution-provider-boundaries.md),
[maintenance](distribution-and-maintenance.md) and
[lightweight acceptance](verification-and-evidence.md). Documents marked as
proposals remain proposals until their map decisions are confirmed.

## Acceptance scope

The user explicitly chose simple acceptance: get the client running. The first
practical check is independent launch, DSH connection and basic session send/receive.
Detailed checks in contract documents are reference scenarios, not requirements to
construct a comprehensive testing/performance program before useful implementation.
Check additional capabilities as they are implemented and report actual results.

## Planning rules

Preserve the pinned official React client as the reference execution profile. New
native presentation and other harness integrations extend that profile rather than
requiring its replacement. Every change must identify the deployment coupling it
removes or the extension seam it supplies. Keep upstream code, local changes and
independently authored platform adapters distinguishable.

Do not confuse implementation order with product priority or claim source inspection
as executable validation. Unknowns that need experiments become implementation
verification obligations; this planning effort does not run those experiments.

The user has explicitly chosen React client work before PC native implementation.
Keep native interfaces in the architecture, but do not wait for a PC toolkit decision
to start packages A–E. SwiftUI is a later candidate; no universal toolkit is selected.
This order does not remove native support from the complete target.

## A. Establish a reproducible upstream boundary

Depends on the confirmed extraction decision. Inventory the pinned source, generated
Remote types, static platform modules, dynamically delivered client packages, CSS,
assets, code generation and original tests. Record licenses/notices and a procedure
for comparing our delta against a new upstream revision.

Output: source/ownership inventory, dependency closure, build-input inventory and
reviewable patch boundaries. Completion requires each retained import/generated
artifact to have a source; package exports alone do not prove closure.

## B. Separate the official React shell from Host deployment

Depends on A. Retain AppWebEntry, module facade, original ready gate, module identities,
React/Cordis singletons and the existing UI/logic plugins. Supply local boot
configuration through the carrier seam. Do not remove original guards simply to
make a blank page launch or replace the official Session service.

Output: independent shell build boundary and startup contract. Verification during
implementation must demonstrate independent launch and activation of the intended
original client graph, with diagnostics distinguishing missing modules from services
that are present but inactive. Shell construction in B and remote carriage in C are
separate outputs; evidence of authenticated independent boot is their joint checkpoint,
not a circular requirement that each package first prove the other complete.

## C. Supply authenticated bootstrap and complete resource carriage

Depends on A and the boundary from B; detailed carrier behavior depends on runtime
and trust decisions. Implement the optional thin remote adapter without modifying
DSH core, and separately specify the unmodified-Host compatibility path. Reuse
upstream ordered injections and selected Peer/access context.

Output: explicit adapter capabilities, auth flow, remote release/graph identity and
resource map. Verify initial document/bootstrap, RPC, first WebSocket, SSE, lazy
bundles/chunks/styles, uploads/downloads, cancellation and admission renewal. An
original-page access path must be labelled separately from extracted-client boot.
No silent fallback that discards local composition.

## D. Compose local entries and remote-owned entries

Depends on B/C and the confirmed plugin contract. Use existing Loader/module seams
and preserve ClientEntries ownership. Track source, execution and owning composition
independently. Local startup configuration selects the default composition, including
DSH-specific services and UI, without teaching the base those product semantics.

Output: original-compatible local installation/configuration and remote graph
contribution lifecycle. Verify local plugins survive remote graph removal, removed
entries dispose their effects/styles/Remote mounts, and conflicting module identities
do not win by arrival order. Exact enforcement depends on the isolation decision.

## E. Integrate instance ownership and execution boundaries

Depends on D, the confirmed instance model and the trust/runtime decisions. Bind
profiles to explicit instance/authentication views. Carry the unchanged official
module graph in a coherent compatibility environment and connect it to local plugins
through declared capabilities.

Output: simultaneous instances with explicit module/DOM/CSS/storage/credential
boundaries. Verify two conflicting package versions, equal session IDs on different
servers, two accounts on one server, route changes, Host restart, view switching and
consumer/window disposal. A Cordis service scope is not sufficient verification.
Do not require one engine per instance unless the runtime decision selects it.

## F. Provide platform carriers and unified Slot rendering

Depends on B's browser baseline and the selected platform/runtime contracts. Renderer-specific
UI depends on unified Slot faces and a concrete host renderer. Extend the original
ui-slots/renderer interface rather than adding another registration system. Preserve old
registration, ledger, child ownership and React behavior; adapt factories, scopes, hooks and error
election coherently.

Implement the standalone GPUIX host for Linux, Windows and macOS with a concrete `gpuix` face.
Official UI plugins retain navigation, page vocabulary and feature policy while adding that face
to the same contribution. Preserve the full Web profile for legacy plugins. Android remains a
separate renderer decision; this work does not create a generic native adapter or assume a
React-to-Compose renderer.

Output: the GPUIX renderer and GPUIX faces in official UI plugins. Verify focus, IME, back/escape,
accessibility, clipboard, file permissions, keyboard/layout changes, Web embedding and lifecycle
restoration across desktop platforms. File/diff/terminal and notifications are integration
scenarios, not base-owned applications.

Within F, keep these implementation boundaries explicit:

- F1 extends ui-slots and every affected renderer/type/factory consumer with compatible
  face registration, eligibility, ownership, stores and errors. This contract work
  can proceed alongside E after D's ownership and interfaces are stable.
- F2 implements an actual React native-host renderer and scoped commit/event bridge;
  output is not produced by calling component functions outside React.
- F3 implements the selected Android native/Web receiver and platform lifecycle,
  against a pinned backend and explicit supported embedding shapes.
- F4 implements PC native carriers/backends after the initial React route. SwiftUI
  can be assessed for a suitable Apple platform; Windows/Linux require their own
  supported realization. Tauri remains a candidate carrier, not the renderer itself.
- F5 migrates official UI plugins package by package, retaining the exact React
  feature contract and explicit Web compatibility for React-only contributions.

F1 can establish React compatibility before F2–F5 are complete. That is an integration
checkpoint, not a product release claim or removal of native scope. No native backend
must be selected merely to execute A–E.

## G. Add state, delivery and operational lifecycle

Depends on D/E and the state/distribution decisions. Specify local configuration,
private data partitions, cache invalidation, package revisions and rollback. Preserve
DSH's recovery/release behavior. An offline queue requires explicit per-method replay
and idempotency semantics; it is not a generic transport retry option.

Output: persistence/migration and update/removal/diagnostic contracts, implemented by
plugins/platform mechanisms. Verify interrupted updates, incomplete bundles, permission
revocation, logout, process death and recovery. Do not infer cross-device state beyond
actual DSH or explicitly provided synchronization capability.

## H. Keep compatibility notes and lightweight checks

Begins with A and accompanies implementation. Keep enough upstream/package/platform
version information to reproduce the environment, and report what actually ran.
Do not build a comprehensive verification framework before the client is usable.

The current practical acceptance is independent launch, connection to DSH and basic
session send/receive. Reuse existing checks where relevant, and check newly implemented
capabilities when added. Broad plugin matrices, fault injection, resource budgets and
all-device certification are not mandatory completion gates for this work.

Do not claim untried environments or native features are verified. The detailed
contract scenarios in other documents are implementation references, not an imposed
up-front test program. See [lightweight acceptance](verification-and-evidence.md).

## I. Extend integrations without replacing the base

Depends on D/E and the integration/extension decisions. An ACP provider, managed
remote environment or embedded agent is a local plugin composition exposing its own
capabilities and UI. Do not force them to emulate DSH's private session schema merely
to participate, and do not require a central mygo server.

Output: documented adapter seams and ownership rules for another integration. Exact
provider choices and managed-agent APIs are outside the information established so
far; they are not fabricated as work-ready implementation specifications.

## Dependency interpretation

A feeds B and C; B/C feed D; D plus trust/runtime choices feeds E; platform/presentation
choices and the browser baseline feed F. G spans established state/delivery boundaries.
H follows each package as evidence becomes available rather than waiting until the
end. I consumes the established plugin/instance contracts. B and C share a bootstrap
interface and can be implemented together after agreeing that interface.

## Parallel work and integration checkpoints

After A, B/C can collaborate around one explicit bootstrap/resource contract. Preserve
one authoritative task owner for shared upstream entry/module changes. Once D defines
ownership, E and F1 can advance independently against those contracts. State and local
package staging work in G can proceed when its storage/ownership inputs are established;
unsafe replay must wait for per-method remote guarantees. H accompanies every package as lightweight checks of what is actually changed.
Provider-specific I can proceed after its actual integration/capability interfaces exist.

Use checkpoints for: original-compatible independent boot; local plus remote graph
composition; two isolated active instance/authentication views; legacy React behavior
under multi-face Slot changes; native/Web interaction on a selected backend; durable
recovery/update semantics. Check the basic behavior being implemented at each checkpoint, not an exhaustive
formal test matrix. These are not product-version scopes.

## Risk alternatives

- Incomplete bootstrap/resource closure: audit the original ordered injection and all
  resource paths; use the optional thin adapter. Report original-page-only compatibility
  explicitly rather than claiming independent boot. Do not rewrite session/UI logic.
- Upstream rejects unified Slot changes: retain a minimal maintained client patch,
  affected-consumer tests and update procedure; do not split into a second plugin SDK.
- Module/origin authority cannot be isolated in a selected backend: change context,
  profile or carrier strategy. Do not put remote code in the trusted global domain.
- Native embedding/rendering fails a platform gate: revise that backend or supported
  mount shape with an explicit capability decision; preserve the React profile and
  keep native work outstanding rather than relabelling DOM as native.
- Remote cannot reconcile/idempotently replay a method: retain uncertainty and explicit
  user recovery for that operation; no blind automatic retry.
- Package rollback conflicts with migrations: require compatible state recovery or a
  diagnosed repair path. Do not roll back user data by assumption.

## Document and change ownership

Use [project definition](project-definition.md) for confirmed scope and CONTEXT.md only
for domain language. The canonical map indexes decision resolutions. Contract documents
own behavior; source notes own evidence; this plan owns dependency order and outputs.
Implementation patches carry their own code/test evidence and update the relevant
contract when a public API changes. Keep historical alternatives labelled as such.

## Deliberately deferred choices

PC native toolkit/carrier details (including SwiftUI/Tauri evaluation), cloud-provider
selection, publication channels/business model and actual device-specific performance
budgets are deferred explicitly. They do not block the current official React extraction.
Their implementation packages resolve concrete selections and try the relevant basic
behavior before claiming it works. No application build, runtime or platform result is implied.

The canonical decision map remains authoritative. The user confirmed this implementation
route as the result of this planning effort. It does not authorize implementation,
remote installation, publication, git pushes or running the deferred experiments.

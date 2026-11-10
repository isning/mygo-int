# mygo project definition

Status: project definition and implementation route confirmed, 2026-11-10.
Specific implementation selections remain deliberately deferred as documented below;
recommendations in historical documents do not override confirmed decisions.

## Destination

Define a cross-platform Cordis client architecture, its minimal base, client/remote
plugin system, existing-plugin compatibility, and a dependency-based implementation
plan. The first implementation step is to decouple an independent React client from
DSH while reusing almost all of its existing client code. Do not begin by replacing
its UI, state or plugin architecture with a newly invented client framework.

Detailed independent product features are not the focus. Use DSH behavior as the
reference where applicable. Implementation order does not divide scope into MVP,
first release or later release. This effort still plans; it does not implement the
application or execute runtime experiments.

## Confirmed starting point

- Preserve DSH's React UI, Cordis client tree, services, module/Slot contracts and
  compatible plugin behavior wherever possible.
- Identify the minimum changes required for independent boot, build, resources,
  authentication and remote transport rather than rewriting the application.
- Establish a complete client/remote plugin system alongside extraction, preserving
  compatibility with existing DSH plugins rather than requiring a new SDK first.
- Separate where a package comes from, where its code executes and which instance
  owns its services. Precise contracts follow source inspection, not naming assumptions.
- Native presentation, other harnesses and further host implementations remain
  architectural extensions. They are not prerequisites for extracting the React client.

- An optional thin DSH remote adapter may reuse existing Host capabilities without
  modifying core. Retain an explicit unmodified-DSH compatibility path; equivalent
  extension capabilities are not promised. This does not authorize installation.

## Confirmed product and architecture

- mygo is a general-purpose harness client, initially serving personal use.
- The client experience is assembled from local Cordis plugins. The base hosts
  plugins and platform mechanisms; it does not mandate a fixed universal client core.
- Chat, navigation, settings, connections, queues and application shell can be supplied
  by plugins. Their public contracts require decisions; they are not automatically
  hard-coded base responsibilities.
- The base does not understand Page, Section, chat or instance semantics. Local plugins
  define page vocabulary, navigation and rendering policy; the base supplies runtime,
  platform and native/Web presentation mechanisms.
- A local startup configuration selects the plugin composition. The shipped default
  is replaceable configuration, not a hard-coded list of chat, navigation or DSH services.
- Target platforms are Linux, Windows, macOS and Android, with complete interaction
  capabilities and device-appropriate navigation/layout.
- The remote-client experience of dsh-go is a functional/interaction reference, with
  better visibility into tool calls and subagents and a focus on responsiveness.
- Existing DSH Web plugins should remain usable through a compatible Web environment.
  Plugins adopting mygo's semantic components can integrate with native presentation.
  Arbitrary existing Web UI is not promised automatic native conversion.
- Plugin authors require standard React components, hooks and event handling. A
  custom JSX factory alone does not satisfy this requirement. Reuse React DOM first;
  native faces use a real compatible React renderer and explicit platform bridge.
- Remote harnesses are the current execution model, including user-owned computers.
  Managed isolated agents and an integrated agent core are extension directions.
- A central mygo server is not a prerequisite.
- File/diff access, interactive remote terminals and out-of-app notifications are
  scenarios the architecture must accommodate through plugins/platform mechanisms.
  Their detailed product UX is not a separate design goal in this effort.
- Cross-device state follows DSH's actual supported behavior; no independent new
  synchronization product requirement is inferred from prior recommendations.

The [client/remote boundary decision](https://github.com/isning/mygo-int/issues/24)
retains the original Cordis/Loader, package, React/Slot and Remote contracts. mygo
adds local composition, provenance/ownership and connection adaptation. Existing
plugins need no new SDK; security enforcement is a separate decision.

## Confirmed instance and plugin authority model

- An instance is a remote harness instance with its own sessions, workspaces and
  capabilities. It is not a client composition, provider or module realm.
- Multiple instances can stay connected concurrently. Switching the visible instance
  preserves other instances' state, tasks and pages without disconnecting them.
- An instance may have multiple connection profiles. Associate routes only after
  verifiable remote identity or explicit user confirmation. Reconnection does not
  create a new instance; cache private data separately by identity/access context.
  See the [instance model](instance-and-connection-model.md).
- Trusted local plugins can compose or replace the complete client shell, navigation,
  chat and settings. Remote plugins default to the scope of their owning instance
  and do not automatically acquire global application replacement authority.

## Confirmed execution and React boundaries

- Remote-supplied executable plugins run under isolation and explicit grants, without
  access to other instances' credentials, unrestricted platform capabilities or the
  global application Root. Legacy Web compatibility does not grant global authority.
- Trusted local plugins can compose the full client. Concrete isolation technology
  and implementation-level trust/revocation details follow their own contracts.
- Ordinary React context/hooks apply inside each rendering environment. Independent
  native/Web environments communicate through explicit state/service bridges; a
  transparent single React tree across them is not required.
- Native capability is unified into the existing Slot interface. A registration can
  provide React/Web and native faces; legacy registration remains valid. Do not
  introduce a separate native contribution registry. Semantic vocabulary stays in
  plugins. The necessary client patch and upstream maintenance must be explicit;
  upstream acceptance is not assumed. See [unified Slots](unified-slot-rendering.md).
- See [trust boundaries](trust-and-execution-boundaries.md) and
  [React surface semantics](react-surface-semantics.md) for design consequences.

## Confirmed navigation and platform direction

- Feature plugins express semantic structure through unified Slots; replaceable local
  navigation plugins choose desktop panes/windows and Android stacks. Page identity
  and domain state do not depend on layout or the visible instance.
- Web history and application back behavior are explicitly coordinated.
- Platform native support is implemented through platform-specific carriers rather
  than requiring one Compose/RN toolkit across all targets. Tauri is a candidate
  mentioned by the user, not a finalized universal native renderer.
- Both React and native presentation remain required. Implement the extracted React
  client first; PC native work follows later. SwiftUI is a future candidate, not a
  locked toolkit or a Windows/Linux solution. Exact backend selection is deliberately
  deferred and does not block the current React/plugin work.
- The isolated-environment/module-domain model is confirmed: trusted local composition
  and remote compatibility environments are separate; instance/authentication views
  retain module, DOM, storage and authority boundaries without mandating one process
  per instance. Legacy plugins retain real browsers; native faces use real React.

## Confirmed state, delivery and integrations

- Remote business facts retain remote authority. Local plugins provide caches,
  declared drafts and optional durable outboxes; replay requires actual remote
  idempotency/receipt guarantees. Unknown outcomes are reconciled, and expired
  approvals are not replayed. No mandatory synchronization center is introduced.
- Local composition versions are fixed and installation/update is explicitly chosen.
  Remote client entries follow their Host graph without updating the global client
  or widening grants. Recovery must account for compatible state migrations.
- Integrations can supply their own protocols, state and UI, optionally sharing
  explicit capability contracts. ACP does not need to emulate DSH private models;
  actual carrier/execution location and features must be stated.
- See [state](state-and-offline-contract.md), [delivery](plugin-delivery-contract.md)
  and [integrations](harness-integration-contract.md) for their design obligations.

## Confirmed composition, providers and maintenance

- Provider plugins own environment creation/lease/release, integrations own protocol
  and sessions, carriers own reachability. A future embedded core is an explicit
  local execution provider, not implicitly started by remote UI code.
- The default local composition maximally reuses original DSH services/UI and supplies
  shell/instance/connection roles through replaceable local plugins. Shared capabilities
  have explicit contracts; DSH private services need not become a universal model.
- Maintain a pinned upstream/ABI/platform compatibility matrix and reproducible source,
  artifact and recovery records. Channels, business model and PC native toolkit are
  intentionally deferred. Artifact licenses and release requirements must be checked
  before actual reuse/distribution; no blanket compatibility/clearance is claimed.
- Detailed contracts: [providers](execution-provider-boundaries.md),
  [composition](default-client-composition.md), [maintenance](distribution-and-maintenance.md).

## Confirmed acceptance scope

The user explicitly rejected complex acceptance in favor of getting it running.
Use a lightweight practical smoke check for the extracted client: independent launch,
DSH connection and basic session send/receive. Do not make broad automated matrices,
fault injection, all-platform checks or performance programs prerequisites. Check
additional capabilities as implemented and report actual results without overclaiming.
Detailed scenarios in contract documents are references, not an up-front test program.
See [lightweight acceptance](verification-and-evidence.md).

## Status of earlier architecture documents

The prior theoretical reasoning is a source of design alternatives and failure
analysis, not a record of user-approved implementation choices. In particular:

- Mandatory per-connection realms have not been approved.
- Kotlin/Compose, QuickJS and a particular Web backend have not been selected.
- Descriptor-only JSX is insufficient for the now-confirmed standard React target.
- Navigation, offline queues and shared client profiles are plugin roles, not fixed
  base-owned product services.
- References to first-release scope or release-by-release prioritization do not define
  the destination of this effort.

The [base-boundary decision](https://github.com/isning/mygo-int/issues/2) follows
DSH's layered startup diagnostics, local error containment and platform-carrier
fatal recovery. It does not adopt a fixed recovery application, automatic plugin
disabling or a configuration picker. Concrete platform/repair contracts remain
with their respective decisions. See the [source evidence](../research/dsh-recovery-facts.md).

The user confirmed the [implementation route](implementation-dependency-plan.md):
first independently run the original React client, then complete client/remote
composition and multi-instance isolation, followed by unified Slot native faces,
Android and later PC native support. State/update and other integrations follow
their dependencies. This completes planning only, without implementation authorization.

The canonical [wayfinder map](https://github.com/isning/mygo-int/issues/1) indexes
decision tickets. Each resolved decision's detail belongs in its ticket; this file
records project definition context rather than duplicating ticket resolutions.

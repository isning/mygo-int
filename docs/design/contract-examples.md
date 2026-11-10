# Contract examples and decision register

Status: illustrative proposal, 2026-11-09. Names and shapes are not implemented APIs.
This is an earlier alternatives/example register. The completed reference design in
`design-resolution.md` and `protocol-specification.md` takes precedence over its open branches.

## 1. Minimal integration boundary

```ts
interface IntegrationDefinition {
  id: string;
  configurationSchema: JsonSchema;
  connect(context: ConnectionContext): Promise<IntegrationInstance>;
}

interface ConnectionContext {
  connectionId: string;
  generationId: string;
  services: GrantedPlatformServices;
  signal: AbortSignal;
}

interface IntegrationInstance {
  status: Observable<ConnectionStatus>;
  contributions: Observable<ContributionSet>;
  capabilities: Observable<CapabilitySet>;
  dispose(): Promise<void>;
}
```

The application consumes identity, lifecycle, status, and contributions. It does not
assume a particular session API. An integration can register optional common profiles
and namespaced services inside its Cordis domain. Cross-realm service access resolves
to a proxy with a declared version and method set.

An ACP adapter can contribute a common chat experience plus extensions. A DSH adapter
can reuse existing DSH session/settings services and richer presentation. Neither
must emulate the other's private service tree. Reusing generic UI depends on choosing
to implement its profile, not merely registering a harness name.

## 2. Semantic page description

```ts
interface PageDefinition {
  id: string;
  title: LocalizedText;
  parameters: JsonSchema;
  stateVersion: number;
  sections: SectionDefinition[];
  actions: ActionDefinition[];
  detail?: { routeId: string; resourceParameter: string };
}

interface ContentDefinition {
  id: string;
  faces: {
    native?: { entry: string; requires: CapabilityRequirement[] };
    web?: { entry: string; bridgeProfile: string };
  };
}

interface NavigationRequest {
  intent: "open" | "detail" | "section" | "present" | "dismiss";
  target: RouteReference;
}
```

A route target names plugin and connection authority; it does not ask to create an
arbitrary native widget. Desktop and Android presentation policies interpret the
same semantic request. A section may request a default selection, while the host
restores a valid previously selected section.

Descriptions crossing a realm boundary are data. Entry names resolve only to
registered exports in an authorized package generation; they are not arbitrary
expressions to evaluate. Events refer to registered action handles.

## 3. Example workflow

The tasks plugin contributes a tasks page with active/history sections and a task
detail relationship. The native shell displays page controls. Each selected section
mounts a Web dashboard or a native content face.

Clicking task A calls the navigation service with a detail intent and resource A.
The host adds/selects the logical detail route. PC may show it alongside the list;
Android pushes it. The detail surface subscribes to task A through its connection
service, independent of where the host placed it.

Switching sections changes route state. Resizing changes layout. Neither action
submits business operations. Closing a surface stops its observations; it does not
terminate the underlying agent task.

If the plugin puts its entire workflow inside one Web surface, it owns internal Web
navigation and receives only surface-level host adaptation. Native host adaptation
requires explicit semantic declarations; it cannot infer them from DOM or URLs.

## 4. Durable operation result

```ts
type OperationAcceptance =
  | { kind: "local"; operationId: string; state: "queued" }
  | { kind: "remote"; operationId: string; receipt: JsonValue }
  | { kind: "rejected"; reason: OperationError };
```

This is the proposed mygo operation service shape, not a change to all DSH Remote
return types. A DSH adapter can reconcile existing beginSubmission/receipt behavior
with it. The operation's observable reports later transitions and unknown outcomes.
The common service stores and schedules records; the integration defines execution,
deduplication, reconciliation, and lane semantics. This avoids two independent retry
owners while reusing storage and lifecycle infrastructure.

## 5. Capability and version negotiation

Negotiate separate axes: bridge ABI, semantic-page schema, native-node schema,
renderer feature set, optional shared service profiles, and integration protocol.
An application version alone is not a sufficient capability check.

Feature availability is the intersection of application implementation, platform
support, integration/host support, and grants. Required missing capabilities reject
activation or the affected contribution. Optional missing features degrade locally.
Transport connection and successful negotiation precede business-ready status.

## 6. Decision dependencies

Resolve the following through design before selecting implementation libraries:

1. Define required PC operating systems and native/platform responsibilities.
2. Define trust levels and whether downloaded arbitrary code is allowed in shared
   execution contexts. This constrains the engine and Web isolation architecture.
3. Define module ABI and realm boundaries. This constrains DSH code reuse and versions.
4. Define semantic routes, Slot policies, and ownership. This constrains SDK behavior.
5. Define observable/event and storage/operation contracts. This constrains recovery.
6. Specify minimum useful native node vocabulary and Web compatibility coverage.
7. Compare toolkit/engine options against these requirements and document tradeoffs.

Theoretical walkthroughs can reject inconsistent contracts without runtime work.
Performance, exact upstream DOM independence, engine feature completeness, and
third-party maintenance remain empirical/source-audit questions. A complete design
must name these assumptions rather than treating them as proven.

## 7. Proposed decisions and alternatives

### A. Module isolation

Preferred: connection-generation realms. Alternative: a shared realm only for an
explicitly compatible version cohort. Rejected default: one global module table for
all arbitrary remote versions. Pooling is later optimization.

### B. UI authoring

Preferred initial contract: descriptors/observables with a JSX facade, separate DOM
entries. Alternative: full custom React reconciler for hooks and lifecycle. This
alternative is compatible with the wire design but adds a maintained rendering runtime.
The JSX facade alone must not be marketed as full React semantics.

### C. Remote upgrades

Preferred: stage and replace one connection generation. Alternative: audited live
replacement for narrowly compatible modules. Rejected default: forwarding arbitrary
DSH development HMR into the production native client.

### D. Existing plugin compatibility

Support explicit tiers: business services only; common tool metadata; native face;
semantic mygo page; DSH browser-host compatibility. These are independent capabilities,
not a single compatible/incompatible badge. Initial product coverage is undecided.

### E. Application root

Allow authorized application plugins to provide Root. Connection plugins contribute
to bounded subtrees. Keep bootstrap recovery outside plugin replacement. This preserves
extensibility without letting a remote host own the whole installed application.

## 8. Items that remain product choices

- PC platform coverage, especially Linux.
- Which dsh-go remote workflows define the first-release acceptance list.
- Which missing DSH plugin views may be placeholders versus Web fallback.
- Whether ordinary React hooks are a first-release plugin authoring requirement.
- Whether user-approved downloaded plugins are trusted peers or require hard isolation.
- Offline requirements per feature, including attachments and cross-device behavior.

The architecture exposes these choices; it does not silently choose them on the user's
behalf. Engine/toolkit, commercial distribution, and store policy conclusions are not
settled by this document.

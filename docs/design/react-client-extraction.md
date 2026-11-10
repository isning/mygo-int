# DSH React client extraction and plugin architecture

Status: extraction-first planning proposal, 2026-11-10. This document supersedes any
earlier suggestion to build a new native/headless client before extracting DSH's
existing React client. No implementation, build or runtime experiment is performed.

## Confirmed direction

Start from DSH's official React/Cordis client and reuse almost all existing code.
Decouple its application entry and deployment from the Host while preserving existing
client services, UI and plugin behavior. Establish complete client/remote plugin
contracts and compatibility on that foundation, not by replacing it with a new SDK.

mygo remains a minimal base plus local plugin composition. DSH's application-specific
defaults can remain an intact default composition; they do not become universal base
knowledge. Other integrations and native presentation extend the architecture later
in dependency order, not as separate product-release scope.

## Source baseline and evidence

Planning baseline: DSH `fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159`.
Source package descriptions already distinguish `apps/web`, a Vite app entry, from
`packages/client/web`, the exported browser boot kernel. It does not follow that
these two directories alone form a complete independently buildable client.

Focused research:

- [Minimal extraction dependencies and changes](https://github.com/isning/mygo-int/issues/21).
- [Existing client/remote plugin contracts](https://github.com/isning/mygo-int/issues/22).

Completed evidence is in [extraction research](../research/dsh-react-extraction.md)
and [plugin-contract research](../research/dsh-client-remote-plugins.md). The resulting
[client/remote architecture draft](client-remote-plugin-architecture.md) preserves
upstream contracts. An optional thin remote adapter is permitted, without changing
DSH core. Retain a separately specified unmodified-Host compatibility path and
report capability differences rather than assuming equal fidelity.

Existing [remote-project source comparisons](../research/dsh-remote-reference-patterns.md)
provide reference patterns for carriage, authentication and split plugins. A served
official page is distinct from independently booting the extracted local client.

## Preservation rules

1. Reuse the existing React DOM renderer and component behavior. A custom reconciler,
   JSON component language or headless engine is not an extraction prerequisite.
2. Preserve Cordis lifecycle, service injection and loader conventions rather than
   introducing a second competing client plugin manager.
3. Preserve package/module identities and shared React/Cordis/store/UI singletons
   needed by existing bundles. Do not rename upstream public module IDs merely to
   rebrand the application or bundle duplicate framework copies.
4. Preserve Slot contracts, standard data sources, Remote descriptors, configuration
   and resource behavior needed by existing plugins.
5. Adapt deployment/connection seams without rewriting session state or feature UI.
6. Treat actual plugin compatibility as a tested contract, not a statement implied
   by the existence of a WebView or matching JSX syntax.

## Separate the two dependency closures

The static shell closure contains the app entry, boot kernel, module system and its
platform-seeded shared libraries. The Host graph supplies many actual client services
and UI plugins dynamically. The same package may participate in build tooling without
being part of the statically shipped runtime. Trace imports and generated artifacts;
do not copy all workspace devDependencies as if they were production requirements.

An independent application can still consume compatible instance-provided manifests,
modules and services. Independent boot/deployment does not imply eliminating all
dynamic plugin delivery or statically repackaging the complete Host graph.

## Plugin dimensions

Keep three dimensions explicit:

- Source: installed with the local client composition or provided by an instance.
- Execution: device client runtime or remote harness runtime.
- Ownership: application composition or a particular instance composition.

A remote-supplied client contribution executes on the client. A server-side plugin's
root code is not thereby downloaded to run on the device. Split plugins retain their
two halves and existing communication semantics. The exact discovery constraints
must follow upstream code; do not assume that a truly rootless client-only package
is already discoverable by a Host-oriented manifest composer.

The target is a common Cordis model with explicit provenance/ownership and adapters,
not two unrelated plugin frameworks named client and remote.

## Implementation work packages

### A. Pin and map upstream ownership

Record baseline, reused paths/package versions, generated artifacts, license notices
and original tests. Classify each dependency as static shell, dynamic client package,
Host service, build/codegen tool or optional feature. Preserve a reviewable upstream
delta; avoid unrelated refactoring and package-name churn.

Completion: every retained entry has a known dependency/source owner and every proposed
change names the deployment coupling it removes. No build result is claimed by mapping.

### B. Extract the original browser shell

Reuse the official application/boot entry and platform module table. Provide a local
launch configuration selecting the initial composition and remote target. Keep the
existing React UI/renderer and client logical services; make only required entry,
path, build and environment adaptations.

Completion: the planned build boundary accounts for original imports/codegen/style
inputs and identifies its required remote bootstrap contract. Later execution must
demonstrate that it launches independently; reading package exports is not that proof.

### C. Adapt bootstrap, resources and remote carriage

Acquire and apply the compatible instance's full boot contract, not merely a graph
variable. Retain package revisions, assets, CSS, locale/theme and service/resource
endpoints as required by original code. Map authentication and every actual request
path, including direct fetch/DOM asset access that bypasses logical RPC hooks.

Completion: each path has a documented authority/base URL and authentication rule;
all required module and resource requests are accounted for. A base-URL switch alone
is not considered a complete cross-origin or packaged-app solution.

### D. Make client and remote compositions explicit

Load trusted local client entries through the established loader conventions. Scope
instance-provided entries and remote proxies to their owning instance. Distinguish
service dependencies from UI contributions and package provenance from execution.
Expose extension seams for other remotes without normalizing DSH private models first.

Completion: installation, activation, update and disposal ownership are specified;
module collisions and incompatible shared singletons have explicit handling. Do not
default to one engine per instance before assessing the existing loader's options.

### E. Preserve and verify existing plugins

Define compatibility for module registration/externals, React and shared services,
Slot props/data sources, Remote calls, config, assets and lifecycle. Reuse original
plugin fixtures/tests where available. Classify any required adaptation precisely.

Completion: compatibility claims cite a contract/version and eventual evidence. A
legacy plugin need not adopt new mygo semantic components merely to keep working.

### F. Extend hosts without changing the extracted foundation's identity

Integrate simultaneous instances and PC/Android carriers through the established
plugin/runtime seams. Native semantic faces, alternate renderers and other harnesses
can then be added without rewriting the preserved React baseline. Each extension
must keep the original-compatible execution profile available where required.

Completion: host and plugin assumptions are explicit; no native framework or engine
selection is smuggled into the extraction task. Platform-specific claims require their
own validation, not inference from the browser build.

## Decision order and verification

Source closure and plugin-contract research feed the extraction-boundary decision;
that feeds client/remote ownership and compatibility decisions. Multi-instance,
platform execution, native rendering and packaging follow these contracts rather
than blocking extraction with a hypothetical replacement framework.

Actual implementation validation should retain upstream behavior tests and add
standalone boot/remote/resource, local-plus-remote plugin, disposal/update and version
compatibility checks. This document defines their purpose only; no test was run.

Detailed consumer-product workflows are not the destination. Files/diffs/terminal and
application-external notifications serve as architecture scenarios. Cross-device
state follows the actual selected DSH capability, without inventing a separate sync
product or claiming an unsupported feature.

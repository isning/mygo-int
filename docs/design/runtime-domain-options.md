# Execution domains and carrier options

Status: isolated runtime/module domains and platform-specific carrier strategy are
confirmed, 2026-11-10. Exact platform/engine/backend implementations are not selected.
The shared obligations are in [platform carrier contract](platform-carrier-contract.md). The original React client is extracted before native/headless
extensions; the eventual complete architecture still covers all target platforms.

## Required domain separation

Separate executable compatibility from authority:

- A trusted local composition can access granted platform mechanisms and assemble
  application Root. Installation source alone does not establish trust.
- An instance compatibility environment hosts the original React/Cordis client graph
  for an admitted remote/authentication view. It cannot inherit global native authority.
- Semantic presentation uses unified Slot faces through a real renderer and scoped mount channel.
  Its relationship to the local composition depends on the chosen renderer/carrier.

A Cordis context can organize services and lifecycle inside a domain. A module table
binds executable identities and singleton versions. A browser origin/document governs
DOM, CSS and browser permissions. An engine/runtime owns a JS heap and execution.
An OS process governs a different resource/crash boundary. None is a synonym for
instance, authentication view or another item in this list.

## Module coherence

Within one official-compatible environment, preserve upstream module IDs and bind
React/React DOM/Cordis/UI singletons coherently. Do not import a remote React component
object into a local root whose renderer resolves a different React instance. Use an
explicit surface/data boundary instead. Conflicting versions do not merge by source
priority, URL rewriting or service isolation.

Concurrently connected instances need not share an official module table. They can
use isolated compatible environments while platform backends share process resources
where the backend's actual isolation permits it. Conversely, two matching releases
must not share cookies, browser storage or credentials solely to save memory.

Shared immutable package bytes are different from shared evaluated module objects.
A cache can deduplicate verified artifacts keyed by origin/identity/revision/hash as
appropriate, while each execution environment has its own module records and state.
Do not treat an upstream `rev` as a cryptographic content hash unless verified as such.

## Browser compatibility environment

The least transformative path for arbitrary legacy React/DOM plugins is an actual
browser document with a coherent bootstrap, origin and resource context. Carrier
choices include system WebViews and embedded browser backends; support/partitioning
behavior must be established on every selected platform.

An iframe can provide some browser isolation if origin/sandbox policy is correct,
but same-origin frames with shared privileged objects are not an independent security
boundary. A WebView may share a global cookie store with others by default. Choosing
one control per surface does not automatically prove separate storage, credentials,
permissions or navigation safety.

No privileged bridge should survive navigation into an unrelated document. Bind
channels to the mounted origin/document generation, and close handles when it changes.
A local origin facade/proxy can preserve root-relative resource paths, but must retain
separate instance admission and must not turn arbitrary upstream URLs into a local
privileged request service. Same-origin facade design is a first-class contract.

## Framework selection timing

The user selected platform-specific native support, both React/native presentation,
and React extraction before PC native work. Specific desktop/native toolkits are
intentionally deferred; SwiftUI is a candidate to consider later. The shared carrier
ports and module/authority boundaries are the current runtime decision. No mandatory
Compose/RN stack, Tauri dependency, headless engine or per-instance OS process is chosen.

## Historical carrier alternatives

Existing source research establishes building blocks, not validated combinations:

- Compose/Kotlin: declared Android plus desktop Linux/Windows/macOS targets; native
  semantic presentation needs a real React-to-host renderer/bridge, and desktop Web
  embedding needs a deliberate browser backend with interop/IME testing.
- React Native: a supplied React/native renderer and Android ecosystem; Windows/macOS
  are separate platform implementations, and the Linux/Web embedding route needs
  explicit ownership rather than assuming parity with core RN.
- Browser-centric carrier: minimizes changes to official React execution; a real
  native component/embedding extension is still required to meet the complete mixed
  presentation goal. A browser wrapper alone does not fulfill that goal.

Possible JS hosts include browser engines and headless embeddable engines. A headless
engine is not mandatory for extraction and does not supply browser compatibility.
Selecting one requires module boot, scheduling, debug, cancellation, packaging and
performance validation. No QuickJS/Hermes/V8 preference is inferred from the word Cordis.

## Native faces without a headless prerequisite

A browser JS engine can execute a real native host React renderer as well as the
original React DOM renderer, provided each tree resolves coherent framework modules.
The native renderer emits mount/update operations through an authorized platform
bridge; it need not paint DOM. This is a candidate, not a tested renderer/backend.
It preserves a route to native faces without requiring headless execution of every
legacy DSH package.

A separate engine is another option for native-capable code, but requires its own
module loading/service bridge and cannot receive live components by serialization.
Select this for established runtime benefits rather than merely to label the UI
native. Both models retain explicit boundaries for independent Web surfaces.

## Base ports and plugin services

Keep base mechanisms narrow: runtime/module evaluation and lifetime, scoped storage
and credential primitives, cancellable I/O, surface mounting and native events,
platform lifecycle and diagnostics. Exact ports depend on the chosen carrier and
must not become a second universal plugin manager.

Connection management, instance catalog, page/navigation semantics, offline queues,
package delivery policy and integration-specific services belong to plugins. A base
can expose primitive stores/channels without knowing a session or workspace schema.

## Failure and background behavior

Keep original DSH connection recovery authoritative inside its environment. Carrier
lifecycle signals inform plugins; they do not imply an always-running Android runtime.
The notification contract must select an actual delivery mechanism rather than assume
a suspended WebView can receive events. Rebuilding a killed environment obtains a
compatible baseline and declared durable state; it cannot restore arbitrary live hooks.

CPU/memory constraints, JS cancellation and crash containment depend on backend
capabilities. Teardown of a Cordis fiber alone cannot stop hostile synchronous code.
The chosen carrier must state the actual guarantees and corresponding limits.

## Implementation selections for each backend

For each scheduled platform implementation, select its carrier under the shared
contract, legacy Web backend and origin/storage partitioning, trusted local JS
placement, native React renderer and scoped bridge realization. Preserve the selected
module/authority, debugging and recovery responsibilities. Pin compatible versions and describe measurements still
required during implementation. A useful design can be theoretically consistent while
its performance/IME/native-embedding feasibility remains an explicit validation gate.

## Evidence

- [Platform/runtime primary-source research](../research/platform-runtime-facts.md)
- [React mechanisms](../research/react-ui-mechanisms.md)
- [Official extraction seams](../research/dsh-react-extraction.md)
- [Existing remote carriers](../research/dsh-remote-reference-patterns.md)

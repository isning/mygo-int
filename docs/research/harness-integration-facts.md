# Harness integration facts

Research date: 2026-11-10. Planning research only: source and official documentation were read; no application build, runtime experiment, engine benchmark or plugin compatibility test was performed.

## Scope and evidence rules

The project is a generic harness client assembled from local Cordis plugins, not a DSH-shaped universal client. Trusted local plugins may replace the complete shell; remote plugins are confined to their owning instance by default. Multiple remote instances remain connected concurrently. These are confirmed product requirements in [the project definition](../design/project-definition.md), not conclusions drawn from upstream code.

DSH sources below are pinned to `fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159`; dsh-go sources to `2432cbdcc92f4a2ced6e8ffeba648af0f832eb98`. ACP documentation is the live official v1 documentation read on the research date, not a claim about either pinned repository's contemporary ACP support. “Source fact” means observed contract/code; “inference” means architectural consequence; “proposal” means work mygo or upstream would need; runtime behavior remains unverified.

## DSH bootstrap and headless reuse

**Source facts.** DSH exposes `ClientTransportHooks`: decoded logical `rpc`, `fetch`, `openStream`, `loadBundle`, `resolveAsset`, `ownsHost`, `createWebSocket`, and `streamBaseUrl`. A supplied `rpc` replaces HTTP calling rather than merely replacing fetch. `ownsHost` represents an exclusively shell-owned Host and conveys privileged loopback reachability; a remote connection must not set it merely to bypass restrictions. [Connection contract](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/client/connection/src/client/index.ts#L84).

`bootInjections()` emits the `window.__ModuleLoader__` registration facade and `__DSH_BOOT__` graph through HTML injections. The module system has injectable bundle loading, but its default loader creates a script element and appends it to `document.head`. Some style bookkeeping checks for absence of document; that is not proof that every loaded package is DOM-free. [Boot injection](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/client/modules/src/index.ts#L602), [module system](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/client/modules/src/client/system.ts#L16).

The Host package-declaration reader accepts only `dsh.client.platform === 'web'`. `bootClient` composes Loader entries and audits a required-entry list containing renderer, layout, session UI, chat and sidebar. It is not already a generic minimal headless boot profile. [Platform filter](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/client/modules/src/index.ts#L905), [boot and required entries](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/client/web/src/boot-client.ts#L25).

**Inference.** Reuse has concrete seams, but a headless shell must supply compatible bootstrap registration, graph acquisition, module seeds, bundle execution and required-entry policy. A hook's existence is not proof that arbitrary packages run in QuickJS/Hermes/V8 without additional facilities. No independent manifest JSON endpoint was established by the inspected paths; the observed acquisition path is HTML injection. Absence across the entire repository was not exhaustively proven.

**Proposal.** Expose a manifest endpoint or implement a version-specific HTML bootstrap adapter. Define a logical entry profile using actual dependency closure. Do not filter every package lacking a native UI face: a package may provide essential logical services as well as React UI. Changes to upstream platform filters or boot contracts need explicit upstream acceptance or a maintained adapter/fork; none is an existing mygo capability.

## Existing React plugins and Slot/native adaptation

**Source facts.** The browser shell seeds React, JSX runtime, React DOM, Cordis, zod, react-virtual, store, ui-slots, ui-primitives and ui-dockkit. The UI plugin authoring guide expects lazy factories, the shared React module table, external declarations, Cordis lifecycle cleanup, slot contracts, locale and theme inheritance. It explicitly discourages appending a second application to document.body. [Platform seeds](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/client/web/src/platform.ts), [UI plugin guide](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/preset/agent-preset/skills/cordis-plugin-development/references/ui-plugin.md).

Slot storage accepts an unknown component internally, but the public `SlotComponent` returns ReactNode. `SlotRenderer.renderRoot` returns ReactNode and `entriesOfSlot(key)` has no renderer-face argument. Thus an unknown storage field is not a supported multi-renderer contract. [Registration types and election](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/client/ui-slots/src/index.ts#L434), [renderer interface](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/client/ui-slots/src/renderer.ts#L268).

**Inference.** Existing DSH Web UI compatibility requires a compatible browser execution environment AND DSH client services/slot props/module identities. Loading a plugin's HTML or providing React alone is insufficient. Standard React hooks require an actual React rendering lifecycle; descriptor-producing JSX alone does not satisfy the product requirement. A compatibility environment should keep DSH's Web renderer for legacy plugins, without claiming automatic native conversion.

**Proposals.** Renderer faces, per-renderer election, generic node return types and semantic page contributions are possible extension designs, not observed upstream capabilities. Define fallback for missing faces separately from election; Root or a required workflow cannot silently disappear. Decide whether adaptation is upstream, a local layer, or mygo-specific SDK in a human decision ticket.

## Concurrent Host versions and plugin authority

**Source facts.** ClientModuleSystem maintains factories, graph rows and exports keyed by module IDs, with one platform seed map per module-system object. Replacing/removing a bootstrap module requires reload. The factory-form loader rejects require cycles requiring partial exports. [Module-system implementation](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/client/modules/src/client/system.ts#L97).

**Inference.** Two Hosts may use identical package IDs with different implementations. Sharing one table cannot represent both under the same ID; Cordis child scopes alone do not alter that map's key space. Separate module systems/registration namespaces or explicit version remapping are alternatives. This does not imply a mandatory OS process, JS engine or full realm per connection. Shared React components must resolve the matching renderer/React identity.

A Cordis ownership scope governs lifecycle and services, not access to all JS globals or platform bridges. Enforcing the confirmed remote-instance boundary therefore needs capabilities and an execution-boundary design beyond naming a scope. Instance identity, module-domain identity and displayed page identity should remain separate.

**Unverified.** Safe migration/HMR across Host versions, cache atomicity, memory cost of isolation, complete disposal of third-party code, and arbitrary-package compatibility. No implementation strategy is selected here.

## DSH versus dsh-go capabilities

**Source facts from pinned dsh-go documentation.** dsh-go's native plugin path adds its own `dshGo` declaration and `ctx.dshGo` Host API; the DSH browser does not see them. A plugin may ship both `dsh.client` and `dshGo` halves. Host support documentation distinguishes tool cards carried in conversation data from additional surfaces requiring `dsh-go-bridge`. Its relay-host profile does not forward `/dsh-go/*` and provides no Web plugin page. SSH bridge installation is documented as not yet supported at this pin. These statements describe dsh-go's profiles, not every possible DSH transport. [Host coverage](https://github.com/ccch1mneyyy/dsh-go/blob/2432cbdcc92f4a2ced6e8ffeba648af0f832eb98/docs/plugins/hosts.md), [native registration](https://github.com/ccch1mneyyy/dsh-go/blob/2432cbdcc92f4a2ced6e8ffeba648af0f832eb98/docs/plugins/slots.md).

Web panels have slot/name discovery, host availability, route guard, resource-budget and timeout conditions, and can fall back to the full Web UI. Some island modes require the phone's own engine. The docs do not promise arbitrary plugin-cell deep linking. Consequently “Web plugin support” is conditional even in the reference client. [Web panels](https://github.com/ccch1mneyyy/dsh-go/blob/2432cbdcc92f4a2ced6e8ffeba648af0f832eb98/docs/plugins/web-panels.md).

The native UI vocabulary has a published schema, but it is a dsh-go-specific protocol, not DSH's universal JSON-native UI API. [View schema](https://github.com/ccch1mneyyy/dsh-go/blob/2432cbdcc92f4a2ced6e8ffeba648af0f832eb98/sdk/plugin-kit/schema/view.schema.json). The architecture evaluation explicitly says it is design rather than implementation and gives simulator Web-island measurements. Those numbers cannot establish mygo's performance or a universal WebView cost. [Evaluation](https://github.com/ccch1mneyyy/dsh-go/blob/2432cbdcc92f4a2ced6e8ffeba648af0f832eb98/docs/design/native-plugins.md).

**Proposal.** Choose independently whether to implement dsh-go bridge compatibility, DSH Web host compatibility and mygo-native contributions. Inventory actual carrier routes, Web assets, cookie/auth behavior and subscriptions for the chosen remote service. The generic name “dsh-remote” does not identify a verified service implementation or forwarding contract in this research.

## ACP remote integration and execution location

**Current official facts.** ACP v1's transport specification defines stdio and permits custom bidirectional carriers preserving JSON-RPC lifecycle. Its remote HTTP/WebSocket transport is still an Active RFD, not the stable v1 transport. [v1 transports](https://agentclientprotocol.com/protocol/v1/transports). The proposal describes a shared endpoint, HTTP/2 SSE streams plus POST/DELETE, or WebSocket; these are proposal requirements rather than universal agent support. [Remote transport RFD](https://agentclientprotocol.com/rfds/streamable-http-websocket-transport).

The official Python SDK separately documents optional experimental remote transports. SDK availability does not make every stdio ACP agent remotely addressable. [Python SDK Web transport](https://agentclientprotocol.github.io/python-sdk/web-transport/).

In v1, filesystem calls are agent-initiated requests to the client and are capability-gated; they can expose unsaved client editor content. [v1 filesystem](https://agentclientprotocol.com/protocol/v1/file-system). Terminal methods likewise request execution in the client's environment and require advertised support. [v1 terminals](https://agentclientprotocol.com/protocol/v1/terminals).

**Inference.** A remote ACP deployment needs a concrete transport endpoint or an intermediary that launches an agent and relays both request directions. It must determine whether “client filesystem/terminal” means remote workspace services or device-local capabilities. A phone UI must not inadvertently advertise execution capabilities it cannot or should not provide. Authentication, process ownership, workspace mapping, reconnection/session restoration and multi-device ownership require deployment-specific contracts; ACP JSON-RPC by itself does not provision them. Such an intermediary need not be a central mygo server: a user-owned machine can host it.

**Unverified / open.** Specific ACP agents' resumption, listing, subagent detail, extension and remote-transport support; compatibility of a chosen gateway; lifecycle after losing a phone connection. The live documentation also exposes a v2 draft; mygo must select a protocol version rather than silently combining v1 behavior with v2 draft features.

## Decision inputs and completion limits

The evidence supports multiple implementable directions: reuse version-pinned DSH client packages with a supplied host environment; implement a DSH wire adapter; combine both within a replaceable local integration plugin. It does not select one. Compare API-change burden, legacy Web compatibility, model fidelity, packaging and maintenance in the integration decision ticket.

The minimal base can remain harness-independent. DSH bootstrapping, compatibility and any dsh-go bridge should be integration-plugin responsibilities except the generic runtime/platform mechanisms they consume. ACP requires a specified remote carrier, not a presumption of an already-deployed gateway. Multi-instance support requires module identity and authority decisions but does not prove a mandatory realm-per-instance architecture.

No source-only study can certify runtime bootstrap, complete third-party compatibility, security containment, memory, latency or frame rate. Those remain future verification obligations; they are not tasks executed by this planning research.

# mygo：单一客户端 Cordis 组合、原插件兼容与统一管理

## Problem Statement

mygo 要成为由插件组合的通用 harness 客户端。用户希望沿用 DSH 已经存在的 client／remote 分边与 RPC，直接使用现有插件，并由自己的客户端插件覆盖导航、设置和管理界面，而不是维护第二套业务客户端。

当前实现先创建 mygo 本地 Context／Loader，再由官方外层入口创建 DSH 客户端 Context／Loader；两者虽然共享部分模块，却拥有不同的服务上下文和 Slot 注册表。本地设置通过额外 React Root 和浮动入口呈现，外壳又包在官方界面之外。它证明了复用链路，但尚未实现用户期望的统一客户端组合。

如果仅合并界面而保留这套装配边界，本地 UI 覆盖会依赖额外桥接；如果直接把远端清单当作全部本地条目的真相，又可能在同步时移除本地插件。统一管理还必须防止本地启停、配置和升级误操作远端 Host。

## Solution

由 mygo 创建和拥有唯一的客户端 Cordis 根，复用原 Loader、模块加载与 DSH 客户端装配机制，将本地插件和所选实例下发的原 client 半边装配到同一客户端组合中。远端 Host 继续运行自己的服务端树，两端使用现成的 Remote／RPC 与事件流。

插件不需要为 mygo 修改源代码、包声明或采用新 SDK。mygo 承担固定 DSH 基线下的环境兼容与装配适配责任。客户端插件仍在客户端执行，不把任意 React 组件序列化成新的远程 UI 协议。

统一导航、实例入口、Settings 和插件管理由本地插件扩展或覆盖官方 UI 贡献。用户在同一页面查看本地、实例 client 与 Host 插件，但每项操作明确对应其实际所有者、能力与权限。默认客户端不再提供第二层外围导航和独立浮动本地设置窗口。

本地插件的安装、启停、配置和升级只改变客户端。远端 Host 的插件、配置和执行环境不会被这些本地生命周期操作自动修改。明确的远端管理操作仍可经所属实例的原认证与权限系统执行。

## User Stories

1. As a mygo user, I want one client composition, so that navigation and settings belong to one application.
2. As a mygo user, I want local and DSH client plugins to share the client runtime, so that they can cooperate through original services and Slots.
3. As a DSH plugin author, I want my existing client entry to run unchanged, so that supporting mygo requires no dedicated adaptation.
4. As a DSH plugin author, I want original package identities and dependencies preserved, so that existing imports continue to work.
5. As a DSH plugin author, I want original React and Cordis singleton identities preserved, so that hooks and service contracts remain valid.
6. As a client composition author, I want to choose local entries through startup configuration, so that the default composition remains replaceable.
7. As a client composition author, I want the base to own runtime mechanisms only, so that product semantics remain in plugins.
8. As a client composition author, I want local and instance modules resolved by compatible loading mechanisms, so that I do not maintain a second Loader.
9. As a mygo user, I want startup failures to retain useful original diagnostics, so that missing dependencies are identifiable.
10. As a mygo user, I want one navigation surface, so that a second outer sidebar does not compete with the harness interface.
11. As a mygo user, I want instance selection in the application navigation, so that I can find the current connection without opening a separate shell.
12. As a mygo user, I want saved selection distinguished from an actual connection, so that an unavailable profile never appears connected.
13. As a mygo user, I want local settings inside the original Settings experience, so that I do not manage a separate floating window.
14. As a mygo user, I want a unified plugin management page, so that I can inspect all relevant contributions together.
15. As a mygo user, I want plugin source and owner visible, so that I understand which runtime a change affects.
16. As a mygo user, I want plugin lists filterable by source and instance, so that similarly named entries remain distinguishable.
17. As a mygo user, I want local plugin toggles to control actual local Loader entries, so that runtime state is not confused with desired configuration.
18. As a mygo user, I want local configuration edits to remain device-local, so that they do not change my Host configuration.
19. As a mygo user, I want accepted local edits restored after reload, so that my client composition persists.
20. As a mygo user, I want rejected configuration edits rolled back with diagnostics, so that a failed edit does not silently become saved startup state.
21. As a mygo user, I want recovery to the operator startup composition, so that a broken saved overlay does not permanently prevent startup.
22. As a mygo user, I want protected management controls to remain recoverable, so that I cannot accidentally strand the management interface.
23. As a mygo user, I want Host plugin changes to be explicitly remote operations, so that a local toggle cannot accidentally disable a server plugin.
24. As a mygo user, I want unsupported operations marked unavailable, so that the unified page does not pretend every source supports the same lifecycle controls.
25. As a client plugin author, I want to override default UI through original Slot rules, so that I do not rewrite the services beneath it.
26. As a mygo user, I want removal of a local UI override to restore its default contribution, so that replacement is reversible.
27. As a mygo user, I want overriding navigation to preserve session services, so that presentation changes do not destroy business state.
28. As a mygo user, I want Host client-graph updates confined to their owned entries, so that local plugins survive remote synchronization.
29. As a mygo user, I want removal of an instance client contribution to preserve local management, so that remote lifecycle work cannot remove the application shell.
30. As a client maintainer, I want package, runtime Entry and owner identities distinguished, so that package-name collisions do not redirect lifecycle operations.
31. As a client maintainer, I want duplicate identities and incompatible dependencies diagnosed, so that compatibility failures are not hidden by arbitrary aliasing.
32. As a mygo user, I want disconnection distinguished from plugin removal, so that temporary network loss does not erase my local composition.
33. As a mygo user, I want existing session creation and message submission preserved, so that the runtime migration does not regress ordinary work.
34. As a mygo user, I want original receipts and streaming updates preserved, so that the client does not duplicate or fabricate accepted work.
35. As a mygo user, I want actual browser credentials used for remote calls, so that unauthenticated visitors cannot inherit a launcher owner identity.
36. As a mygo user, I want original DSH permission refusals preserved, so that a unified client does not bypass Host authorization.
37. As a mygo user, I want ordinary permitted operations to reach DSH without a mygo business allowlist, so that normal UI actions do not fail merely because they were absent from an earlier test ticket.
38. As a mygo user, I want remote client delivery unable to replace local startup configuration, so that an instance cannot acquire global composition control through a manifest update.
39. As a mygo user, I want local management actions not to issue Host settings or plugin-management mutations, so that client customization has no implicit server side effects.
40. As a client maintainer, I want authentication views and instance ownership explicit, so that a shared root is not mistaken for shared authority.
41. As a client maintainer, I want compatibility checked with unmodified upstream plugins, so that a successful demo does not conceal a plugin fork.
42. As a client maintainer, I want complete browser workflows as the primary verification seam, so that tests exercise the same assembly users run.
43. As a tester, I want a local mock model to exercise original session and RPC behavior, so that verification requires no paid model credential.
44. As a client maintainer, I want migration of saved local preferences to be explicit, so that a runtime change does not silently discard or reinterpret them.
45. As a mygo user, I want remote settings and local settings clearly scoped in the unified interface, so that I can predict the effect before saving.

## Implementation Decisions

- **One client root:** mygo owns one client Context and one original Loader for the initial single-instance composition. Plugin child contexts remain ordinary Cordis lifecycle scopes, not additional independently booted client roots. The remote Host retains its separate server tree.
- **Reuse existing client boot seams:** reuse the official context-accepting client composition, activation audit, module system and renderer mount mechanisms. Avoid invoking the outer entry that independently creates another root. Adapt orchestration rather than requiring plugin source changes.
- **Original plugin contract:** retain existing client entry declarations, dependency injection, module identities, externals, original React/Cordis singletons, generated Remote and original RPC/event contracts. Do not require a mygo SDK, a new plugin package format or a remote UI serialization protocol.
- **Compatibility baseline:** retain the verified DSH revision `fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159` as the initial baseline. Compatibility claims apply to unchanged plugins exercised under that environment; arbitrary upstream versions and private undocumented assumptions are not automatically covered.
- **Composed module resolution:** local trusted modules and Host-delivered client bundles participate in the existing loader contract through an explicit resolver composition. Preserve official dependency semantics; diagnose duplicate or incompatible definitions rather than silently renaming packages. Installing a remote module system must not strand already loaded local entries.
- **Scoped manifest reconciliation:** bind every managed Entry to its owner before lifecycle mutation. A Host manifest is authoritative only for entries it supplies; reconciliation, removal, reload and release handling may not enumerate or prune unrelated local entries as though they belonged to that manifest. Preserve original disposal and dependency settlement.
- **Separate identities:** package identity remains the original import identity; Entry identity identifies a concrete runtime activation; owner identity distinguishes local composition from instance/authentication-view ownership. Entry attribution does not itself confer authentication or a security sandbox.
- **Single-instance service compatibility first:** reuse original DSH service names and inject contracts in the shared runtime for one bound instance. Do not claim arbitrary concurrent instances can share global service names or module versions without an additional design.
- **Local UI override plugins:** use original Slot registration, priority and lifecycle semantics to replace or extend selected navigation, Settings and plugin-management contributions. UI replacement must preserve unrelated business services. If a contribution cannot be overridden using an existing public Slot seam, adapt the integration explicitly without requiring community plugin edits or silently introducing another full UI shell.
- **Unified presentation:** put instance selection in the application navigation, local settings in the original Settings experience, and plugin management in one page. Remove the default extra outer navigation and independently mounted floating local settings application. Reuse original components, styling, hooks and renderer context where applicable.
- **Authority-aware management:** local, instance-client and Host rows use distinct ownership-qualified keys and adapters. Controls are based on supported lifecycle capabilities, not an assumption that every source can be installed, upgraded or disabled identically. An instance client package managed by Host is not presented as independently locally upgradable.
- **No implicit remote side effects:** local composition installation, enablement, configuration and upgrades only change client state. They do not automatically install/remove Host plugins, mutate Host settings, start/stop remote execution environments or trigger compensating remote reconfiguration. Explicit user-requested remote operations still use the original remote services and authorization. Existing plugin-declared RPC behavior remains supported; this boundary is not a claim that arbitrary trusted plugin code is prevented from making all RPC calls.
- **Local persistence:** preserve the operator startup configuration and device-local accepted overlays, revision checks, runtime-first application, rollback reporting and recoverable startup behavior. The original Loader's default persistence is insufficient by itself. Reconcile configuration ownership during migration; if an old overlay cannot be applied safely, report the mismatch and retain a recoverable base rather than silently changing its meaning.
- **Instance catalog:** preserve stable instance/profile/authentication-view identities without storing credentials in catalog data. Existing desired external selection remains distinct from the actual bound connection. No catalog address becomes a transport target merely because it was edited in the UI.
- **Authentication and permissions:** retain the fixed-target transport, browser's own authority-bound DSH credential, public Host/Origin checks, original admission and Gateway resource authorization. Do not reintroduce server owner-cookie fallback or business-method allowlists. Existing owner-only native browser login remains an explicitly documented limitation; an authentication-view label does not create a restricted principal.
- **Trust boundaries:** remote-supplied client entries remain instance-owned and cannot replace local startup selection through graph synchronization. Shared-realm Cordis scopes are not isolation against malicious JavaScript. Strong hostile-code execution isolation is separate work; this implementation must not advertise attribution or one-root composition as that protection.
- **Error semantics:** distinguish missing imports, unsatisfied services, activation failure, disconnected transport, permission refusal and desired/runtime mismatch. Do not silently fall back to the old two-root boot when unified assembly fails.
- **Presentation stack:** this work concerns the existing React/Web client. Native rendering faces and platform hosts remain extension targets, not prerequisites or alternative implementations of this migration.

## Testing Decisions

- **Confirmed primary seam:** the user explicitly accepted the existing complete-browser-client plus real pinned DSH Host chain. Use that as the main test boundary for boot, UI contribution selection, management operations, RPC and lifecycle behavior. No parallel fake Host or fake SessionManager substitutes for this chain.
- **Compatibility case:** boot a local contribution and unchanged upstream client plugins in the same client Context/Loader. Verify shared service/Slot behavior and original module identities, then create/open a real session and submit through the ordinary UI. Only model inference may use the existing explicitly labeled local mock server.
- **Unified UI case:** verify one normal navigation experience, instance selection and local settings within it, ownership-filtered unified management, and correct action targets. Exercise local override activation and disposal, checking that the original default UI contribution returns and unrelated session services remain usable.
- **Reconciliation case:** add/update/remove an owned remote contribution through the real client-manifest lifecycle, verify original disposal removes its UI, and confirm local entries, saved local choices and management remain intact. Invalid cross-owner reconciliation must fail without partial mutation of unrelated entries.
- **No-remote-mutation case:** compare Host plugin/configuration state before and after local enable/disable, configuration application and override changes. Observe management network requests to ensure local actions do not call Host settings/plugin-manager mutations. Keep ordinary explicitly requested session RPC separate from this assertion.
- **Persistence/recovery case:** save a local configuration, reload the browser and restart the owned client carrier, then verify desired and actual runtime state. Exercise rejected configuration, rollback, stale revision and a broken saved override using existing recovery behavior; do not assert only localStorage contents.
- **Authority regression case:** retain anonymous HTTP/WebSocket rejection, invalid Host/Origin and invalid-cookie rejection, preserved original authorization errors, and successful authenticated UI session creation. A restricted in-process Peer can verify Gateway denial without pretending it proves non-owner browser login.
- **Focused supplemental seam:** add only a small number of original Loader/ClientEntries integration checks for deterministic ownership-boundary cases that are difficult to trigger reliably through the browser. Use real entries/lifecycle where possible; avoid tests mirroring private helper implementation.
- **Prior art:** reuse the existing official-client browser harness, local composition/ownership/disposal cases, original Host authentication checks, original settings management workflow, fixed-target carrier tests and upstream whole-client composition tests. Existing upload/download behavior needs targeted regression checks only if migration changes its transport or source resolution.
- **Good tests assert external behavior:** visible UI, actual active entries/services, durable state restoration, original RPC outcomes, absence of unintended Host mutations and completed disposal. Do not treat badge text, mocked entry objects or configured enablement as proof of actual runtime success.
- **Lightweight acceptance:** require a repeatable running single-instance client and the specified management/boundary workflows. Do not introduce a large performance, platform or compatibility certification program. Retain the original build and source-integrity checks appropriate to reuse.

## Out of Scope

- Full simultaneous multi-instance service/module-version/credential isolation, arbitrary address switching and general transport providers. Preserve explicit seams and truthful capability status without claiming these are solved by one root.
- Non-owner browser identity provisioning, new account/team/multi-tenant systems, or changes to DSH Host authorization policy.
- Sandboxing arbitrary malicious remote JavaScript, automatic isolation solely through Cordis scopes, or a security guarantee based on UI origin labels.
- Converting server-only plugins into client plugins, moving server code into the browser, or automatically converting arbitrary React DOM into native controls.
- New UI RPC protocols, headless remote React execution, native Slot faces, Android/SwiftUI/Tauri hosts or other harness integrations.
- Plugin marketplaces, arbitrary package installation, cross-version compatibility guarantees, offline replay, cross-device settings synchronization or a mandatory central server.
- Refactoring remote Host plugins or changing their behavior merely to support local navigation, settings or lifecycle management.
- Reopening the entire long-term product scope, slicing product releases, publishing a PR or pushing Git history. This specification is a focused successor for client assembly and unified management.

## Further Notes

This specification refines the client-assembly portion of [the existing project specification](https://github.com/isning/mygo-int/issues/25); it does not close or replace that broader project issue. Earlier implementation tickets proved extraction, authentication, RPC and local management, not the single-root target defined here.

The source inspection confirmed that DSH already declares separate Host/client/Remote exports, client dependency metadata and generated RPC, and its lower-level client boot accepts a supplied Context. The remaining work is orchestration and compatibility at the Loader/module/manifest/UI seams; existing plugins are not asked to redesign their split.

The accepted browser-authority decision remains in force. The accepted device-overlay and local-management decision remains in force for persistence and authority boundaries, while its current two-root presentation/assembly is the migration input rather than the target. The older proposed native reference design does not select the stack for this work.

Clarification from the discussion: “local plugins must not affect the remote” prohibits implicit remote changes caused by local management/override mechanics; it does not prohibit the explicitly authorized RPC work a normal client performs for the user. Likewise, one client root is a composition decision, not a promise that all future instances share one global service namespace or that local and remote code have equal management authority.

The user confirmed the primary testing seam before publication. Existing live demo environments are operational artifacts and are not acceptance evidence for this migration until rebuilt and checked against the single-root composition.

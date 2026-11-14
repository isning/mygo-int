## Problem Statement

用户需要一个面向个人、可在 Linux、Windows、macOS 和 Android 上使用的通用 harness 客户端，能够同时连接自己的 PC 或其他远端环境，完整呈现会话、工具调用、子 agent 和插件交互。官方应用的信息可见性和操作体验不足，而现有专用客户端通常受单一 harness 或其 UI 技术栈限制。

mygo 应以 Cordis 的服务、依赖和生命周期思想组织整个客户端。它需要的是一个最小基座和可替换的本地插件组合，而不是先建立固定业务核心，再附加扩展点。DSH 是首个复用和解耦对象，不应成为其他 harness 必须模拟的统一业务模型。

当前 DSH 官方 React 客户端已有大量可复用逻辑与 UI，但其启动依赖 Host 注入、模块清单、认证、资源路径和远端服务。单独复制网页入口或更改 API 地址不足以得到独立客户端。与此同时，既有网页插件的兼容、不同实例的权限边界，以及未来原生与 Web 混合呈现都需要明确契约。

## Solution

首先最大程度复用 DSH 官方 React/Cordis 客户端，使其能够独立部署、启动并连接远端 DSH，走通会话收发。保留原服务、状态、UI、Loader、Slot、生成的 Remote 和客户端恢复行为，在启动、认证、资源、传输和来源归属处做必要适配。

客户端由本地启动配置选择的 Cordis 插件组成，负责外壳、导航、实例管理、连接、状态和 harness 集成。受信任本地组合与实例兼容环境隔离；用户可以同时连接多个实例，切换视图不会销毁其他实例的任务或页面。

原生能力直接扩展既有 Slot 接口。同一注册可提供 React/Web、native 等呈现面，旧 React 插件继续有效。插件用标准 React 编写；跨独立原生/Web 环境使用显式状态与服务桥。各平台分别实现宿主，先跑通 React 路径，Android 和后续 PC 原生沿依赖扩展，具体 PC 工具包以后选择。

实现顺序不切成 MVP、首版或后续版本。当前验收保持简单：独立启动、连上 DSH、基本会话收发。完整目标中的其他能力随对应工作落地，不先建设复杂测试或性能项目。

## User Stories

1. As a personal harness user, I want one client for my remote agent environments, so that I can work without depending on a single vendor's application.
2. As a DSH user, I want mygo to reuse the official client services and UI, so that existing interactions remain familiar and functional.
3. As a user, I want the client to start independently of the Host-served application page, so that I can install and operate it as my own client.
4. As a user, I want to connect to a selected remote DSH, so that agent execution stays on the intended machine.
5. As a user, I want to open a session and send and receive messages, so that the extracted client is useful before additional infrastructure work.
6. As a user, I want to inspect tool calls and subagents, so that I can understand the agent's work and respond to its requests.
7. As a user, I want compatible existing DSH Web plugins to remain usable, so that moving to mygo does not require rebuilding my plugin setup.
8. As a user, I want an explicit compatibility path for a DSH without the optional adapter, so that installing another Host plugin is not universally required.
9. As a user, I want capability differences between connection profiles to be visible, so that opening a remote page is not mistaken for independent client integration.
10. As a user, I want complete authentication and resource loading, so that the UI does not appear connected while streams, styles or downloads fail.
11. As a user, I want multiple instances to stay connected, so that switching the visible instance does not stop other work.
12. As a user, I want similarly named servers and sessions to stay distinct, so that actions and private data are not directed to the wrong remote.
13. As a user, I want LAN and tunnel routes to be associated with one instance only after verification or confirmation, so that address changes do not create unsafe identity assumptions.
14. As a user, I want reconnecting to preserve the configured instance association, so that transient failures do not create duplicate instances.
15. As a user with multiple accounts, I want private caches and capabilities separated by authentication view, so that one account does not inherit another's data.
16. As a user, I want remote plugins restricted to their instance, so that they cannot access unrelated credentials or replace the application shell.
17. As a user, I want explicitly trusted local plugins to compose the whole application, so that my client is customizable beyond small extension points.
18. As a user, I want a replaceable startup configuration, so that the bundled default does not become a mandatory product core.
19. As a plugin author, I want existing Cordis and Loader conventions preserved, so that I do not need a competing plugin lifecycle framework.
20. As an existing DSH plugin author, I want my React registration and service contracts to keep working, so that compatibility does not require adopting a new SDK.
21. As a plugin author, I want package source, execution location and owner distinguished, so that a remote-delivered client package is not mistaken for a remote backend.
22. As a plugin author, I want original module identities and compatible framework singletons preserved, so that hooks and shared services behave correctly.
23. As a plugin author, I want one Slot registration with several concrete renderer faces, so that React and GPUIX presentation share ownership and lifecycle.
24. As a plugin author, I want unsupported faces filtered before Slot election, so that an unusable contribution does not hide a usable one.
25. As a plugin author, I want real React components, hooks and effects, so that the authoring model is not merely JSX-shaped descriptors.
26. As a plugin author, I want explicit state and service bridges between independent surfaces, so that shared behavior has a clear authority and lifetime.
27. As an official UI plugin author, I want each concrete renderer face to implement the same Slot contract as the React face, so that the product has one feature definition without inventing a generic native UI framework.
28. As a user, I want desktop and Android renderers to preserve official navigation and feature behavior, so that platform controls do not create a different product.
29. As a user, I want layout changes to preserve declared page and business state, so that resizing or switching views does not reset my work.
30. As a user, I want Web history and application back behavior coordinated, so that embedded content remains navigable.
31. As a user, I want React/Web and native presentation supported in the complete architecture, so that legacy content and platform-specific experiences can coexist.
32. As a user, I want native layouts to host explicit Web content, so that plugins retain browser-level presentation freedom where needed.
33. As a user, I want declared drafts and caches to survive supported local recovery, so that interruptions do not unnecessarily lose my work.
34. As a user, I want offline queueing only where the remote provides safe replay guarantees, so that reconnecting does not duplicate business effects.
35. As a user, I want queued, accepted, completed and unknown outcomes distinguished, so that I know whether an action actually reached the remote.
36. As a user, I want expired approvals and superseded questions withheld from automatic replay, so that stale decisions are not applied later.
37. As a user, I want attachment dependencies handled explicitly, so that preserving message text does not falsely imply the files were retained or uploaded.
38. As a user, I want cross-device state to reflect actual remote capabilities, so that mygo does not require an invented synchronization center.
39. As a user, I want local plugin versions and upgrades explicitly selected, so that my client composition remains reproducible.
40. As a user, I want remote plugin updates confined to their owning instance, so that a Host cannot update my global client or expand permissions.
41. As a user, I want recovery to account for state migrations, so that an executable rollback does not corrupt newer data.
42. As a user, I want files, diffs and terminals associated with their actual execution environment, so that operations do not silently run on the wrong machine.
43. As a user, I want out-of-app notifications supplied through an actual delivery capability, so that a suspended connection is not presented as reliable delivery.
44. As a user of another harness, I want an independent integration plugin, so that my harness is not forced into DSH's private domain model.
45. As an integration author, I want ACP protocol support separated from network carriage and execution ownership, so that remote capabilities are described accurately.
46. As a managed-environment user, I want provisioning and lease management owned by a provider plugin, so that lifecycle responsibilities remain explicit.
47. As a user considering an embedded agent, I want local execution explicitly selected and authorized, so that remote UI cannot implicitly start a local process.
48. As a maintainer, I want pinned upstream and compatibility information, so that changes and failures can be reproduced and assessed.
49. As a maintainer, I want platform-specific carriers behind shared contracts, so that native backends can evolve without replacing the plugin model.
50. As a maintainer, I want clear activation and ownership diagnostics, so that missing dependencies and plugin failures can be understood.
51. As a maintainer, I want lightweight acceptance of the running client, so that a large test framework does not block practical progress.
52. As a maintainer, I want deferred toolkit and distribution choices recorded honestly, so that future implementation is not constrained by unapproved assumptions.

## Implementation Decisions

- **最小基座。** 基座提供 Cordis/模块执行环境、受限桥接、平台原语和呈现挂载机制，不内建 Page、Section、instance、聊天、导航或队列业务。默认客户端由可替换本地配置组成。
- **复用基线。** 当前源码研究基线为 DSH commit `fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159`。保留官方 React DOM、客户端服务/状态/UI、模块工厂 ABI、公开模块身份、共享单例、Config、Slot、生成 Remote 和恢复机制。真正构建闭包与生成物在实施时核对，不将入口导出当作独立可构建证明。
- **启动顺序。** 先启动受信任本地 Cordis 组合，再由 DSH 集成取得远端完整启动信息，最后启动实例兼容域内的官方客户端树。启动信息取得能力不得依赖尚未启动的远端 client 插件。沿用 `AppWebEntry`、原就绪门及注入应用机制，做最小部署适配。
- **完整 bootstrap。** 启动契约包括模块加载器初始化、插件图、权限/Peer 上下文和其他有序注入。仅获取 `__DSH_BOOT__` 不等于完整启动。结构化注入与原 HTML 扩展分别处理，不支持的类别明确说明。
- **通信与资源。** 优先复用 `ClientTransportHooks` 的 RPC、fetch、流、WebSocket、bundle 和资源解析接缝。它是通信/加载替换接口，不是插件框架或业务状态管理器。直接 URL 请求、CSS 资源、图片、上传下载等可能绕过 hooks，必须纳入认证与资源适配。普通远端不因本地安装而获得 `ownsHost` 权限。
- **新增客户端职责。** 本地组合管理、实例管理、DSH 集成、全局外壳四类角色由本地插件承担；可以合并为较少包，不另造 Loader。讨论中的 `mygo-client-composition`、`mygo-instances`、`mygo-dsh-client`、`mygo-shell` 为建议名，不作为固定 API 或必须新增四个包的要求。
- **可选远端适配。** 薄 DSH remote 插件复用 Host 能力，提供完整启动、认证与资源接缝，不接管 agent 或要求修改 Host 核心。未安装适配插件时保留按版本声明的兼容路径，不保证等价能力；网页透传不冒充独立客户端启动。`mygo-dsh-remote` 为建议包名。
- **来源、执行、归属。** 本地 client、实例提供的 client 半边、Host backend 与双端包分别记录。远端下发 client 包仍在设备执行，Host 后端仍在远端。包依赖与 Cordis 服务注入是不同层次。
- **图与生命周期。** 本地插件由本地配置管理，远端图仅管理所属实例贡献。复用现有 Loader/ClientEntries 的串行同步、revision、清理、失效和 release gate，不在远端更新时卸载全局本地组合，不增加竞争的 SessionManager 或提交/重连控制器。
- **实例身份。** instance 与 URL、连接、账号、模块域分离。同一实例可有多个连接配置，只有身份核实一致或用户确认才合并。重连不创建新实例；显示名称、相同资源 ID 或路径不足以合并。私有状态按实例和认证/权限视图分区。
- **隔离与能力。** 受信任本地组合和实例兼容环境分开，保留模块、DOM、存储与权限边界，不强制每实例一个 OS 进程。Cordis scope 不是沙箱。桥接根据实际来源、挂载和授权绑定，不信任自报实例 ID；远端代码不自动获得全局 Root、其他实例凭据或任意平台服务。
- **统一 Slot。** native 能力直接扩展原 Slot 接口；一条注册可有多面。旧组件注册等价于原 React 面，保留 ABI 和原 cell、ascending priority、tie、order、chain 规则。先按授权/渲染能力筛选，再选举。共享 children、store、inject、locale 和生命周期，不能通过重复注册重复声明子槽。
- **Slot 消费者。** 扩展不止改变返回类型；同时审计标准 props、scoped provider/renderArea、工厂、HOC、store occurrence、fallback、订阅与错误退位。呈现面出错与共享业务失效区分，插件移除按原归属撤销。原生面缺失不自动授权别的操作或省掉必需内容。
- **客户端补丁。** 统一 Slot 是兼容的客户端扩展，不是假定已有的上游能力。跟踪最小补丁和受影响消费者；上游未采纳时明确维护成本，不另建第二套原生贡献注册体系。远端薄适配与客户端补丁分开。
- **真实 React。** 标准组件/hooks/effects 由兼容的真实 renderer 执行。Web 面保留实际浏览器，native 面通过真实 React host renderer 和平台桥到达预编译原生控件。单独调用组件函数或自定义 JSX 描述器不满足要求。
- **跨环境呈现。** 原生父布局可挂载有明确入口的 Web 内容，各 renderer 的 context/hooks/refs/事件祖先局限于自身环境。共享模型经明确状态/服务桥协作，不序列化任意闭包、ReactNode 或 DOM 引用。Web fallback 的可挂载边界必须符合实际 props、状态和平台能力。
- **导航。** 官方 UI 插件继续拥有页面、分区、列表详情、操作与导航语义；`native` 仅是同一 Slot 注册的第二渲染面。桌面与 Android renderer 实现官方契约的物理布局、返回、IME、焦点和关闭行为，不新建导航模型。
- **平台与顺序。** Linux、Windows、macOS、Android 都属完整目标，React 与原生都要支持。先实现原 React 客户端，PC 原生之后做，各平台分别实现载体。SwiftUI/Tauri 是未来候选，不锁定全平台 Compose/RN、某个 JS 引擎或每实例进程；浏览器载体不自动等于原生 Slot renderer。
- **状态。** 远端保有业务真相，本地插件管理声明的草稿、缓存及可选 outbox，平台提供持久化原语。区分排队、发送中、接受、完成、失败及结果未知；本地队列收据不能伪装为远端成功。
- **重放。** 仅对有实际幂等键/回执/排序与时效保证的方法启用自动重放，保持原操作身份，未知结果先核对。过期审批和已替代问题不重放。附件需覆盖本地内容、上传及 receipt/提交依赖；无保证时保留明确恢复路径。原 Remote 元数据不被假定已有通用离线策略。
- **分发与恢复。** 本地组合固定可复现版本，安装/升级明确选择；远端 client 只跟随所属 Host 兼容图，不扩权。区分字节缓存与已求值模块对象，冲突版本不按到达顺序覆盖。暂存完整配置再激活，保留兼容旧组合；包回滚不盲目逆转数据迁移或远端 release。
- **其他集成。** DSH 保留原客户端树，ACP 等通过独立本地插件提供协议/状态/UI，按需接 carrier/gateway。共享能力可选，不要求映射 DSH 私有模型。文件、diff、终端按实际执行环境与能力声明，不隐式切到本机执行。
- **执行扩展。** provider 管环境创建/租约/回收，integration 管协议/会话/UI，carrier 管网络。本机内置核心是明确本地执行 provider，远端 UI 不能隐式启动本机进程。具体云服务、推送与核心实现未选择，不要求中央 mygo 服务器。
- **维护与边界。** 记录固定上游、模块/Remote/Slot ABI、React/renderer 和实际平台能力。源码复用前核对对应许可，发布前检查实际渠道要求；不把源码证据当成所有平台、插件或 native 路径的运行保证。
- **工作依赖。** 核对源码与构建输入；官方 React 壳与完整启动/认证/资源形成独立运行检查点；随后完善本地/远端组合、多实例隔离、统一 Slot 多面及平台后端。状态、分发和其他集成沿相关接口依赖推进。先跑通 React，不以 PC 原生工具包或复杂测试体系阻塞。

## Testing Decisions

- 用户明确要求“能跑起来就行”，不把全面自动化、完整四端矩阵、故障注入、可访问性审计或性能预算项目设为当前开工/完成门槛。
- 使用一个最高层的主要验收接缝：通过独立客户端的正常入口，连接选定 DSH，打开会话、发送消息并收到回复。人工 smoke check 即可，不新增测试专用业务接口。
- 该接缝和完成标准已在对话中确认；本规格不再重复访谈。客户端入口、原连接服务、真实 Remote 和 UI 共同参与，避免另测一套仿制状态管理器。
- 好的检查观察外部行为：能否启动、是否接入正确远端、是否能完成会话交互。不要把内部函数调用次数、私有数据结构或实现镜像测试当作业务成功。
- 已有先例包括官方客户端整树测试/启动接缝、现有模块与 Slot 行为检查；按实际变更复用适用检查，不先复制上游全部测试基础设施。既有传输 hooks 可在需要时替换底层，不新增平行业务接口。
- 插件归属、认证资源、多实例、renderer face、离线与更新功能实现到哪里，就针对改动补基本行为检查。保留原 React 行为，避免把“网页转发成功”作为独立客户端启动通过。
- 报告实际运行环境、尝试内容、结果和已知问题。未实现/未尝试的原生后端、平台和社区插件不能被记为已验证。
- 当前仓库尚无客户端实现；此前工作只有源码阅读、设计与文档检查，没有构建或运行结果可继承为通过证据。

## Out of Scope

- 另行设计固定业务核心、统一 SessionManager 或第二套插件框架，取代可替换本地 Cordis 组合。
- 为解耦先重写 DSH 聊天、设置、状态或生成 Remote；要求原插件迁移到新 SDK；将任意 React/DOM 自动转换为原生控件。
- 透明地把一棵 React 树、任意闭包、context 或 refs 搬到独立原生/Web 环境。
- 将独立原生贡献注册系统与现有 Slot 并列；把 remote Root 权限等同于全局应用 Root。
- 对全部操作承诺离线排队/自动重放、对没有实际提供方的后台通知承诺可靠送达，或新增强制跨设备同步中心。
- 本轮立即选择或实施具体 PC 原生工具包、云平台、内置 agent 核心、推送提供方、商店、商业模式或支持周期。这些在完整扩展目标中保留，但按已确认依赖顺序后定。
- 将功能范围切为 MVP/首版/后续版，或扩张独立消费产品功能清单、团队管理与企业多租户。
- 预先建设复杂验收工程，或宣称所有上游版本、社区插件与平台已经兼容。
- 本次规格发布本身不授权实现、远端安装、部署、PR、git push 或软件发布。

## Further Notes

- 本规格综合已完成的 [Cordis 客户端架构与实现路线地图](https://github.com/isning/mygo-int/issues/1)。该地图全部子票已关闭，包含按范围排除的产品清单票；详细架构决策保留在各 resolution 中。
- 关键依据包括 [官方 React 客户端解耦边界](https://github.com/isning/mygo-int/issues/23)、[client/remote 插件契约](https://github.com/isning/mygo-int/issues/24)、[统一 Slot 呈现](https://github.com/isning/mygo-int/issues/9)、[轻量验收](https://github.com/isning/mygo-int/issues/18) 和 [已确认实施路线](https://github.com/isning/mygo-int/issues/19)。
- 当前仅有规划文档、源码研究和架构图，没有应用实现。早期 native/headless、Compose/QuickJS 等提案是历史备选，不能覆盖后续明确决定；拟议 ADR 也未被当作已采纳技术栈。
- 先独立跑通 React 是工作依赖顺序，不是削减原生或多平台完整目标。具体包名、API 细节和平台选型应在实现中结合固定源码确定。
- 本地设计与研究资料未推送；本 issue 正文和已发布决策地图构成远端可读规格，不依赖不存在的远端文件链接。

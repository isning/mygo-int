# mygo 架构总览

状态：2026-11-10。项目边界与实施路线已由用户确认；验收采用“先能跑起来”。本轮规划完成，尚未实施客户端。本文汇总入口，具体决策以地图中的 resolution 为准。

[交互式架构图](mygo-architecture.html)：整体架构与统一 Slot 呈现两个视图。

## 项目是什么

mygo 是以 Cordis 为组织基础的通用 harness 客户端。客户端本身由本地插件组成，而不是“固定客户端核心加少量扩展”。Linux、Windows、macOS、Android 都在完整目标中，不要求统一中心服务器。

第一项实现工作是从 DSH 解耦官方 React 客户端，最大程度保留其服务、状态、UI、Loader、Slot 和 Remote。先把这条路径做实，再按依赖扩展原生呈现。PC 原生实现之后进行，SwiftUI 是届时考虑的候选；Tauri 也不是已经锁定的全平台方案。

## 基座与插件

基座提供运行环境、平台原语和呈现挂载机制，不理解聊天、页面、实例或导航。启动配置选择本地插件组合；默认组合只是可替换配置。

本地插件提供外壳、实例与连接管理、导航、状态、分发以及 harness 集成。DSH 私有服务可以原样保留，共享能力通过明确接口按需提供，不强迫所有 harness 模拟同一个 Session/Workspace 模型。

## client 与 remote

包的来源、执行位置和归属分别记录。远端下发的 client 半边仍在设备上执行；Host 后端留在远端。两端插件沿用原有通信和生命周期契约，旧插件无需迁移到一个新的 mygo SDK。

可选的薄 remote 适配插件负责暴露完整启动、认证与资源接缝，不修改 DSH 核心。未安装适配插件的 DSH 有明确兼容路径，但不保证相同扩展能力。“打开官方网页”与“独立启动客户端树”是两种不同保证。

## 实例与隔离

实例不等于 URL、连接、账号或 JS realm。同一实例可以经多个连接配置访问，只有身份可核实一致或用户明确确认才合并。重连不新建实例，切换页面不关闭其他实例。

受信任本地组合与实例兼容环境隔离。实例/认证视图保留各自模块、DOM、存储与权限边界；不强制每实例一个进程。远端代码只经明确授权桥接获得能力，不自动取得其他实例凭据、全局平台服务或应用 Root。Cordis scope 不等于安全沙箱。

## 呈现与导航

原生能力直接扩展原 Slot 接口：一条注册可以有 React/Web、native 等呈现面，共享子槽声明、数据源和生命周期。渲染器先筛选可用面，再沿用原有选举规则。旧 React 注册形式继续有效；维护客户端兼容补丁，不假定上游已接受。

这里要区分作者使用 React 与最后画出 DOM 或原生控件。组件和 hooks 由真实 React renderer 执行，原生后端接收渲染结果。独立原生/Web 环境通过显式状态/服务桥协作，不自动共享 context、闭包或 refs。

Page、Section、列表详情等语义仍由插件提供，本地导航插件决定各端布局。页面身份与布局分开，Web 内部历史与应用返回显式协调。平台载体、原生渲染器和导航插件承担不同职责。

## 状态、更新与扩展

远端保有业务真相，本地插件负责缓存、草稿和可选持久队列。仅有实际幂等/回执保证的操作可自动重放；结果未知先核对，过期审批不重放。跨设备遵循实际远端能力。

本地组合固定可复现版本并明确选择升级；实例 client 图跟随所属 Host，不更新全局组合或扩大授权。包回滚不能假装逆转数据迁移。

provider 管环境创建、租约和回收，integration 管协议、会话和 UI，carrier 管网络。托管环境、自己的 PC、未来内置核心都是可选组合；远端 UI 不隐式启动本机 agent。

## 实施路线与证据

[实现依赖计划](implementation-dependency-plan.md)从源码/生成物闭包开始，经 React 壳、完整启动与资源、本地/远端组合、多实例隔离，再接统一 Slot 原生面和各平台实现。状态、分发与兼容验证沿依赖并行推进，其他集成消费同一扩展边界。

每项工作都有输入、输出和检查点，不把顺序切成 MVP 或产品版本。具体 PC 工具包、云提供方、发布渠道与设备性能阈值按用户意图延后选择。

[轻量验收](verification-and-evidence.md)以独立启动、连接 DSH 和基本会话收发为当前检查，不预先建立复杂测试矩阵或性能基准；后续能力随实现做基本检查。本轮只有源码阅读、理论设计和文档检查，没有客户端实现、构建、运行实验或发布。完整地图的完成也只意味着规划确认。

## 文档入口

- [项目定义](project-definition.md)：已确认范围和约束。
- [领域术语](../../CONTEXT.md)：概念定义，不承载实现规范。
- [React 解耦](react-client-extraction.md)、[插件契约](client-remote-plugin-architecture.md)：初始代码与接缝。
- [统一 Slot](unified-slot-rendering.md)、[呈现](presentation-contract.md)、[平台](platform-carrier-contract.md)：渲染接口与实现边界。
- [GPUIX renderer-face 架构](native-renderer-architecture.md)：同一官方 Slot contribution 的 React 与 GPUIX 具体 renderer face，以及独立原生桌面宿主。
- [默认组合](default-client-composition.md)、[状态](state-and-offline-contract.md)、[分发](plugin-delivery-contract.md)：客户端插件职责。
- [集成](harness-integration-contract.md)、[执行提供方](execution-provider-boundaries.md)：扩展边界。
- [维护承诺](distribution-and-maintenance.md)、[轻量验收](verification-and-evidence.md)、[实施计划](implementation-dependency-plan.md)：交付与证据。
- [Wayfinder 地图](https://github.com/isning/mygo-int/issues/1)：决策原文索引。

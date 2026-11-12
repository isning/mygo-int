---
description: "供 mygo 使用的 DSH 实例 Host 侧组件。"
kind: "package-reference"
---

# @deepseek-ai/dsh-host-mygo

[English](README.md) | 中文

## 概述

`dsh-host-mygo` 是供 mygo 使用的 DSH 实例 Host 侧插件。它的第一个组件实现 mygo 连接协议：通过 `GET /mygo/index-injections` 暴露实例有序的客户端启动注入表，让 mygo 无需解析 HTML 页面即可加载实例提供的 client 插件。它复用 DSH admission、实际通过认证的 owner Peer、WebServer 注册表和 Cordis 卸载生命周期。

## 目录

- [使用此包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [进一步阅读](#further-exploration)
- [模型体验](#model-experience)
- [已知限制与延后工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

-----

<a id="use-this-package"></a>
## 使用此包

在每个需要支持 mygo 的远端 DSH 实例中，将此 Host 插件挂载在 `connection` 与 `webServer` 之后。它目前没有配置项。连接组件通过 `ctx.connection.admit` 认证请求，要求 owner principal，并原样返回 `ctx.webServer.collectIndexInjections(peer)`，不解释或重排任何条目。

<a id="understand-the-implementation"></a>
## 理解实现

此包的入口负责组合 mygo 的 Host 侧组件。连接组件位于 `src/connection.ts`，并在 Cordis effect 中注册端点，因此卸载父插件时路由随之移除。其他 Host 插件继续通过既有 WebServer 注入事件贡献启动条目。RPC 与 WebSocket 继续使用 DSH 已有的连接协议；此插件不替换这些传输，不保存凭据，不提供 UI，也不创建另一棵 Cordis 树。

<a id="further-exploration"></a>
## 进一步阅读

- [Host 包映射](../README.zh.md)
- [mygo 应用](../../../apps/mygo/package.json)

<a id="model-experience"></a>
## 模型体验

无，因为此包只提供连接元数据，不会增加模型输入、工具或 Session 事件。

#### KV Cache 影响

无；此包既不组装也不发送 provider 请求。

<a id="known-limitations-and-deferred-work"></a>
## 已知限制与延后工作

- **仅 owner 可连接**——端点只接受通过认证的 owner Peer。它不签发凭据，不放宽 Host 或 Origin 检查，也不定义受限用户的连接策略。

<a id="dev-note"></a>
### 开发备注

无。

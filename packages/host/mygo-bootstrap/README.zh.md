---
description: "为显式配置的 mygo 客户端提供经过认证的 DSH 启动注入表端点。"
kind: "package-reference"
---

# @deepseek-ai/dsh-host-mygo-bootstrap

[English](README.md) | 中文

## 概述

`dsh-host-mygo-bootstrap` 在 `GET /mygo/index-injections` 暴露有序的客户端启动注入表。它复用 DSH admission、实际通过认证的 owner Peer、WebServer 注册表和 Cordis 卸载生命周期。

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

在支持 mygo 的 DSH 实例中，将此插件挂载在 `connection` 与 `webServer` 之后。它没有配置项。路由通过 `ctx.connection.admit` 认证请求，要求 owner principal，并原样返回 `ctx.webServer.collectIndexInjections(peer)`，不解释或重排任何条目。

<a id="understand-the-implementation"></a>
## 理解实现

此包在 Cordis effect 中注册一个精确的 GET 路由。插件卸载时路由随之移除。其他 Host 插件继续通过既有 WebServer 注入事件贡献启动条目。

<a id="further-exploration"></a>
## 进一步阅读

- [Host 包映射](../README.zh.md)
- [mygo 应用](../../../apps/mygo/package.json)

<a id="model-experience"></a>
## 模型体验

无，因为此包只提供客户端启动元数据，不会增加模型输入、工具或 Session 事件。

#### KV Cache 影响

无；此包既不组装也不发送 provider 请求。

<a id="known-limitations-and-deferred-work"></a>
## 已知限制与延后工作

- **仅 owner 可启动**——端点只接受通过认证的 owner Peer。它不签发凭据，不放宽 Host 或 Origin 检查，也不定义受限用户的启动策略。

<a id="dev-note"></a>
### 开发备注

无。

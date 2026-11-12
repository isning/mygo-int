---
description: "保留原始 Cordis 客户端与插件 UI 的多实例 DSH 客户端。"
kind: "package-reference"
---

# @deepseek-ai/dsh-mygo-app

[English](README.md) | 中文

## 概要

`dsh-mygo-app` 是随发行提供的 `mygo` profile。它启动一棵本地 Cordis 客户端树，通过持有凭据的反向代理连接显式配置的 DSH 实例，并原样渲染各实例的客户端插件。

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

运行 `dsh --profile mygo`。进程会输出一个权限为 `0600` 的私有 bearer 启动链接路径。打开链接后会创建 mygo 浏览器会话；该链接在 mygo 进程重启前一直有效。匿名 HTTP 与 WebSocket 请求会在附加任何已保存的 DSH 凭据之前被拒绝。

Cordis 插件接受以下配置：

| 字段 | 默认值 | 用途 |
| --- | --- | --- |
| `port` | `4178` | mygo HTTP 监听端口。 |
| `bindHost` | `127.0.0.1` | 监听地址。非回环地址必须设置 `publicOrigin`。 |
| `publicOrigin` | 空 | 公共监听器允许的精确浏览器 origin。 |
| `stateDirectory` | `.dsh-build/mygo/state` | 私有实例目录、DSH 凭据、客户端偏好和启动链接。 |
| `startupConfig` | `local/single-root.json` | 在本包内解析的本地 Cordis 组合。 |

<a id="understand-the-implementation"></a>
## 理解实现

mygo 仅在服务端状态目录保存 DSH 启动令牌和绑定 authority 的 Cookie。浏览器只获得 mygo 会话与实例范围的代理路由。上游调用仍由 DSH admission 与 RemoteAccess 授权；本地插件设置不会修改 Host 插件状态。

<a id="further-exploration"></a>
## 进一步阅读

- [远端启动适配器](../../packages/host/mygo-bootstrap/README.zh.md)
- [应用清单](package.json)

<a id="model-experience"></a>
## 模型体验

mygo 不会增加模型输入。已连接实例的原始 agent 与客户端插件负责提示词、工具、流式输出和 Session 历史。

#### KV Cache 影响

无；mygo 原样转发 DSH 协议，不修改 provider 请求。

<a id="known-limitations-and-deferred-work"></a>
## 已知限制与延后工作

- 每个 DSH 实例必须提供经过认证的 mygo 启动适配器。
- 当前浏览器代理支持 owner 认证；受限用户接入需要显式的应用凭据和 RemoteAccess 策略。
- `publicOrigin` 是精确 origin，不是认证机制。请保护私有启动链接。

<a id="dev-note"></a>
### 开发备注

使用 `pnpm --filter @deepseek-ai/dsh-mygo-app test:packed` 验证发布运行时闭包；使用一次性固定 DSH Host 运行 `test:browser` 验证完整浏览器接缝。

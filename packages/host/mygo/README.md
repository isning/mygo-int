---
description: "Host-side components for DSH instances used through mygo."
kind: "package-reference"
---

# @deepseek-ai/dsh-host-mygo

English | [中文](README.zh.md)

## Summary

`dsh-host-mygo` is the Host-side plugin for DSH instances used through mygo. Its first component implements the mygo connection protocol: it exposes the instance's ordered client startup injection table at `GET /mygo/index-injections`, allowing mygo to load the instance's client plugins without parsing its HTML page. It reuses DSH admission, the exact admitted owner Peer, the WebServer registry, and Cordis disposal.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

## Use this package

Install this Host plugin in each remote DSH instance that should support mygo, after `connection` and `webServer`. It currently has no configuration. The connection component admits the request through `ctx.connection.admit`, requires the owner principal, and returns `ctx.webServer.collectIndexInjections(peer)` without interpreting or reordering rows.

## Understand the implementation

The package entry composes Host-side mygo components. The connection component lives in `src/connection.ts` and registers its endpoint inside a Cordis effect, so unloading the parent plugin removes the route. Other Host plugins keep contributing startup rows through the existing WebServer injection event. RPC and WebSocket traffic continue through the existing DSH connection protocol; this plugin does not replace those transports, store credentials, provide UI, or create another Cordis tree.

## Further Exploration

- [Host package map](../README.md)
- [mygo application](../../../apps/mygo/package.json)

## Model Experience

None, as this package only serves connection metadata and adds no model input, tool, or Session event.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **Owner-only connection** — the endpoint accepts only an admitted owner Peer. It does not mint credentials, relax Host or Origin checks, or define a restricted-user connection policy.

### Dev Note

None.

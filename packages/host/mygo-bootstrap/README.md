---
description: "Authenticated DSH bootstrap table endpoint for explicitly configured mygo clients."
kind: "package-reference"
---

# @deepseek-ai/dsh-host-mygo-bootstrap

English | [中文](README.zh.md)

## Summary

`dsh-host-mygo-bootstrap` exposes the ordered client startup injection table at `GET /mygo/index-injections`. It reuses DSH admission, the exact admitted owner Peer, the WebServer registry, and Cordis disposal.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

## Use this package

Mount the plugin after `connection` and `webServer` on a DSH instance that supports mygo. It has no configuration. The route admits the request through `ctx.connection.admit`, requires the owner principal, and returns `ctx.webServer.collectIndexInjections(peer)` without interpreting or reordering rows.

## Understand the implementation

The package registers one exact GET route inside a Cordis effect. Unloading the plugin removes the route. Other Host plugins keep contributing bootstrap rows through the existing WebServer injection event.

## Further Exploration

- [Host package map](../README.md)
- [mygo application](../../../apps/mygo/package.json)

## Model Experience

None, as this package only serves client bootstrap metadata and adds no model input, tool, or Session event.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **Owner-only bootstrap** — the endpoint accepts only an admitted owner Peer. It does not mint credentials, relax Host or Origin checks, or define a restricted-user bootstrap policy.

### Dev Note

None.

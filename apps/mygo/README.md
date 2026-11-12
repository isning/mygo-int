---
description: "A multi-instance DSH client that keeps the original Cordis client and plugin UI."
kind: "package-reference"
---

# @deepseek-ai/dsh-mygo-app

English | [中文](README.zh.md)

## Summary

`dsh-mygo-app` is the standalone mygo client. It starts one local Cordis client, connects it to explicitly configured DSH instances through a credential-holding reverse proxy, and renders each instance's unchanged client plugins.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

## Use this package

Run `mygo`. The process prints the path to a mode-`0600` private bearer launch URL. Opening that URL creates a mygo browser session; the link remains valid until the mygo process restarts. Anonymous HTTP and WebSocket requests are rejected before any saved DSH credential is attached.

The Cordis plugin accepts these configuration fields:

| Option | Default | Purpose |
| --- | --- | --- |
| `--port` | `4178` | mygo HTTP listener port. |
| `--bind-host` | `127.0.0.1` | Listener address. A non-loopback value requires `--public-origin`. |
| `--public-origin` | empty | Exact browser origin admitted by the public listener. |
| `--state-directory` | `.dsh-build/mygo/state` | Private instance catalog, DSH credentials, client preferences, and launch URL. |
| `--startup-config` | `local/single-root.json` | Local Cordis composition, resolved inside this package. |

## Understand the implementation

mygo stores DSH launch tokens and authority-bound cookies only in its server-side state directory. The browser receives a mygo session and instance-scoped proxy route. DSH admission and RemoteAccess still authorize upstream calls; local plugin settings never mutate Host plugin state.

## Further Exploration

- [mygo Host plugin](../../packages/host/mygo/README.md)
- [Application manifest](package.json)

## Model Experience

mygo does not add model input. A connected instance's original agent and client plugins own prompts, tools, streaming, and Session history.

#### KV Cache effect

None; mygo forwards the original DSH protocol without changing provider requests.

## Known Limitations and Deferred Work

- Each DSH instance must install the authenticated mygo Host plugin.
- The current browser proxy supports owner authentication; restricted-user admission needs an explicit application credential and RemoteAccess policy.
- `publicOrigin` is an exact origin, not an authentication mechanism. Keep the private launch URL secret.

### Dev Note

Run `pnpm --filter @deepseek-ai/dsh-mygo-app test:packed` for the published runtime closure and `test:browser` with a disposable fixed DSH Host for the full browser seam.

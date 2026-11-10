# Issue 37: original home image renders through the existing capability

Validated 2026-11-10 from parent `e107daa`, with this worktree's independently
acquired, frozen-installed and rebuilt upstream
`fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159`. All eight artifact gates passed
in 106.76 seconds. Upstream tracked sources remain unmodified.

No product change was needed. Issue 35's existing two-entry
`entries/dsh-startup/session-assets.js` allowlist already supplies this exact
normal UI resource:

```text
plugins/@deepseek-ai/dsh-client-ui-brand-official/assets/breach-atlas-43c5305a3d4d.webp
```

## Actual browser evidence

The unchanged official React entry reached the original Loader's `live` mode
with its 74-entry graph and mounted the original home page. Chromium input
clicked hit-tested blank home space, invoking the original `PixelWhale` click
handler. Its original renderer loaded and decoded the atlas, read its pixels,
and painted the visible home canvas. No factory-only evaluation, manually
created image, renderer `play()` call, replacement UI or model request is used.

The successful runner asserted:

- The original renderer's `HTMLImageElement.currentSrc` was the exact carrier
  URL above, with `complete:true`, `naturalWidth:2304`, `naturalHeight:1296`.
- The real Chromium network response was HTTP 200, `image/webp`, without disk
  cache or service worker reuse. CDP `Network.getResponseBody` returned
  **189208 bytes**, SHA-256
  `6ab7c778b7085b0248525bd5640933eee2891c836ba33129a1bd6bbae80eaf63`.
- Those bytes equaled the actual response fetched at the identical path from
  the configured original Host origin (`http://127.0.0.1:40613` in this run),
  using the existing private owner cookie and rejecting redirects. The browser
  used the independent entry origin `http://127.0.0.1:4178`.
- The original 724×453 home canvas was visible, at its original opacity 0.18,
  with **15986 nontransparent pixels** during playback. The saved screenshot
  was visually inspected and shows the faint whale dots behind the home UI.
- Query and undeclared-path variants returned 404 from the carrier.

The original Host also returned HTTP 200 and identical image bytes **without a
cookie**. This resource is public under the original pinned Host policy; this
validation does not claim an authentication requirement the Host does not have.
The existing carrier still attaches its server-side owner cookie only for its
two exact references, preserves the configured target origin and forwards no
browser credentials. No auth, resolver, allowlist or upstream code changed.

The preparer observes `drawImage` through a transparent browser-only wrapper:
it records the original image's dimensions and `currentSrc` at the original
decode/draw boundary, then forwards the same receiver, arguments and return
value. It does not replace `Image`, change its URL, or alter the load handler.
CDP's Page domain is enabled before installing this observer and reloading.

## Reproduce

First complete [the artifact build](dsh-artifact-build.md) in this worktree.
Then run from the repository root, stopping on failure:

```bash
set -euo pipefail
umask 077
export XDG_CACHE_HOME="$PWD/.scratch/upstream/.cache"
export XDG_DATA_HOME="$PWD/.scratch/upstream/.data"
export XDG_STATE_HOME="$PWD/.scratch/upstream/.state"
export PNPM_HOME="$PWD/.scratch/upstream/.pnpm"
export npm_config_cache="$PWD/.scratch/upstream/.npm-cache"
export npm_config_store_dir="$PWD/.scratch/upstream/.pnpm-store"
export NARB_NATIVE_CACHE_DIR="$PWD/.scratch/status-live/native-cache"
export DSH_HOME="$PWD/.scratch/status-live/assets-home"
export DSH_AGENTS_HOME="$PWD/.scratch/status-live/assets-agents"
export DSH_TELEMETRY_DISABLED=1
nix shell nixpkgs#chromium -c chromium --version
node --test scripts/test/dsh-{bootstrap-carrier,rpc-carrier,events-transport,session-carrier}.test.mjs packages/dsh-host-status/test/status.test.js
node scripts/dsh-assets-live-prepare.mjs
node --check .scratch/status-live/anchor/assets-smoke.mjs
pnpm --config.auto-install-peers=false dlx --package=node-linux-x64@24.21.0 \
  node .scratch/status-live/anchor/assets-smoke.mjs \
  > .scratch/dsh-startup-assets-runtime.log 2>&1
bash scripts/dsh-upstream.sh verify
git diff --check
```

Observed: Node 24.21.0, pnpm 11.28.5 for the frozen install/build, Chromium
155.0.8059.84. The 18 focused tests, browser smoke, syntax, upstream integrity
and whitespace checks passed. Port 4178 must be free. The pnpm Node runtime
avoids the previously documented Nix Node native Host limitation. T3
`preview_status` was unavailable and `preview_open` explicitly failed with
`This host is missing libraries T3's browser needs` (including libglib/libnss3),
so the documented Nix Chromium fallback was used.

Private evidence stays in ignored `.scratch/dsh-startup/`: `assets-result.json`,
`assets-click.json`, `assets-live-result.json`, `assets-live-dom.html`, and
`assets-open.png`. Logs, browser profiles and cookie remain private ignored
scratch. The runner terminates owned Chromium/carrier processes with SIGTERM
and calls original Host shutdown in `finally`, including on assertion failure.

## Separate failures and limits

Observed unrelated HTTP failures remain recorded in `assets-result.json`:
404 for favicon, open-in-app apps and plugin events; 403 for settings, plugin
inspection/inventory, model catalog, credentials, providers, agent/permission
presets and default-workspace initialization. The original home displays its
default-workspace warning. No additional asset was admitted to repair these.
The optional account factory's undeclared onboarding assets remain outside
scope, as documented in issue 35. This validates one exact image family;
fonts, other images, arbitrary resource paths and general proxying are not
claimed. Issue 36's actual model-reply credential blocker is unchanged.

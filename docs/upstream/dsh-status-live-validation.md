# Issue 29: local Host status validation

2026-11-10, fresh isolated workspace on implementation baseline `eaad96b`.
No remote deployment, issue mutation, push, PR or provider credentials were used.

The unmodified source `fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159` was acquired
here and rebuilt with the [artifact commands](dsh-artifact-build.md): frozen
install passed; **8 artifact gates passed in 101.64 seconds**. Post-smoke
`scripts/dsh-upstream.sh verify` passed; upstream tracked files stayed pristine.

## Runtime and install anchor

The installed Nix Node `24.21.0` builds artifacts but cannot boot this Host:
`node-addon-require-builtin` fails during PluginPackages preparation with
`Unsupported/no-getter`: `x64 sysv getter is not a recognized this->field accessor
(wide-window retry: x64 sysv getter is not a recognized this->field accessor)`.
This precedes adapter loading. No upstream workaround or auth substitution was
introduced. The `node-linux-x64@24.21.0` binary acquired through pnpm dlx boots
successfully in this environment. Both binaries report Node 24.21.0.

The helper copies generated CLI libraries and its manifest into the ignored
`.scratch/status-live/anchor`, links the original installed CLI dependencies,
adds explicit Connection/Modules peer links, copies this adapter package, and
declares those dependencies in the scratch manifest. No extra Host is installed.
This is a local installation anchor, not a registry/package-install acceptance
test. Its actual Loader resolves `@mygo/dsh-host-status` by package name from
the included overlay. The original CLI `runProfile` starts the normal `web`
composition with `--host 127.0.0.1 --port 0 --no-open`; no browser is launched.
The small runner calls that original launcher API to retain the Context for
Loader disable/re-enable and normal shutdown; it does not replace Host services.

## Reproduce

First complete the pinned artifact build in this workspace. Then run in Bash
from the repository root, stopping on any failure:

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
export DSH_HOME="$PWD/.scratch/status-live/home"
export DSH_AGENTS_HOME="$PWD/.scratch/status-live/agents"
export DSH_TELEMETRY_DISABLED=1
node scripts/dsh-status-live-prepare.mjs
pnpm --config.auto-install-peers=false dlx --package=node-linux-x64@24.21.0 \
  node .scratch/status-live/anchor/smoke.mjs \
  > .scratch/status-live/runtime-official.log 2>&1
cat .scratch/status-live/result.json
node .scratch/upstream/deepseek-harness/node_modules/typescript/bin/tsc \
  --noEmit --strict --module NodeNext --moduleResolution NodeNext \
  --target ES2024 --types node \
  --typeRoots .scratch/upstream/deepseek-harness/node_modules/@types \
  .scratch/status-live/anchor/types.ts
bash scripts/dsh-upstream.sh verify
git diff --check
```

All pnpm invocations, including dlx, use workspace-local state. pnpm 12 reports
its dlx content store under `.scratch/upstream/.pnpm/store/v11`; the frozen
upstream install uses the explicit `.pnpm-store` from the artifact handoff.
No external store was inspected or cleaned. Runtime logs contain a synthetic
launch token: retain them privately in ignored scratch, never publish them.
Cookies are held only in process memory. `result.json` contains no credentials.

## Actual live results

- Missing credentials: **401**; status URL with launch token alone: **401**.
- Original root launch-token exchange: **303**, issuing the original signed
  browser cookie. No signing secret, cookie or Peer was fabricated by the test.
- Cookie-admitted owner: **200**, including a same-origin request and query URL.
  JSON was `{"schemaVersion":1,"status":"adapter-ready","adapterVersion":"0.1.0","release":{"version":"0.2.2-rc.1","commit":"fcc0ad4"}}`.
- Invalid Host, invalid Origin, and `Sec-Fetch-Site: cross-site`, each with the
  valid cookie: **403** from the real Connection trust fence.
- Authenticated POST: **405**, `Allow: GET`.
- All inspected adapter responses: `Cache-Control: no-store`.
- Actual Loader entry was mounted. `entry.update({disabled:true})` and
  `ctx.loader.await()` disposed its Cordis fiber (state 4, `DISPOSED`);
  authenticated GET then returned **404**. Re-enable restored **200**.
- Original launcher `shutdown.shutdown(0)` completed. A fresh, non-pooled HTTP
  connection then failed with **ECONNREFUSED**. Runner exited **0**; no local
  Host process remains from this run.
- TypeScript **6.0.3**, strict NodeNext, **without skipLibCheck**: passed against
  the original built Host declarations and this package's declaration entry.

These are real loopback HTTP requests against real Host/Connection/Loader/Cordis,
not the four earlier tests that use service doubles. Early harness assertions
were corrected: Loader retains a disposed fiber object, and pooled sockets can
reset during shutdown; the final runner checks its disposed state and uses
fresh connections. Neither required an adapter implementation change.

Limits: no browser UI, external Host, API/non-owner Peer flow, injected-service
loss/recovery, package-manager tarball installation or exhaustive auth matrix was
tested. The existing mocked non-owner test remains distinct from live evidence.
Native compatibility with the installed Nix Node remains a prerequisite for
running this Host under that binary; the workspace-local binary supplied the
successful smoke. Issue 30/bootstrap export remains untouched.

# Issue 36: original UI submission, real reply blocked by credentials

Validated 2026-11-10 from parent `dd6d743`, in this worker's own ignored
scratch with independently acquired, frozen-installed and rebuilt upstream
`fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159`. Upstream tracked sources remain
unmodified. **Actual model reply acceptance is not complete.**

The normal official contenteditable composer received text through Chromium's
input interface, followed by Enter. Exactly one original HTTP `session/prompt`
reached the real Host. Its original transport `rpcId` returned unchanged with
`result: {ok:true,value:{accepted:true}}`. The original client-generated prompt
`requestId` appeared as `source.rpcId` on exactly one durable `user/message`.
The original composer cleared the accepted draft and displayed the message once.
The original UI subsequently displayed the real failed turn:

`MISSING_CREDENTIAL`: no API key for provider route `deepseek-official`.

The isolated Host advertised `deepseek-official` and `deepseek-account`, with
default selection `deepseek-official/deepseek-flash`. It produced zero
`assistant/message` events. No mock model, fixture assistant echo, fake Host API,
invented credential, or newly connected paid provider was used. Read-only seeded
history is explicitly fixture data, not evidence of an assistant reply.

## Scoped implementation

The existing loopback session carrier now admits only POST `/api/session/prompt`
with its exact original envelope and `args.request`: bounded session/request
identities, `queue` or `steer`, optional bounded client time zone, and 1–8 exact
text parts with non-whitespace content and at most 8192 total UTF-16 code units.
The prompt body has a 64 KiB wire cap (including JSON escapes); existing reads
retain their 4 KiB cap. Empty continuation, files/images, extra fields, aliases,
queries, socket writes, creation, model selection, settings and credential APIs
remain denied. No catalog capability was required to submit through the composer.

The carrier forwards the admitted original body and Host response unchanged once.
It mints no identity, receipt or retry. Cookie custody, exact Origin/Host fencing,
no-store responses, redirect denial, original socket framing and the two exact
image capabilities remain as before. Original Connection, Gateway, recovery,
SessionManager, renderer and ordinary `ownsHost:false` target remain intact.

`scripts/dsh-submit-live-prepare.mjs` derives an owned submission runner from the
list/open handoff. It creates a persisted Agent through the original Host Session
API inside ignored scratch, attaches it to its owned Workspace, then opens it
through the official sidebar. This setup does not expose browser session creation.
The initial attempt reused the earlier in-memory read-only fixture and correctly
received a real Host persistence-not-found rejection; the final setup fixes only
that test fixture. It observes the journal through original `sessionQuery` and
checks receipt identity, durable correlation, draft settlement, and one visible
prompt. It deliberately exits nonzero when no actual assistant message exists.

## Environment and checks

Linux x64 glibc; Node `24.21.0`; frozen pnpm `11.28.5` (launched via system pnpm
`12.9.0`); Nix Chromium `155.0.8059.84`. T3 `preview_status` reported unavailable and
`preview_open` failed with `This host is missing libraries T3's browser needs`
(including libglib/libnss3). The Nix Node build passed **8/8 original artifact
gates in 104.78s**. Runtime used pnpm-provided `node-linux-x64@24.21.0` because
of the documented Nix Node native Host preparation limitation.

The focused tests passed **18/18**, including all prior 16 tests, using this
workspace's installed original `ws`. New transport tests use explicit test
doubles to check bounds, exact forwarding, receipt/error preservation and no
retry; they do not establish a model reply. Original source verification and
`git diff --check` passed.

First reproduce the [original artifact build](dsh-artifact-build.md) in the
current workspace. Then run from the repository root:

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
export DSH_HOME="$PWD/.scratch/status-live/submit-final-home"
export DSH_AGENTS_HOME="$PWD/.scratch/status-live/submit-final-agents"
export DSH_TELEMETRY_DISABLED=1
node --test scripts/test/dsh-{bootstrap-carrier,rpc-carrier,events-transport,session-carrier}.test.mjs packages/dsh-host-status/test/status.test.js
node scripts/dsh-submit-live-prepare.mjs
node --check .scratch/status-live/anchor/submit-smoke.mjs
pnpm --config.auto-install-peers=false dlx --package=node-linux-x64@24.21.0 \
  node .scratch/status-live/anchor/submit-smoke.mjs \
  > .scratch/dsh-startup/submit-runtime.log 2>&1
# The previous command intentionally fails until an actual reply exists.
# Run these final integrity checks separately after inspecting that result:
bash scripts/dsh-upstream.sh verify
git diff --check
```

Port 4178 must be free. Private evidence is under `.scratch/dsh-startup/`:
`submit-result.json`, `submit-network.json`, `submit-composer.json`,
`submit-live-result.json`, `submit-live-dom.html`, and `submit-open.png`
(visually inspected). Runtime logs and owner cookie stay private and ignored.
The final browser run passed all receipt/settlement assertions, then exited 1
at `BLOCKED: no actual model reply`. The runner terminates owned carrier/Chromium processes normally and invokes
original Host shutdown in `finally`, including on the failed reply assertion.

## Precise next step

Provide an explicitly authorized real test provider for this isolated Host,
entering any required credential through the supported private secret flow.
Keep credentials server-side; do not read another workspace's credential state
or place literals in chat or tracked files. Rerun the same official composer
checkpoint and require an actual assistant reply, retaining the existing identity
and settlement assertions. No provider/account/settings UI expansion is needed
to establish the current transport result. Issue closure belongs to the parent.

# Issue 34: original Connection receives real Host events

Validated 2026-11-10 in an independently acquired and rebuilt scratch checkout of
unmodified DSH `fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159`. Frozen install passed;
all eight artifact gates passed in 105.03 seconds. No other worktree was used.

## Implemented boundary

`scripts/dsh-events-transport.mjs` exports
`createAuthenticatedEventsTransport({origin,cookie,WebSocket,onDiagnostic})`.
This Node-only physical transport consumes the original signed cookie obtained
through original launch-token exchange. It directly connects to the configured
loopback Host; there is no intermediate server, gateway, tunnel or reconnecter.
Only `ws://127.0.0.1:port/api/remote.mux` is permitted, with no query or path alias.
Only original `$events` open frames with `{args:{}}` and cancellation frames can
be sent. No arbitrary stream endpoint, unary method or uplink is granted.
`ownsHost:false` preserves the ordinary target's ownership classification.

The injected Node `ws` constructor comes from the original Gateway dependency.
The cookie and exact Host Origin are sent on that one upgrade; redirects are
disabled. Original Host Connection trust/admission and Gateway event admission
remain authoritative. No CORS or Origin rule changes. Authentication credentials
remain private process inputs; no browser request supplies credentials or targets.

The returned hooks go into original `installConnection`. The original Typert
registry and Gateway Client face own `$events`, ready-frame validation,
`remote.$on`, Cordis dispatch, generation/reset state, socket lifecycle and
recovery. The adapter never parses or fabricates incoming frames. It has no
recovery timer. Its handshake timeout bounds only one physical upgrade attempt.
Safe diagnostics expose upgrade HTTP status, socket system error code and close
code, never headers, URLs, error messages or frame data. `unexpected-response`
explicitly closes the rejected attempt so original recovery can proceed.

## Reproduce

First perform [the pinned artifact build](dsh-artifact-build.md) in this workspace.
Run in Bash from the repository root, stopping on failure:

```bash
set -euo pipefail
umask 077
export XDG_CACHE_HOME="$PWD/.scratch/upstream/.cache"
export XDG_DATA_HOME="$PWD/.scratch/upstream/.data"
export XDG_STATE_HOME="$PWD/.scratch/upstream/.state"
export PNPM_HOME="$PWD/.scratch/upstream/.pnpm"
export npm_config_cache="$PWD/.scratch/upstream/.npm-cache"
export npm_config_store_dir="$PWD/.scratch/upstream/.pnpm-store"
export NARB_NATIVE_CACHE_DIR="$PWD/.scratch/events-live/native-cache"
export DSH_HOME="$PWD/.scratch/events-live/home"
export DSH_AGENTS_HOME="$PWD/.scratch/events-live/agents"
export DSH_TELEMETRY_DISABLED=1
node --test scripts/test/dsh-events-transport.test.mjs
node scripts/dsh-events-live-prepare.mjs
pnpm --config.auto-install-peers=false dlx --package=node-linux-x64@24.21.0 \
  node .scratch/status-live/anchor/events-smoke.mjs \
  > .scratch/upstream/logs/events-runtime.log 2>&1
cat .scratch/status-live/events-result.json
bash scripts/dsh-upstream.sh verify
git diff --check
```

All pnpm provisioning state is workspace-local. The pnpm-supplied runtime is
required by the native Host caveat in [the status handoff](dsh-status-live-validation.md).
The preparation module reuses the existing status anchor helper, appending its
own tracked harness to the original launcher prefix. It does not edit the helper,
original sources, startup entries or RPC implementation. The Host uses an isolated
ignored events home. Runtime logs may contain the synthetic launch token: keep
scratch private; publish only the credential-free result file.

## Actual evidence

The final harness exited **0**:

- Original root token exchange returned **303** and supplied its signed cookie.
- Original Connection established ready generation **1**. Host home was a string;
  `connection.isLoopback` remained **false** for `location.hostname=target.invalid`.
- Original Host `ctx.commands.register` registered the temporary
  `mygo-issue34-event-probe` command, then its disposer removed it. Original
  Commands service generated `commands/change` for both operations; original
  API Remotes forwarded them and Client `remote.$on('commands/change')` received
  both, with the original empty argument list. No manual `emit`, fake Host
  notification, raw-socket-only success check, session or user operation was used.
- The harness closed the physical socket with code **4000**. Without calling
  `connection.reconnect`, original Connection/Gateway recovery established
  generation **2** and emitted a second `connection/reset`. A second temporary
  command registration/removal produced two further delivered notifications:
  **4 received**, **2 generations**, **2 resets** total.
- A second original Client using an invalid cookie had **no ready generation**.
  Its first upgrade yielded
  `{code:'events-transport/upgrade-rejected',status:401}`. The failure is directly
  diagnosable rather than inferred from a readiness timeout. It was then disposed.
- Both Clients disposed through their Cordis fibers; original Host shutdown ran
  in `finally`. A fresh non-pooled HTTP request returned **ECONNREFUSED** afterward.
- Two focused unit checks passed for capability scope, exact frame forwarding,
  credential isolation and safe initial-failure diagnostics. These doubles are
  separate from the real Host evidence. Syntax/whitespace checks and final
  upstream pristine-pin verification passed.

## Parent integration after issue 32

No edits to `dsh-startup.mjs`, `dsh-bootstrap-carrier.mjs`, startup `bootstrap.js`,
shared preparation helpers or RPC files are part of this commit.

For an authenticated Node composition, construct the new hooks once with the
explicit authorized Host origin, private cookie from original exchange and the
original installed `ws` constructor. Merge them into the existing Connection
transport **before** Gateway activation, alongside issue 33's existing fetch
capability. Install Connection with `interactions:'answer'`, the actual selected
target location and no ownership elevation. Do not provide `rpc.open` or
`openStream`: original Gateway must choose its socket mux and register the
original event generation source. Mount original registry/Gateway through the
normal Loader. Subscribe through `ctx.remote.$on`, observe
`connection.generation/state` and `connection/reset`, and route safe diagnostics
to the existing startup error presentation. Original controller handles recovery.
The standalone harness demonstrates the complete original client path independent
of UI bundle activation.

This Node transport cannot be bundled into a browser: browser WebSocket cannot
set this cookie header, and the local bootstrap carrier's origin does not own the
Host cookie. Parent must retain an explicitly authenticated original browser
socket route/cookie context, or a separately authorized existing platform socket
factory. Do not expose the cookie in globals, set `ownsHost:true`, weaken Origin,
or add a privileged general proxy to bridge that gap. This task supplies no new
browser bridge. The standalone proof is **not** a complete UI/session connection.

Other limits: scoped notification reception only; waterfall replies require their
own existing authorized unary path and were not exercised. No external Host,
non-owner Peer, UI/session interaction, exhaustive recovery cases or automated
browser acceptance was tested. No blocker remains for the standalone Node event
proof; browser wiring/authentication custody remains the explicit parent boundary.

# Persistent local test DSH

This environment owns a persistent original Host and the existing narrow mygo
carrier. It differs from the earlier smoke runners, which shut down in `finally`.
Source stays pinned and unmodified at `fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159`.
Run all commands from this repository root. Generated files, credentials, logs,
profiles and caches stay private under ignored `.scratch`; do not publish logs.

```bash
bash scripts/dsh-test-prepare.sh all
node scripts/dsh-test-host.mjs start
node scripts/dsh-test-host.mjs status
node scripts/dsh-test-host.mjs check-ui
node scripts/dsh-test-host.mjs check-auth
node scripts/dsh-test-host.mjs open
node scripts/dsh-test-host.mjs stop
```

Preparation supports separate `acquire`, `install`, and `build` stages and can be
rerun after interruption. Install is frozen, uses pnpm 11.28.5, and caches are set
before every pnpm invocation including dlx. Build uses the original eight-gate
artifact graph. Runtime uses pnpm-provided `node-linux-x64@24.21.0`, because Nix
Node fails native Host preparation. No upstream sources are patched.

`start` detaches its launcher, waits for readiness, and retains the Host after the
command/agent exits. `status` verifies the recorded PID's exact runner argument,
checks the Host's unauthenticated 401 and the carrier's 200, and prints only safe
configuration facts. `stop` verifies ownership and sends SIGTERM; the runner
terminates its owned carrier and calls original Host shutdown. No force signal
or deletion is used. Restart with `stop`, then `start`; persisted workspace and
session are reused. Only one build/start command should run at once.

The carrier URL is <http://127.0.0.1:4178/>. It retains the existing narrowly
admitted read/submit capabilities and server-side original owner cookie custody.
The random original Host origin is printed by `status`; direct unauthenticated
requests remain rejected. Neither auth policy nor client implementation changes.

`open` starts visible Nix Chromium with a private fresh profile, then delivers
the original authenticated Host URL privately over loopback CDP. The URL never
appears in the terminal or Chromium command line. The official Host exchanges
its own launch token for its own signed cookie. This opens the **full official
Host UI**, including Models credential settings; it requires a desktop display.
`check-ui` instead opens the carrier in headless Nix Chromium, verifies original
module activation and the retained test workspace, then stops its browser.
`check-auth` performs the same headless check against the authenticated full
official Host UI instead of the narrow carrier. T3 preview was attempted first but its host lacks shared browser libraries.

## Provider configuration

The original web composition registers `deepseek-official` and
`deepseek-account`, with default `deepseek-official/deepseek-flash`. The official
API-key adapter uses the credential reference **`DEEPSEEK_API_KEY`** and endpoint
`https://api.deepseek.com/anthropic`. The supported credential service resolves
its private managed file before inherited environment and workspace/home `.env`.
All DSH home state is isolated in `.scratch/test-dsh/home`; this launcher reads
only `.scratch/test-dsh/.env` and that private home `.env`, plus inherited env.
No global credential directories or other workspaces are consulted by the helper.

To supply an authorized key, use the authenticated official UI Models page, or
copy [the template](dsh-test-provider.env.example) to `.scratch/test-dsh/.env`,
restrict it to mode 0600, and edit the `DEEPSEEK_API_KEY` field privately. Restart
after changing `.env`. Never enter the key into chat, a tracked file, shell command
arguments or a credential URL. No secretRef is requested because these local
launch tools have no secure secretRef consumption interface.

The source also supports generic providers through `dsh-llm-pi-ai` with explicit
protocol, endpoint, catalog and credential references. No such provider is
invented/configured without an available real endpoint/model. Bounded discovery
of conventional loopback Ollama/LM Studio/OpenAI-compatible endpoints at ports
11434, 1234, 8080 and 8000 found none in this run. The inherited environment and
workspace had no legitimate provider credential/configuration available.

Until an authorized credential is supplied, Host readiness and original UI
readiness do **not** complete issue 36. The required remaining secret field is
`DEEPSEEK_API_KEY`. Do not claim a real assistant reply from an accepted prompt.
The existing `dsh-submit-live-prepare.mjs` official-composer checkpoint remains
the send/reply acceptance check; run it with workspace-isolated DSH state and a
configured provider, and require `assistant/message` plus the existing receipt,
durable request identity and composer settlement checks. Stop the retained Host
before running that old smoke runner because both own carrier port 4178.

## Validation (2026-11-10)

Fresh frozen installation passed. All **8/8** original artifact gates passed in
98.24 seconds; pinned-source verification passed afterward. Existing focused
carrier/Host tests passed **18/18**. Syntax and whitespace checks passed.
A detached Host started successfully, original login returned 303, authenticated
adapter status returned 200, unauthenticated adapter status returned 401, and the
carrier returned 200. Real headless Chromium verified original live client
activation and the retained workspace through both the carrier and privately
authenticated official Host UI. Normal stop closed the previous Host listener;
restart reused the persisted session. The final owned Host is intentionally left
running; inspect its current origin/PID using `status`.

The actual credential service reports `DEEPSEEK_API_KEY` unconfigured. No real
assistant reply was attempted or claimed in this environment; issue 36 remains
incomplete until the authorized key is supplied and its composer checkpoint
produces an actual assistant message.

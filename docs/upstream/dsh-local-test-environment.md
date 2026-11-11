# Persistent local test DSH (model mock by default)

**Current local-shell behavior:** the clean mygo document is available without
remote admission; remote status, API, bootstrap and WebSockets still require
original DSH authentication. Local device profile/preferences writes no longer
require remote admission. Earlier root-401 records below describe the historical
checkpoint. See [ADR 0006](../adr/0006-local-shell-and-override-application.md).


**Active authentication update:** the anonymous scoped carrier described below is
retired from the active path. See [browser authentication and retained 4190 entry](dsh-browser-auth-validation.md)
for current startup, private login, permission checks and browser port requirements.
The earlier validation records below remain historical evidence.

No API key or account setup is needed. The default starts a deterministic local
**MODEL MOCK HTTP server** and configures the original `dsh-llm-pi-ai` provider
through its existing profile patch seam. This is not a real LLM. The original
HostAgent, Session, Remote, UI composer, receipt and request identities remain
unchanged. No assistant journal event is seeded by the test helper.

Run from this repository root:

```bash
bash scripts/dsh-test-prepare.sh all
DSH_CLIENT_PORT=4180 node scripts/dsh-test-host.mjs start
node scripts/dsh-test-host.mjs status
node scripts/dsh-test-host.mjs check-submit
node scripts/dsh-test-host.mjs check-ui
node scripts/dsh-test-host.mjs stop
DSH_CLIENT_PORT=4180 node scripts/dsh-test-host.mjs start
```

Open <http://127.0.0.1:4180/>, choose **Local test DSH**, then
**Local MODEL MOCK reply**, and use the original composer. Replies say:
“Hello! This is a deterministic local model mock reply.”

`DSH_CLIENT_PORT` defaults to **4180** and must be free. This environment never
owns the older environment at 4178. Host and mock bind random loopback ports;
`DSH_MOCK_PORT` optionally selects a free mock port. `status` prints safe origins,
provider selection, Host authentication fence, client status and mock health.
The mock serves only `/health` and streaming `/v1/chat/completions`; it has no
external inference fallback. Official/account providers are disabled in mock
mode. The OpenAI protocol requires a key, so the launcher automatically supplies
`nonsecret-local-model-mock`, public dummy test data, through the original
credential reference seam. No real credential is required or supplied.

Preparation supports `acquire`, `install`, `build`, and `all`, using a fresh
workspace-owned ignored `.scratch`. Source stays pinned and unmodified at
`fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159`. Frozen pnpm 11.28.5 installation
and the original eight artifact gates are retained. Every pnpm invocation,
including dlx, receives workspace-local XDG/cache/store/PNPM_HOME settings first.
Runtime uses pnpm-provided `node-linux-x64@24.21.0`; Nix Node builds artifacts
but fails original native Host preparation. No other worktree is consulted.

`start` detaches the owned runner and waits for readiness. `stop` verifies the
recorded PID's exact workspace runner argument and sends normal SIGTERM. The
runner stops its owned carrier, shuts down the original Host, and closes the
mock listener. Restart uses `stop`, then `start`; persisted workspace/session
are reused. Do not run concurrent lifecycle/validation commands. No force
signals, resource deletion, or global cleanup are used.

`check-submit` asks the owned runner to run real headless Chromium against the
carrier. It clicks the original sidebar session and types/presses Enter in the
original contenteditable composer. It requires one unchanged original prompt
receipt, durable user request correlation, a durable original assistant message,
original WebSocket assistant frames, a cleared draft, and one visible prompt.
It records **model-mock** evidence privately under `.scratch/test-dsh/`:
`submit-validation.json`, `submit-browser.json`, and `submit.png`.
On first startup only, the launcher gives its blank session one labeled warm-up
prompt through the original `sessionController.prompt` and model HTTP adapter.
This is needed because the original sidebar hides unselected blank sessions.
It waits for the real HostAgent's assistant event and turn settlement; it never
appends fabricated history. Browser acceptance then submits a separate prompt.
Restart reuses the durable conversation without repeating the warm-up.
`check-ui` and `check-auth` check carrier and authenticated official UI readiness.
Headless browsers close in `finally`. T3 preview was tried first; this host reports
`This host is missing libraries T3's browser needs`, so Nix Chromium is used.
`open` optionally opens visible authenticated official UI with a private profile;
its owning helper waits for that browser to close. Launch URLs/cookies stay private.

## Real provider opt-in and historical limits

`DSH_TEST_PROVIDER=real DSH_CLIENT_PORT=4180 node scripts/dsh-test-host.mjs start`
retains the original official provider composition. Stop the existing runner
first. No mock starts in real mode. The official API adapter references
`DEEPSEEK_API_KEY` and `https://api.deepseek.com/anthropic`. Supply an authorized
key privately through the authenticated official Models UI or workspace-private
`.scratch/test-dsh/.env` (mode 0600; see `dsh-test-provider.env.example`). The
launcher consults only that file, its isolated DSH home `.env`, and inherited
environment. Do not put real keys in chat, tracked files or command arguments.
Existing explicitly selected session models may need selection through official
UI when changing providers. Real-provider validation remains separate.

The earlier submit handoff documented a real `MISSING_CREDENTIAL` failure and
zero assistant messages. That historical result remains accurate; it is no longer
a blocker for the newly authorized **mock-model** acceptance path. A mock reply
must never be reported as a real-LLM reply. The parent owns issue 36's criteria
change and issue operations.

## Validation (2026-11-10)

Fresh frozen pnpm 11.28.5 install passed. Its standalone downloader stalled;
resuming with the same downloaded version's Node entry point reused 815 packages
and finished in 35.4s. `install` now prefers that entry point on reruns.
All original artifact gates passed **8/8** (97.30s); a confirmation run passed
**8/8**, exit 0 (29.08s). The first wrapper returned 127 after reporting all gates
passed; the unchanged confirmation command resolved that exit uncertainty.
Focused Host/carrier/model tests passed **19/19**.

Real Chromium exercised the original composer through the carrier at 4180.
The original receipt preserved its transport rpcId and `{accepted:true}` result;
the requestId correlated to exactly one durable user message and one new durable
assistant message. Three original text chunks retained the mock's delayed
streaming, usage was 12 input / 14 output / 26 total, finish was `stop`, and turn
end was `completed`. The draft cleared and neither prompt nor new reply duplicated.
The screenshot was inspected. All results are **MODEL MOCK**, not real inference.

Normal SIGTERM closed the owned Host, carrier and mock listeners (all three
refused connections afterward). Restart reused the same persisted session with
zero new model requests before the next UI submission. The final validated
environment is intentionally left running at 4180. Current ports/PID come from
`status`; private runtime artifacts are not committed. Source-pin verification,
syntax checks and whitespace checks passed. No other worktree was used.

## Explicit tailnet presentation

From this worktree, retain the presentation listener on all interfaces with one
exact public origin:

```bash
DSH_CLIENT_PORT=4181 DSH_CLIENT_BIND=0.0.0.0 \
DSH_CLIENT_PUBLIC_ORIGIN=http://100.97.207.47:4181 \
node scripts/dsh-test-host.mjs start
node scripts/dsh-test-host.mjs status
node scripts/dsh-test-host.mjs check-submit
node scripts/dsh-test-host.mjs stop
```

Open <http://100.97.207.47:4181/>. Loopback
<http://127.0.0.1:4181/> remains admitted for local checks. Without these
variables the default remains loopback. Repeat all three variables after stop
to restart with the public listener; status records the effective origins/bind.

This is an explicitly authorized test capability for devices able to reach the
listener, including the user's tailnet. It supplies the existing narrow
bootstrap/session capabilities without a browser login. Host/Origin checks
prevent other browser origins from borrowing it; they are not network-client
authentication. Network access controls remain the operator's responsibility.
A non-loopback bind requires a configured public origin. All presentation HTTP
paths and browser sockets check exact Host and matching Origin; socket upgrades
also require Origin. Missing Origin is allowed for HTTP tools/navigation.
Cross-site fetch metadata is rejected. Forwarded headers cannot widen trust.
No wildcard Host, suffix matching, or arbitrary Origin reflection is used.
The original upstream Host and model mock remain loopback, original Host
authentication is unchanged, and its cookie/launch token remain server-side.
Original asset and socket references resolve relative to the browser's public
origin; the carrier preserves original client Host ownership as false.

### Tailnet validation in t3-202246ac (2026-11-10)

A fresh install and original artifact build in this worktree passed all 8 gates
(103.28s); the original pin remains unchanged. Focused carrier/trust/model/event
and Host authentication tests passed 21/21.

`node scripts/dsh-test-host-network.mjs` connected to the actual Tailscale IP:
HTTP 200, WebSocket 101, bad Host/Origin and missing socket Origin 403,
loopback HTTP 200, unauthenticated original Host 401. It writes safe evidence
to ignored `.scratch/test-dsh/network-validation.json`.

`node scripts/dsh-test-host.mjs check-submit` used Nix Chromium at
`http://100.97.207.47:4181/`, with original sockets at
`ws://100.97.207.47:4181/api/remote.mux`. Original composer, accepted receipt
identity, durable request correlation, three streamed mock deltas, one new
assistant message, usage, stop framing, turn settlement, cleared draft and no
duplicate prompt/reply passed. Screenshot inspected. This is MODEL MOCK only.

Normal stop closed the original Host, carrier and mock listeners. Restart kept
the same persisted session and made zero startup model requests; public network
and composer validation then passed again. The 4181 environment is intentionally
retained for the user. Evidence proves this host can reach its Tailscale address;
a separate device's tailnet ACL/routing was not tested. T3 browser automation
explicitly failed for missing system libraries, so the existing Nix Chromium
helper provided browser proof. No other worktree/runtime was used.

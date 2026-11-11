# Connecting and switching DSH instances

Settings → Instances and the existing sidebar instance menu now connect to the
chosen profile. Save edits the profile; Connect registers its credential-free
HTTP(S) origin with the local carrier and opens an explicit instance route.
The seeded instance uses the same action as every other profile.

Switching reloads the document and recreates one client Context/Loader. Each Host
provides its original bootstrap and client packages. The previous page is closed;
local plugin preferences and the catalog survive. Runtime Entry/fiber objects do
not survive the page navigation. Separate tabs keep their own routes.

An unauthenticated target first asks mygo's private credential store to restore
the instance login. Only the first login (or a changed/revoked token)
shows the original-style form for that target's private launch URL or token.
The successful token and Host-issued cookie are stored in
`.scratch/dsh-startup/instance-credentials.json` with mode `0600`, keyed by the
stable instance ID and authentication view. The saved origin limits reuse of
the Host cookie; changing an address retains the token but requires a fresh
native exchange at the new origin. They are never returned to JavaScript,
placed in a profile or retained in the route URL, or shared with another
instance. Mygo acts as the reverse proxy and injects only that instance's native
credential upstream, preserving Peer/Gateway permission checks. Mygo user
authentication is a separate outer system and is not replaced by DSH cookies.

Remote localStorage/sessionStorage have separate namespaces per instance,
origin and authentication view. Device preferences use the stable device seed.
This is logical state separation for the original client, not a security sandbox
for arbitrary same-origin JavaScript. See [ADR 0007](../adr/0007-explicit-instance-routes.md).

An unreachable target stays on its explicit route, with the local Instances
settings available to select another one. It does not silently display data
from the previous Host. Registered route metadata is retained privately in
`.scratch/dsh-startup/instance-routes.json`; credentials live separately in the
private credential store above.

For one stable instance ID and authentication view, the newest connection
profile is canonical. Historical route hashes resolve to that current carrier,
so an old tab follows a restarted local DSH even when its loopback port changes.
The deployment seed overrides its own persisted historical addresses; unrelated
instances and authentication views remain separate.

## Reproduce the two-Host workflow

Use Node 24 and source `scripts/dsh-test-env.sh` first. Start the main owned test
environment as described in [the local environment guide](dsh-local-test-environment.md).
It prepares the private original Host anchor. In a second terminal:

```bash
source scripts/dsh-test-env.sh
umask 077
cp scripts/dsh-switch-host.mjs .scratch/status-live/anchor/switch-host.mjs
pnpm --config.auto-install-peers=false dlx --package=node-linux-x64@24.21.0 \
  node .scratch/status-live/anchor/switch-host.mjs > .scratch/second-host-runtime.log 2>&1
```

The second runner uses a separate DSH home, agents directory, workspace and model
mock. It retains its fixture session and uses the original durable request ID
settlement to avoid duplicate warm-up prompts on restart. Its private metadata
and native login link are in `.scratch/test-dsh/second/`. The switch scenario also
writes a private mygo login URL to `second/client-launch-url` without printing it.
The runner remains attached to that terminal; Ctrl+C performs normal shutdown.
For the retained background fixture, its owned PID is in `second/status.json`;
send that PID SIGTERM for the same shutdown path. Do not print raw Host logs,
which contain native launch links.

```bash
node --test scripts/test/*.test.mjs
node scripts/dsh-unified-plugins-browser.mjs --switch-instances
node scripts/dsh-unified-plugins-browser.mjs --ui-audit
node scripts/dsh-test-host-network.mjs
node scripts/dsh-test-browser.mjs check-instance
bash scripts/dsh-upstream.sh verify
```

The switch workflow uses the real original UI and two real pinned Hosts. It
checks Settings connection, refusal of the first Host's cookie at the second,
invalid-login rejection, valid login, different real session lists, original
composer submission and MODEL MOCK reply, sidebar return with retained first
login/cache, retained device plugin preference, and recovery through local
settings from an unavailable target. Private proof: `instance-switch-validation.json`
and `instance-switch-B.png` under `.scratch/test-dsh/`.

The repository suite passes 42 tests, including public-edge control rejection,
credential partition, independent tab routes, proxy socket closure and Storage
namespace behavior. Production and explicit legacy adapted builds pass. The
original Host authority checks and original main-instance composer workflow also
pass. The UI audit covers the original pages at four screen widths.

Limits: full-page switching, not live in-place module replacement or several
simultaneous Host trees in one document. The two live targets are HTTP loopback
DSH instances; HTTPS transport uses normal certificate validation but was not
tested against a live TLS Host. The original model provider is backed by the
local HTTP mock. Second-Host normal shutdown/restart retained the fixture ID.
No real-model inference, physical Android test, adapter-wide
semantic TypeScript check, non-owner login, or arbitrary third-party plugin
compatibility is claimed. The pinned upstream source remains pristine.

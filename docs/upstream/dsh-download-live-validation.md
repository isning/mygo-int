# Issue 41: original Session file-menu download

Implemented from parent `50ff9ee`, with original upstream source
`fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159` acquired and built in this
worktree's ignored scratch. Original React, SessionManager, generated Remote,
Connection, Gateway, workspace-file lookup/read implementation and file-action
plugin are unchanged. Shared startup, bootstrap, session carrier and test Host
files are unchanged. Parent owns integration and issue updates.

## Capability and exact parent wiring

Parent integration now mounts this handler in startup. Set
`DSH_DOWNLOAD_TARGETS_FILE` to a trusted local JSON file containing the exact
`[{"sessionId":"...","path":"..."}]` grants. Without that configuration the
handler grants no files. Restart after changing grants. The retained demo has
not been updated by this integration; the evidence below is the isolated run.

The confirmed path family is the original file-context-menu Remote pair:
POST `/api/workspaceFiles/stat` and POST `/api/workspaceFiles/readBytes`.
`ui-file-actions/src/client/context-menus.tsx` resolves metadata using the former,
then its `source.read` calls the latter with empty options. `files.ts` saves the
resulting original-byte Blob through its own download anchor and filename logic.
These are not an `/api/file` filesystem proxy or attachment-storage API.

At the pin, `workspace-files/src/index.ts` maps `workspaceFileScopeId` through
the original Session resource lookup, derives the Session directory, and supports
paths outside that directory. Therefore the new carrier deliberately requires
an explicit, server-owned list of exact `{sessionId,path}` targets. An empty list
admits no files. Parent must select the intended Session/path through its trusted
configuration; never construct this list from an untrusted request or grant a
whole filesystem. The list is copied at construction; replace the handler when
revoking/changing grants. Each grant belongs to this handler's one Host origin
and private authentication view. This is a restricted one-file checkpoint,
not automatic discovery of all files mentioned by a Session.

In `dsh-startup.mjs`, import and instantiate alongside the other carriers:

```js
const { createDownloadCarrier } = await import('./dsh-download-carrier.mjs')
const downloadCarrier = bootEnabled ? createDownloadCarrier({
  origin: process.env.DSH_ORIGIN,
  cookie: ownerCookie,
  publicOrigins,
  targets: authorizedDownloadTargets, // trusted exact Session/path pairs
}) : undefined
```

In the existing request handler, after its trust check and **before** the
inventory RPC carrier and generic method rejection:

```js
if (downloadCarrier && await downloadCarrier(request, response)) return
```

No bootstrap, lazy mapping, Remote contract, Session transport or client change
is required for this path. The module declines unrelated routes, so ordering
before the inventory rejection is required. It claims malformed query variants
of its two paths and denies them. Only ordinary generated envelopes with exact
argument keys, an exact Session/path grant and empty `readBytes` options pass.
There is no range, baseFile, write, list, image or arbitrary-path capability.
Requests are bounded at 16 KiB before dispatch. Host retains its own full-file
size bound and regular-file checks.

The configured Host is loopback HTTP. Presentation Host and Origin must match
an exact allowed origin; the live demo uses only the explicitly added
`http://100.97.207.47:4186` public origin (plus the shared trust helper's local
loopback origin). Browser cookies and unrelated headers are discarded, the
server-private owner cookie is substituted, and request envelopes are forwarded
byte-for-byte exactly once. Host Connection admission, RemoteAccess Session
resource authorization, lookup and storage remain in the original request path.
The original status, Content-Type (including binary multipart framing), and
response bytes pass through unchanged. Set-Cookie is never forwarded. Responses
are no-store; redirects and transport failures fail with 502 before headers,
or terminate an already-started response. Reads are streamed with backpressure,
timeout and client-disconnect cancellation. No local filesystem read exists in
the carrier. No retry, queue, offline policy or fabricated success is added.

## Reproduction

From this worktree root:

```bash
bash scripts/dsh-test-prepare.sh all
node --test scripts/test/dsh-{download-carrier,upload-carrier,bootstrap-carrier,rpc-carrier,events-transport,session-carrier,model-mock}.test.mjs packages/dsh-host-status/test/status.test.js
umask 077
node scripts/dsh-download-live.mjs > .scratch/download-live-run.log 2>&1
bash scripts/dsh-upstream.sh verify
git diff --check
```

The prepare helper uses the documented original frozen pnpm 11.28.5 artifact
build. All pnpm invocations, including the harness's Node provisioning, receive
workspace-local XDG cache/data/state, PNPM_HOME and npm cache/store variables
first. Build uses Nix Node; Host runs with pnpm `node-linux-x64@24.21.0`.
The standalone harness checks **4186** is free before launch, binds its client
on **0.0.0.0**, and navigates the public Tailscale origin above. Internal Host
and model are private loopback listeners. It derives private generated runners
from shared helpers using checked replacement seams; it never edits them.

The harness creates its own 35-byte `ticket41.txt`, containing NUL and 0xff.
Only the model HTTP endpoint is mocked. The mock calls the actual `present`
tool; original Host validates the real file and records its delivery in the
Session. Original React renders the delivered file and inline mention. CDP
right-clicks that mention, chooses the original Download menu item, and lets
Chromium write the file into a fresh per-run download directory. The runner
compares every downloaded byte with the actual Host fixture and checks filename.
For failure it resolves the same menu, renames only its own fixture, then clicks
Download. Real Host read failure must produce the original error toast and no
second downloaded file. The fixture is restored in finally. The browser records
actual Remote request/response metadata; credentials are excluded from evidence.
On normal success/failure the harness stops its client, Host, model and Chromium.
Generated data, profiles, credentials, logs and evidence are ignored scratch.

## Observed checks, 2026-11-10

- Fresh frozen dependency install passed; original build passed **8/8 gates in
  107.17 seconds** and recorded 367 client artifacts.
- Focused carrier/Host/model tests passed **23/23**. Download-specific checks cover
  exact grants, cross-Session/path/options rejection, byte and error preservation,
  private-cookie substitution, exact origin/Host trust, redirects and no retries.
  Synthetic servers in unit tests verify carriage only; live evidence uses real Host.
- T3 preview status was unavailable; preview open failed with `This host is
  missing libraries T3's browser needs`. The documented Nix Chromium fallback
  exercised the original UI at the Tailscale origin.
- Chromium saved **ticket41.txt, 35 bytes**, byte-equal to the Host fixture.
  The original UI showed **Download started**. Removing availability between
  metadata resolution and read showed **Could not save. Check the source and
  destination, then retry.** Both screenshots were visually inspected.
- Client reports `ownsHost:false`. Client, Host and model ports all returned
  ECONNREFUSED after normal shutdown. Upstream tracked-source verification and
  `git diff --check` passed.

Private evidence: `.scratch/download-live/validation.json`,
`download-browser.json`, `download-ready.png`, `download-failed.png`, and fresh
`downloads-*/ticket41.txt`. An initial browser run downloaded correctly but its
failure-toast assertion used the wrong text and timed out; the corrected rerun
passed. Earlier outputs are not counted as a fresh successful download.

The existing delivery card also says **Could not read the Host desktop
information** because its separate desktop-opening RPC is outside this carrier's
grants. The original context-menu download works independently; no desktop-open
or general preview capability is claimed. Shared startup is not yet wired to
this module by this commit. Parent must supply trusted exact target grants.
No GitHub mutation, deployment or retained demo process is part of this work.

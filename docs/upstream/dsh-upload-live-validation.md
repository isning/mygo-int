# Issue 40: original file selection and Host upload receipt

Implemented from parent `d81aa3b`, retaining original source pin
`fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159`. This is an online file-upload
capability and a standalone verification harness. Shared startup, bootstrap,
session carrier, test Host helpers, and original upstream sources are unchanged.
The parent must wire the module into its shared runtime as described below.

## Capability and parent wiring

`scripts/dsh-upload-carrier.mjs` exports `createUploadCarrier({origin,cookie})`.
Instantiate it with the same original loopback Host origin and server-private
owner cookie already used by the other carriers. In the existing HTTP handler,
**before** its generic non-GET rejection, add:

```js
const { createUploadCarrier } = await import('./dsh-upload-carrier.mjs')
const uploadCarrier = createUploadCarrier({ origin: hostOrigin, cookie: ownerCookie })
// Inside the request handler, before static routing / the generic method gate:
if (await uploadCarrier(request, response)) return
```

The module returns false for unrelated paths. Its only owned route is POST
`/api/session/uploadFileBinary?sessionId=...&name=...`; `name` is optional.
It rejects duplicate/unknown query keys, images (`mediaType`), empty or oversized
identities, control characters, path separators in names, wrong methods and
content types. It requires exact local Host and Origin and same-origin fetch
metadata when present. The configured destination must be loopback HTTP.
The 1 MiB carrier cap is an intentionally narrower intake bound, checked both
against Content-Length and actual chunks before any Host request starts.
Memory use is bounded by that cap; this implementation buffers that small intake.

The original client FileUpload Worker sends the raw bytes. The carrier substitutes
its server-private cookie, forwards once to the identical original route/query,
and passes the original HTTP status and response bytes unchanged. It does not
forward browser cookies, copy Set-Cookie, retry, mint receipts, normalize file
content, or manufacture Host errors. Responses are no-store. Redirects and
transport failures produce 502. The original Host Connection admission,
FileUploads Session ownership, attachment provider, staged receipt and original
UI ready/error state remain authoritative.

No bootstrap/browser wiring or new lazy module mapping is needed: the original
file input and background upload service already use this document-relative
resource route. No additional RPC, generic proxy, persistent offline queue,
image upload, download capability, or prompt attachment admission is introduced.
The existing session carrier still admits text-only prompts. Do not interpret
an upload receipt as proof of attachment prompt submission; that is outside this
checkpoint. Parent network/trust work should retain the same route bounds while
integrating its shared origin and credential custody.

## Reproduction and isolated harness

From this worktree root, prepare the original artifacts using the existing staged
helper (`acquire`, `install`, `build`, or `all`):

```bash
bash scripts/dsh-test-prepare.sh all
node --test scripts/test/dsh-{upload-carrier,bootstrap-carrier,rpc-carrier,events-transport,session-carrier,model-mock}.test.mjs packages/dsh-host-status/test/status.test.js
umask 077
node scripts/dsh-upload-live.mjs > .scratch/upload-run.log 2>&1
bash scripts/dsh-upstream.sh verify
git diff --check
```

The harness sets all XDG cache/data/state, PNPM_HOME, npm cache/store variables
workspace-local before invoking pnpm, including dlx. It uses the required
pnpm-provided `node-linux-x64@24.21.0` for native Host preparation. It checks
**4183** is free before booting; it never uses 4180 or another worktree/process.
It derives private runners from the existing original-Host/browser helpers,
checking replacement seams and keeping generated files under
`.scratch/upload-live/`. `scripts/dsh-upload-browser.mjs` is the CDP test fragment
consumed by this harness, not a separate command. Shared helpers are only read.
The isolated durable session can be reused on reruns; upload receipts are newly
minted by Host each run. There is no offline replay.

The original Host/model-mock setup makes its owned session visible with a real
warm-up turn. Only the **model** HTTP endpoint is mocked; upload, Host, Session,
Remote and React UI are original. No API key or external user file is needed.
The harness creates a 33-byte scratch fixture (including NUL and 0xff), selects it
through Chromium CDP's original file input, and checks the original ready card.
It then selects an absent path inside its own scratch to exercise a real browser
read failure. The original error card/retry action and toast must be visible.
Pressing Enter with that failed attachment must preserve text and send no prompt.
Finally, the harness reads the returned file reference through the actual Host
`ctx.attachments.readFileStream` and compares every byte with the fixture.
Its normal success/failure exit stops its carrier, Host and model mock; Chromium
closes in the browser driver's finally block. Logs, owner credentials, launch
URLs, browser profiles and detailed evidence remain private ignored scratch.

## Observed validation, 2026-11-10

Fresh frozen pnpm 11.28.5 install succeeded. Original artifact build passed
**8/8 gates in 98.49s**. All focused Host/carrier/model tests passed **21/21**.
Upload tests use explicit local test servers for malformed requests and synthetic
receipt/error preservation; the browser run supplies the real Host evidence.

T3 preview was tried first: status reported unavailable and open returned
`This host is missing libraries T3's browser needs` (including libglib and
libnss3). The documented Nix Chromium fallback exercised the original UI at
4183. The file card displayed `ticket40.txt`, `TXT 33B`. The original Host returned
its opaque receiptId and content-addressed attachmentId, with `bytes:33`.
Actual Host storage readback matched all 33 bytes. An unreadable scratch path
showed `Upload failed; click to retry`, the Retry action and toast. The draft
survived Enter; zero session/prompt calls occurred. Both screenshots were visually
inspected. The ready screenshot caught a transient existing reconnect indicator;
the failure screenshot showed Connected. Connection recovery belongs to the
parallel network work, and was not changed here.

Evidence: `.scratch/upload-live/validation.json`, `upload-network.json`,
`upload-browser.json`, `upload-ready.png`, and `upload-failed.png`.
The owned client, Host and model-mock ports all refused connections after normal
shutdown. No retained server, GitHub mutation, remote operation, or shared runtime
wiring is part of this commit. Parent owns integration and issue completion.

# Supplied-root migration entry (ticket 47)

Set `MYGO_CLIENT_COMPOSITION=single-root` on the existing authenticated startup
carrier to select the explicit migration entry. With a prepared pinned build:

```bash
source scripts/dsh-test-env.sh
MYGO_CLIENT_COMPOSITION=single-root \
DSH_CLIENT_PORT=4210 DSH_CLIENT_BIND=0.0.0.0 \
DSH_CLIENT_PUBLIC_ORIGIN=http://100.97.207.47:4210 \
node scripts/dsh-test-host.mjs start
node scripts/dsh-test-browser.mjs check-single-root
node scripts/dsh-test-host.mjs stop
```

The launcher stores the original private browser login in ignored scratch. Never
print that file. The fixed-target carrier still forwards the browser's original
cookie; admission, Remote permissions and RPC remain with DSH. Only inference
uses the existing clearly labelled local model mock.

`entries/dsh-startup/single-client.js` creates one Context from the original static
platform seed and supplies it to pinned `bootClient`, then `mountClient`. It never
constructs `AppWebEntry`. `bootClient` installs the original Loader and starts the
original ClientEntries managed roster. A local contribution loads through that
same Loader and static module seed. It consumes the root's `mygoMigration`
service and contributes to the original `shell.bottom` Slot, under the official
React renderer. It observes its own and the original session entry's active
states and checks the original React/Cordis module identities. Original boot
progress, activation audits, error text and window-drag behavior are retained.
Errors remain on the original BootPage; they never select the legacy entry.

The default remains `legacy`. Invalid composition values fail explicitly. The two
entries build to separate ignored output directories to avoid reusing the other
composition's assets. The migration entry intentionally does not load the old
local startup roster, device overlays, management UI or outer shell. Ticket 48
owns their module-resolution/lifecycle migration; later tickets own presentation
unification and default cutover. Existing ClientEntries already reconciles its
managed roster; ticket 47 does not replace it or add another Loader.

Validation at parent `5327f0fc02a1771d21a04bccdf0615e997a556f4`:

- RED: the new browser assertion against the legacy entry reached the original
  UI, then failed because the shared-service Slot contribution was absent.
- GREEN: the supplied-root entry rendered the local service through the official
  UI, with active local/session entries and shared platform modules. The same
  browser run opened the real Host session and submitted through its composer,
  preserving the receipt identity, one mock response and cleared draft.
- Clean pinned artifact build: all eight original gates passed. The original Web
  TypeScript project (`tsc -b .../packages/client/web`) also passed. The adapted
  JavaScript entry uses Vite's existing build/syntax validation; this repository
  has no checkJs project covering these adapters, so this is not a claim of full
  static checking of the new JavaScript orchestration.
- Repository `node --test scripts/test/*.test.mjs`: 27 passed. Syntax checks,
  `git diff --check` and pinned upstream source verification passed.

T3 preview status was unavailable; two open attempts failed with transport error
and HTTP 503. Validation used the repository's Nix Chromium/CDP harness with an
ordinary browser port, original login and the real pinned Host. Own Host/carrier
processes were stopped normally after testing. Private evidence is under
`.scratch/test-dsh/` (`red-single-root.log`, `single-root-browser.json`, and
`submit-browser.json`); generated artifacts and credentials are not committed.

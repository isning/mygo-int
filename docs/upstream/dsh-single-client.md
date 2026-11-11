# Supplied-root migration entry (tickets 47–48)

Set `MYGO_CLIENT_COMPOSITION=single-root` on the existing authenticated startup
carrier to select the explicit migration entry. With a prepared pinned build:

```bash
source scripts/dsh-test-env.sh
MYGO_CLIENT_COMPOSITION=single-root \
DSH_CLIENT_PORT=4211 DSH_CLIENT_BIND=0.0.0.0 \
DSH_CLIENT_PUBLIC_ORIGIN=http://100.97.207.47:4211 \
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
same Loader and static module seed. Its diagnostic plugin owns a scoped
`mygoMigration` service and contributes a hidden node to the original
`shell.overlay` Slot, under the official
React renderer. It observes its own and the original session entry's active
states and checks the original React/Cordis module identities. Original boot
progress, activation audits, error text and window-drag behavior are retained.
Errors remain on the original BootPage; they never select the legacy entry.

The default remains `legacy`. Invalid composition values fail explicitly. The two
entries build to separate ignored output directories to avoid reusing the other
composition's assets. The migration entry uses the curated `local/single-root.json`
startup input, replaceable through `MYGO_STARTUP_CONFIG`. It selects the existing
`marker.js` plugin from the old roster without its outer shell or management
services. Ticket 49 owns management-service migration; later tickets own presentation
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

## Existing local Entry in the original Loader (ticket 48)

The selected local modules are imported from the existing local carrier and added
to the original platform seed under their unchanged startup specifiers. The pinned
ClientModuleSystem already checks this seed before resolving Host graph modules
and bundle externals. Loader EntryTree calls its `import` method, and the official
client-modules plugin publishes that same object as `ctx.modules`. No proxy,
replacement module system, second Loader, plugin format, package alias or upstream
source change is required. Host package IDs, declared dependencies, bundle transport
and React/Cordis seed objects remain unchanged.

Configured local entries are created in that Loader after official service boot,
with their original config, disabled and inject options. The marker's startup inject
requires the original `modules` service. The final original activation audit sees
both rosters; an enabled local entry that remains pending or failed aborts mounting
with the original audit diagnostic. Local import failures identify the specifier.
Startup rejects collisions with Host Entry identities rather than redirecting them.
The Host manifest remains unchanged and its ClientEntries controller retains its
managed roster; owner-boundary regression work remains ticket 50.

The ticket-47 Slot contribution is retained only as a supplied-root service and
module-identity diagnostic. Its ACTIVE check now observes the configured real
marker Entry, and verifies that the original module system returns the exact
namespace retained by that Entry. The unchanged marker owns its existing small
DOM note; it does not redesign the official UI. Original Slot override work remains
ticket 51. This does not migrate management services or device overlays.

Validation on parent `a882cbb`:

- RED: the real pinned Host and ticket-47 client booted; the extended browser check
  failed because the configured existing marker was absent.
- GREEN: `node scripts/dsh-test-browser.mjs check-single-root` passed with the
  marker ACTIVE as `./plugins/marker.js`, official session ACTIVE, shared original
  modules, and the supplied-root service rendered through the original Slot/React.
  The same run opened the real session and submitted through the official composer:
  one original prompt receipt, one model-mock reply, preserved request identity,
  cleared draft and no duplicate prompt.
- Fresh pinned artifact build: all eight original gates passed. Original Web
  `tsc -b` passed. Focused startup configuration tests: 3 passed. JavaScript syntax
  and `git diff --check` passed. The adapters have no full `checkJs` project;
  these checks do not claim full JavaScript static type checking. The parent runs
  the final full repository suite.

T3 preview open returned an explicit missing-system-libraries error, so validation
used the repository's Nix Chromium/CDP harness at the ordinary port 4211, without
allowed-port flags. Private evidence is in `.scratch/test-dsh/red-local-entry.log`,
`green-local-entry.log`, `single-root-browser.json` and `submit-browser.json`.
Only inference used the model mock. Credentials, Host authorization and fixed-target
transport remained original; local startup performs no Host management writes.
The owned Host, carrier and inference mock were stopped normally after the final
browser check. Final green output is in `green-local-entry-final.log`.

## Shared local management services (ticket 49)

The explicit `single-root` roster now also selects the existing
`client-composition`, `instance-manager`, and `ui-client-manager` local plugins.
`mygoStartup` supplies their original configuration, lifecycle state constants,
read-only browser admission probe and concrete local Entry membership.
`mygoPlatform` supplies the original platform seed and existing management UI
adapter. They use the same Context and original Loader as the Host client roster;
Host ClientEntries keeps its existing managed map. Local membership is recorded
only for Entries created from local startup, without attaching the old ownership
helper over the shared tree or claiming remote Entries.

All configured local namespaces, including disabled Entries, are seeded before
boot so original Loader enablement can import them later. Startup entries pass
through the existing overlay middleware, and failed saved activation can invoke
its existing recovery hook. This preserves the current device overlay contract;
deep migration/recovery scenarios remain ticket 58. The floating management
presentation is temporarily retained until ticket 53. No outer workbench, new
navigation, Context, Loader or Host-management backend is introduced. The existing
build adapter already resolves the management UI's original-source imports.

Run the focused browser workflow against the explicit entry on an owned Host:

```bash
node scripts/dsh-test-browser.mjs check-single-management
```

It checks actual local-only manager rows, shared platform identities, a visible
configuration application, original Host settings values/revisions before and
after that edit, absence of Host management mutation requests, the authenticated
instance catalog, overlay restoration through reload, and subsequent original
session opening/composer submission. Inference alone uses MODEL MOCK. To also
exercise operator-disabled startup, provide a workspace-local copy of
`single-root.json` with `local-note.disabled: true` as `MYGO_STARTUP_CONFIG` when
starting the carrier, then set `MYGO_EXPECT_NOTE_DISABLED=1` on the browser check.

Validation on parent `eda7730`:

- RED: the authenticated complete client booted, but the management entry was
  absent. GREEN: the four existing local rows appeared, configuration applied,
  and the original session/composer workflow passed afterward.
- Disabled-startup RED: with disabled namespaces omitted from the seed, enabling
  the actual local Entry was rejected with `no fiber` and rolled back to Off;
  the browser timed out waiting for activation. GREEN: seeding that namespace
  allowed real UI enablement, config application, reload restoration and the
  subsequent original session/composer workflow.
- Fresh pristine pinned artifact build: 8/8 original gates passed. Adapted Web
  builds and original Web `tsc -b` passed. Repository tests: 27 passed. Changed
  JavaScript syntax checks, source-pin verification and `git diff --check` passed.
  There is no adapter-wide `checkJs` project; these checks do not claim full
  static type checking of JavaScript orchestration.

T3 preview reported missing host browser libraries, so the repository Nix
Chromium/CDP fallback ran on ordinary Tailscale port 4212, bound to `0.0.0.0`.
Own preparation, caches, builds and private evidence stayed in this workspace.
Evidence is under ignored `.scratch/`: `ticket49-{red,green,disabled-red,disabled-green,final-green,single-root-regression}.log` and
`test-dsh/single-management-browser.json`. No credential is included here.
The normal default composition remains legacy. Integration with the parallel
owner-scoping and Slot-override tickets remains the parent's responsibility.

For the current plugin/bootstrap split and exact build-time adaptations, see
[dsh-plugin-boundaries.md](dsh-plugin-boundaries.md).

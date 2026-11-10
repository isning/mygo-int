# Local Cordis management

The default startup now selects three ordinary local Loader entries:
`client-composition`, `instance-manager`, and `ui-client-manager`. Workbench and
the editable local note are separate entries. The management UI is replaceable
through the operator startup file, and absent from the alternative Focus
composition. The base mounts no management page and has no instance/catalog UI.
Its two startup events use original Cordis middleware/serial dispatch; the
composition plugin owns overlay selection and recovery.

## Original UI reuse and provenance

Source pin: `fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159` (unmodified).
`scripts/dsh-local-composition-build.mjs` compiles these original components:

- `packages/client/ui-plugin-manager/src/client/PluginManagerPage.tsx`:
  `RowsSection`, including its original filtering, row artwork, runtime states,
  configure action, locked controls and `Switch`. An in-memory query-module
  appends `export { RowsSection }`; its source and CSS stay unchanged on disk.
- `packages/client/ui-settings-general/src/client/SettingsRoot.tsx`:
  the original `SettingsPanel`, including modal focus, Escape/mask/close handling,
  responsive navigation and styles. The adapter appends an export in memory.
- Public `SettingsForm`, `SettingsValueField`, `Button`, and `ConnectionIndicator` primitives.
  The local adapter supplies JSON drafts and a catalog form inside that chrome.
  Original English manager strings supply the runtime rows' copy.

`entries/dsh-startup/local/management-ui.tsx` is the explicit local UI adapter.
It supplies a local row/toggle/configure view contract, with local services as
its only mutation backend. It uses the public original SlotCore for its two
local sections and standard React/ReactDOM. Original Vite React
deduplication and platform modules remain. It does **not** instantiate the stock
Host `PluginManagerController`, stock `apply()`, generated Remote, ConfigForms,
ConfigEditor, or another Loader. Original remote Plugins/Settings remain intact
inside the connected instance outlet.

DSH code is MIT, copyright 2026 DeepSeek; see [the retained license](dsh-LICENSE).
The adapted build also emits the complete original license as
`assets/DSH-LICENSE.txt`. No upstream checkout edits or copied component fork
are required. The only original-source transformations are the two appended
exports; adapter code and startup changes are tracked here.

## Lifecycle and persistence

The local adapter captures the original local Loader and rechecks concrete
ownership before writes. It reports actual fibers, parent Entry ids, required
services, import/activation absence and captured lifecycle errors. Enabled
configuration is not reported as ACTIVE. Protected service entries show locked
switches and cannot disable management or its storage backend from this UI.
Other existing entries can be configured or disabled; no module/path editor,
remote install, removal of unrelated entries or package installer is exposed.

Device preferences use atomic individual localStorage document replacements,
keyed by presentation origin, configured instance id and authentication-view id.
They contain config/disabled overrides only, plus a revision and the exact
operator startup composition. The operator JSON remains unchanged. A changed
operator composition or invalid overlay is ignored with a diagnostic and can be
reset through the UI. Revisions detect stale forms and observed competing tab
writes; this is device storage, not a cross-device database or a multi-writer
transaction protocol. Clearing browser site data clears these preferences.

An edit calls original `loader.update(id, {config, disabled})`, waits for original
lifecycle settlement and ACTIVE when enabled, then commits the device overlay.
On failure it restores the previous runtime options and reports whether rollback
succeeded; it does not persist a rejected edit. At boot the composition plugin
can recover a failing saved override to the operator config, with an explicit
desired-versus-running diagnostic. Reload restarts the local composition and
restores accepted overrides; reset clears only this device's composition overlay.
Catalog preferences have their own version/revision document and survive both.

Every local save, enable/disable, select, reset and reload first calls the
read-only `/mygo-local/admission` probe. It forwards the browser's exact original
DSH authority cookie, Host/Origin and fetch metadata to `/` on the fixed carrier
target. Only original DSH HTTP 200 becomes 204; unauthenticated admission remains
401, invalid authority/origin remains denied, and launch-token query strings are
never exchanged by the probe. There is no anonymous write endpoint or server
filesystem write API. Device storage is not a sandbox against the browser owner
or other trusted same-realm JavaScript; the existing compatibility realm still
requires trusted code.

## Instances and connection limits

Profiles have explicit stable ids, display names, HTTP(S) origins and
authentication-view ids. Add/edit/select are real durable catalog actions.
The configured carrier's id/address/auth view cannot be redirected by a profile
edit. Its status is checked through original DSH browser admission and can be
refreshed with the original connection indicator. No credentials, launch tokens,
cookies or API keys are stored in the catalog or browser globals.

External profiles are clearly unavailable: selecting one persists the desired
catalog selection and displays that it did **not** switch the connected outlet.
Only the operator-bound target is connectable. No address is fetched from the
catalog, and there is no SSRF proxy, concurrent harness connection or independent
multi-instance authentication/isolation claim. Selecting the bound profile
restores the catalog selection to the actual outlet.

## Run and verify

Use this workspace only; port 4191 belongs to another retained environment.
Before every pnpm operation source `scripts/dsh-test-env.sh`; preparation and
Host helpers also set workspace-local homes themselves.

```bash
nix shell nixpkgs#nodejs_24 -c bash scripts/dsh-test-prepare.sh all
DSH_CLIENT_PORT=4200 DSH_CLIENT_BIND=0.0.0.0 \
DSH_CLIENT_PUBLIC_ORIGIN=http://100.97.207.47:4200 \
nix shell nixpkgs#nodejs_24 -c node scripts/dsh-test-host.mjs start
nix shell nixpkgs#nodejs_24 -c node scripts/dsh-test-browser.mjs check-management
nix shell nixpkgs#nodejs_24 -c node scripts/dsh-test-host-network.mjs
nix shell nixpkgs#nodejs_24 -c node scripts/dsh-test-host.mjs check-submit
node --test scripts/test/dsh-{local-startup-config,authenticated-carrier}.test.mjs
bash scripts/dsh-upstream.sh verify
git diff --check
```

The public clean URL is `http://100.97.207.47:4200/`; an unauthenticated browser
gets 401. The original private launch entry is in ignored
`.scratch/test-dsh/client-launch-url` (0600); never print it. To open it privately:

```bash
nix shell nixpkgs#nodejs_24 -c node scripts/dsh-test-host.mjs open
```

After a management check, `open-management` uses its retained browser profile
(including saved composition/catalog). Use it instead of a fresh browser to see
that device's accepted edits:

```bash
nix shell nixpkgs#nodejs_24 -c node scripts/dsh-test-browser.mjs open-management
```

Normal lifecycle: `node scripts/dsh-test-host.mjs stop`, then repeat `start`
with the listener variables above. `check-management-restore` verifies the same
saved browser profile after a carrier restart. Profiles/evidence live only under
ignored `.scratch/test-dsh/`; private profile selector is `management-profile`.
Use `Local client settings` for LOCAL entries and Instances; the original
connected Host's `Plugins` navigation is a separate authority.

## Verified in this workspace (2026-11-11)

The pristine source acquisition/frozen install and original artifacts completed
all 8/8 gates (101.17 seconds). The adapted Vite build passed, including the
original UI source exports and retained license. The six focused startup,
authenticated-carrier and authority tests passed; source-pin verification,
changed JavaScript syntax checks and `git diff --check` passed.

Actual Nix Chromium at the ordinary Tailscale port 4200 exercised the original
Settings panel and manager controls against five real local entries. It
disabled/re-enabled the benign note plugin, rejected an invalid label through
the actual plugin lifecycle with successful rollback, saved a visible config
edit, and restored both config and disabled desired startup through reload.
It added/edited/selected an external instance profile, displayed its unavailable
status without redirecting the connected outlet, restored that selection after
reload, and selected the real bound carrier again. Concrete remote entries were
unchanged before reload; original package/fiber states were restored afterwards.
There were no Host plugin-manager/settings mutation requests from these actions.

Normal Chromium exit and a full owned-carrier SIGTERM/restart restored accepted
config and catalog in the same browser profile. The browser helper now closes
Chromium with its normal CDP Browser.close path so device storage flushes before
exit, and waits for a live debugger endpoint when reusing its profile. A separate
`check-management-recovery` run injected a broken saved config, verified operator
config recovery and a visible diagnostic, then repaired/saved it through the UI.
This check leaves the retained device profile with a valid accepted composition.

Original DSH New Session/composer creation and MODEL MOCK reply passed after the
carrier restart: one durable user message, one assistant message, three streamed
text chunks, 26-token usage and completed stop framing. No API key or real
inference was used. Live HTTP/WebSocket authority tests passed, including actual
local admission 401/204, rejected forged/other-authority cookies and Origin, and
no token exchange at the local probe. The retained server binds 0.0.0.0:4200;
port 4191 was not touched. T3 preview status/open was attempted first; open
explicitly reported missing host browser libraries, so the documented Nix
Chromium/CDP workflow supplied browser evidence.

Private evidence: `management-validation.json`, `management-restart-validation.json`,
`management-recovery-validation.json`, `management{,-config,-instances}.png`,
`network-validation.json` and `final-submit-result.json` under
`.scratch/test-dsh/`. Screenshots were visually inspected. No push, PR, issue,
remote deployment or external-instance connection was performed.

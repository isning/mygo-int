# Client plugin boundaries and upstream differences

The source baseline is `fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159`.
Run `bash scripts/dsh-upstream.sh verify` to verify tracked upstream sources.
An unchanged checkout does not mean the built application has no adaptations.

## Existing plugin responsibilities

- `client-composition`: local Loader actions, device overlays, rollback and recovery.
- `instance-manager`: device connection-profile catalog and admission status.
- `unified-plugin-manager`: original Plugins UI integration and source-qualified actions.
- `ui-client-manager`: original Settings contributions and configuration forms.
- `local-navigation`: original sidebar instance menu and original macOS window-drag
  recollection. Its Cordis effect owns the watcher; disabling/disposal stops it.
- `touch-feedback`: optional tap-highlight policy; its effect owns the stylesheet.
- `shared-runtime-diagnostics`: hidden acceptance contribution checking shared
  services, original singletons and actual Loader entries. It remains explicitly
  installed by the DSH bootstrap for compatibility with existing acceptance tools;
  it is instrumentation, not a user-facing product feature or an independently
  selectable startup entry. Its owner is now the `dsh-instance` plugin.

These plugins share the original client Context/Loader. Local management does not
implicitly issue Host management RPCs. Trusted plugin code is not sandboxed.

## Bootstrap and platform responsibilities

`single-client.js` supplies browser I/O to `client-base.js`. The base creates one
Context/Loader and loads only local configured entries. It can run without DSH.
`web-platform.js` supplies original shared library singletons and available bundled
local plugin namespaces; availability does not activate an official feature.

The local `dsh-instance` bootstrap plugin owns authenticated DSH bootstrap, the
original module system and remote manifest, original managed-entry activation,
activation audit, BootPage and renderer mount. It reuses the existing root/Loader.
`client-overrides` owns local UI namespaces and the explicit remote plugin-manager
client-half override. Official product entries are never enumerated locally:
they come from the remote manifest. Original base/theme styles belong to the
DSH compatibility plugin. See [ADR 0005](../adr/0005-instance-owned-client-loading.md).

The pre-boot ownership boundary in `local-entry-boundary.js` wraps original
`ClientEntries.sync` and its observable diagnostics. It prevents Host graphs from
claiming local modules before reconciliation starts, and restores wrapped methods
on disposal. It cannot simply become a normal post-boot plugin: the initial Host
reconciliation must already be protected. This is an explicit runtime adaptation,
not a Cordis security boundary or a change to the upstream Slot/Loader algorithm.

Authentication, HTTP/WebSocket carriage and server-side cookie handling remain
platform/server mechanisms. Model mocks and browser instrumentation are test
infrastructure; moving them into browser plugins would change their trust boundary.

## Actual upstream adaptations

No tracked Cordis, Loader, Slot, Gateway, Remote or Host source is edited. The build
uses original Vite configuration and singleton packages. The client still has
these deliberate, pinned build adaptations:

1. Replace the Web app main entry with mygo startup (explicit legacy mode remains).
2. Export original Plugins page cards/details and original SettingsPanel for reuse.
3. Extend the original Plugins page's contributed-tab navigation and forward its
   original configuration renderer to local tabs.
4. Extend original `pluginNavigation` with `openTab` so local navigation opens the
   original page/store, instead of creating another page or mutating DOM history.
5. Seed that adapted plugin-manager client half under its original package aliases.

The transformations live in `scripts/dsh-plugin-page-adapter.mjs` and
`scripts/dsh-local-composition-build.mjs`; they affect build output only. They are
compatibility debt, not unchanged official code. Removing them requires equivalent
public extension/export contracts upstream; replacing whole pages would increase
rather than reduce divergence. Keep their scope narrow and verify anchors against
the pin when upgrading.

The Host-only `packages/dsh-host-status` adapter adds authenticated status and
ordered index injections using public DSH services; it does not patch Host core.

## Verification of this cleanup

The adapted production build, 27 repository tests and real Chromium touch-plugin
lifecycle check passed. The browser check also asserts that the extracted hidden
diagnostic contribution reports the original shared platform singletons. Syntax,
whitespace and pinned-source integrity checks passed. No full adapter TypeScript
semantic checker is claimed. The older combined submit/default acceptance runner
timed out before submission against the current Chinese/persisted fixture UI;
this cleanup does not claim a new successful end-to-end model reply validation.

## Instance-plugin refactor verification

Real Cordis/Loader tests cover an empty composition with no DSH dependency and a
bootstrap/feature composition with exactly one Loader and normal disposal. Default
Web build and real browser shared-runtime/touch-plugin checks are required for the
instance-plugin path. These checks do not constitute real-model inference.

The current instance-plugin path passed the production Web build, 30 repository
tests, and `node scripts/dsh-unified-plugins-browser.mjs --touch-only`. The focused
`node scripts/dsh-test-browser.mjs check-instance` also passed: original shared
runtime diagnostic, original New Session, one composer prompt/accepted receipt,
one MODEL MOCK reply and cleared draft. It accepts the original English/Chinese
New Session accessible label without changing Host locale. It deliberately does
not run the older combined Settings/catalog workflow. No full adapter semantic
TypeScript/checkJs coverage or real-LLM inference is claimed.

## Offline shell and override application

See [ADR 0006](../adr/0006-local-shell-and-override-application.md), which supersedes
the earlier central `client-overrides` role. The default bootstrap now contains the
instance plugin, an explicit plugin-manager override descriptor and `local-shell`.
Only normal descriptors create local Loader entries. Override descriptors register
an implementation for a matching instance-managed package, without activating an
extra copy or adding an absent remote feature.

`local-shell` starts local composition and instance catalog entries before network
bootstrap. The base recognizes and reuses those owned entries later. Recoverable
instance failures retain the local Context and UI. The local React mount unmounts
before the remote renderer takes over. Existing local profile management uses the
same original Instances forms and SettingsPanel while offline.

The clean document now returns HTTP 200 without Host admission. Original DSH
status/API/bootstrap/WebSocket endpoints remain protected; token exchange is still
original. Local preferences/catalog updates use device storage and local revision
checks without a remote admission prerequisite. This intentionally replaces the
earlier anonymous-root-401 and remote-admission-for-local-writes behavior.

Validation: production Web build; repository tests; real Chromium
`node scripts/dsh-unified-plugins-browser.mjs --offline-only` covers unavailable
bootstrap, unauthenticated Remote status 401, local profile save/reload with zero
Host management writes, followed by original authenticated UI and touch-plugin
lifecycle. `node scripts/dsh-test-browser.mjs check-instance` covers real New
Session and MODEL MOCK reply/receipt. A carrier test closes the upstream listener
and checks that the local shell still returns 200 while Remote forwarding returns
502 and wrong Origin returns 403. No physical-device or adapter-wide semantic
TypeScript check is claimed.

The offline Settings panel also reuses the existing Client settings section;
remote Plugin manager navigation remains disabled until its provider is available.
The final repository test run passed 34/34.

Local dictionaries, offline language selection and instance-locale adoption are
owned by `client-i18n`; see [internationalization](dsh-client-i18n.md).

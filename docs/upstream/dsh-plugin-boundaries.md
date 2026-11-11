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
  selectable startup entry.

These plugins share the original client Context/Loader. Local management does not
implicitly issue Host management RPCs. Trusted plugin code is not sandboxed.

## Bootstrap and platform responsibilities

`single-client.js` creates the root, seeds module namespaces, obtains the local
configuration and authenticated DSH bootstrap, starts the original module system,
boots original Host entries, creates configured local entries and mounts the
original renderer. Original base/theme styles remain platform imports.

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

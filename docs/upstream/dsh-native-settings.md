# Local sections in original Settings (ticket 53)

The explicit single-root composition registers `mygo-local-plugins` and
`mygo-instances` in the original `settings.section` Slot. Open Account menu →
Settings → LOCAL plugins or Instances. The original Settings owner retains its
panel, navigation, modal state and React renderer context. The local components
use `clientComposition` and `instanceManager`; Host sections keep their original
services. Configuration protection and local save/admission behavior are unchanged.

`ui-client-manager` selects this registration when the supplied-root
`mygoStartup` service exists. It waits for the original `slots` service through
Cordis injection; Slot declaration and registration lifetimes follow the plugin
scope. This path calls neither the legacy mount nor `createRoot`, and creates no
floating launcher. The legacy composition retains its existing presentation until
ticket 60. No startup/default/build wiring changes are required.

## Reproduce

Prepare this workspace's pristine pinned artifacts with
`scripts/dsh-test-prepare.sh all` under Nix Node, as documented in the local test
environment guide. Source the workspace-local pnpm environment before every pnpm
invocation, including any dlx. Then:

```bash
source scripts/dsh-test-env.sh
MYGO_CLIENT_COMPOSITION=single-root \
DSH_CLIENT_PORT=4216 DSH_CLIENT_BIND=0.0.0.0 \
DSH_CLIENT_PUBLIC_ORIGIN=http://100.97.207.47:4216 \
nix shell nixpkgs#nodejs_24 -c node scripts/dsh-test-host.mjs start
nix shell nixpkgs#nodejs_24 -c node scripts/dsh-native-settings-browser.mjs
node scripts/dsh-test-host.mjs stop
```

The standalone browser harness enters original Settings via the Account menu,
saves a visible local note edit, compares original Host settings values/revisions,
observes management requests, opens the catalog, then opens the existing real
Host session and submits through the original composer. Only inference uses the
existing labelled model mock. Login uses the browser's original DSH cookie;
there is no launcher credential fallback or business allowlist. Credentials,
launch URLs, profiles, screenshots and evidence stay in ignored `.scratch/`.

## Validation and parent handoff

- RED: original Settings opened but lacked LOCAL plugins; the direct section
  assertion failed before implementation.
- GREEN: local configuration applied visibly, Host settings remained unchanged,
  no Host management mutation occurred, catalog admission succeeded, and the
  retained original session accepted one prompt with its original receipt and
  completed model-mock reply.
- Pristine pin `fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159`: all eight artifact
  gates passed; original Web `tsc -b` passed. Both adapted composition builds,
  four focused startup/carrier tests, changed JavaScript syntax checks and
  `git diff --check` passed. No full JavaScript `checkJs` validation is claimed.
- T3 preview open explicitly reported missing browser system libraries; the
  documented Nix Chromium/CDP fallback used ordinary port 4216 without an
  allowed-ports override. Owned servers were stopped normally after verification.

Private evidence: `.scratch/ticket53-{red,green}.log`,
`.scratch/test-dsh/native-settings-{result,failure}.json` (failure retains RED),
`.scratch/test-dsh/native-settings.png`, and the build/typecheck/focused logs.

The shared historical `check-single-management` still expects the removed
floating launcher. Parent integration should replace its launcher entry/reopen
steps with Account menu → Settings → LOCAL plugins (and select Instances within
that original panel), or run this standalone harness for ticket 53. Its old
launcher assertion is intentionally incompatible with the new behavior. This
ticket does not change the shared harness, navigation ticket 52 or unified plugin
page ticket 54. The native section ids are distinct from the original `plugins`
section and its tab registrations.

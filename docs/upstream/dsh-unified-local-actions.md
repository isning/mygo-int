# Unified LOCAL actions (ticket 55)

`LocalPluginActions` operates on the same original Context's `clientComposition`
service. It re-resolves the real local row by Entry id, row id and module name.
The existing adapter owns browser admission, revision checks, actual Loader
updates, runtime validation, device persistence and rollback. No Host Remote or
Host configuration form is used. The original `SettingsForm` wraps a minimal
JSON object editor, matching the existing local Settings form.

Protected entries remain inspectable, with an explicit operator-composition
message and no mutation controls. The policy includes composition, instance,
management presentation and unified-manager services. Unsupported installation,
removal and upgrade actions are not presented as supported. Runtime diagnostics,
desired enablement and actual fiber phase remain distinct.

React effect cleanup unsubscribes the service listener and suppresses callbacks
from work completing after unmount. An already admitted Loader mutation remains
owned by the service and settles normally; closing a page does not cancel a
partially applied lifecycle transaction.

## Exact parent wiring

In `entries/dsh-startup/local/unified-plugin-ui.tsx`:

```tsx
import { LocalPluginActions, type LocalCompositionService } from './unified-local-actions.tsx'
```

Inside the existing source-qualified `<article>`, keep the qualified key on the
article, and pass the original Entry identity to the original row renderer:

```tsx
<RowsSection rows={[row]} t={translate} resolveText={resolveText} />
{source === 'LOCAL' && <LocalPluginActions
  ctx={ctx}
  row={row}
  onChanged={() => setRefresh(value => value + 1)}
/>}
```

Replace the shared `Services.clientComposition` declaration with
`clientComposition: LocalCompositionService`. Its exported structural type includes
`rows`, `status`, `change`, and `subscribe`, including config/desired/protection fields. The action component needs no extra Context,
Loader, renderer root, static module or startup entry. Update the page's
inspection-only description when integrating actions. In the shared build's
bare-import adapter, include `unified-local-actions.tsx` alongside the existing
management/unified UI filenames. Default legacy startup remains unchanged.

## Standalone real-browser rehearsal

The helper edits only generated ignored build/controller files and rehearses
exactly the conditional LOCAL render seam. It never edits shared source files.
Use the workspace-local pnpm environment before any pnpm invocation:

```bash
source scripts/dsh-test-env.sh
nix shell nixpkgs#nodejs_24 -c bash scripts/dsh-test-prepare.sh all
node scripts/dsh-unified-local-prepare.mjs
MYGO_CLIENT_COMPOSITION=single-root \
DSH_CLIENT_PORT=4218 DSH_CLIENT_BIND=0.0.0.0 \
DSH_CLIENT_PUBLIC_ORIGIN=http://100.97.207.47:4218 \
nix shell nixpkgs#nodejs_24 -c node .scratch/unified-local/host.mjs start
nix shell nixpkgs#nodejs_24 -c node scripts/dsh-unified-local-browser.mjs
nix shell nixpkgs#nodejs_24 -c node .scratch/unified-local/host.mjs stop
```

The harness uses the unchanged pinned Host and original browser cookie. Only
inference uses MODEL MOCK. It toggles the actual note Entry off/on, saves visible
JSON configuration, rejects an invalid label and observes restored runtime,
checks protected services, compares original Host settings/revisions and plugin
inventory before/after, and records management requests. The expected LOCAL
count comes from the actual curated startup file. Cookies, token URLs, browser
profiles, screenshots and detailed evidence stay in ignored `.scratch/`.

## Validation on parent b3057af

- RED: the authenticated complete client opened the original Plugins page;
  `LOCAL row exposes source-qualified actual Loader actions` failed before the
  component existed (`.scratch/ticket55-red.log`).
- GREEN: the actual browser passed enable/disable, visible JSON save, invalid-label
  rejection with restored actual runtime, all four protected services, unchanged
  Host settings/revisions and plugin inventory, and zero management writes.
  Six LOCAL entries matched the current curated startup, without a fixed count.
- The first green attempt successfully disabled the Entry but its browser polling
  expression returned a DOM node. Converting that predicate to a boolean fixed
  the harness; no product change was needed. The second run passed.
- Pristine source/artifact preparation: all 8 original gates passed. Original Web
  `tsc -b` passed. Regular single-root and legacy adapted builds passed; the
  isolated action-seam Vite build passed. Repository tests: 27 passed (including
  three focused local-startup tests). Syntax and whitespace checks passed.
- Original Web checking does not include these adapter TSX/JavaScript sources.
  Vite compiles the TSX, and Node checks changed JavaScript syntax; no full
  adapter `checkJs` or separate TSX semantic typecheck is claimed.

T3 `preview_open` explicitly failed with missing host browser libraries, including
`libglib-2.0.so.0` and `libnss3.so`; the documented Nix Chromium/CDP fallback
used ordinary Tailscale port 4218, bound to `0.0.0.0`. Original pin
`fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159` and upstream sources stayed unchanged.
Private evidence: `.scratch/ticket55-{red,green-2,final-green}.log`,
`.scratch/test-dsh/unified-local-result.json`, and `unified-local.png`.
The screenshot was visually inspected. Owned browser/Host/carrier processes
were stopped normally after checks. Parent integration remains explicit above;
shared tracked UI/startup/build/browser files were not edited.

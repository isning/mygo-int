# Instance-client actions (ticket 57)

`InstanceClientActions` belongs inside the original Plugins page's existing
INSTANCE CLIENT article. It consumes the original shared Context, concrete
InspectRow identity and local startup ownership service. It creates no root,
Loader, Remote, graph controller or Host-management adapter.

## Parent wiring

Import in `entries/dsh-startup/local/unified-plugin-ui.tsx`:

```tsx
import { InstanceClientActions } from './unified-instance-actions.tsx'
```

Inside the existing ownership-qualified article, after its `RowsSection`:

```tsx
<RowsSection rows={[row]} t={translate} resolveText={resolveText} />
{source === 'INSTANCE CLIENT' && <InstanceClientActions
  ctx={ctx}
  row={row}
  onChanged={() => {
    update(value => value + 1)
    setRefresh(value => value + 1)
  }}
/>}
```

Keep the qualified `key` on the parent article only. Pass the real original
`row.entryId`, `row.rowId` and `row.moduleName`; do not substitute the serialized
qualified key for `entryId`. Extend the existing build adapter's bare-import
resolution list with `unified-instance-actions.tsx`. No additional static module
seed or startup plugin is needed: this is a component imported by the existing
unified page. Retain legacy as the default until ticket 60.

The parent must also add `./plugins/unified-plugin-manager.js` to the local
composition service's protected management-module set before enabling local
lifecycle controls. That shared service is outside this ticket's file contract.

## Actual lifecycle boundary

The pinned original `ClientEntries.retry()` has no entry argument. The control
therefore retries the current instance's managed client roster, potentially
retouching other managed entries. It does not offer a per-entry retry, change
Host bundle enablement or independently install/upgrade a Host-delivered client
package. Those unsupported controls stay disabled with visible explanations.

Original import errors are available before any reconciliation; original
`entries.state` failures describe settled retries. A completed retry can retain
an inactive entry and errors. No fulfilled Promise is interpreted as ACTIVE.
Unmount unsubscribes observers and discards pending UI updates. The original
queued retry has no cancellation API and may finish after navigating away.

## Standalone rehearsal

Source the workspace-local environment before all pnpm operations, including dlx.
Prepare this workspace's own pristine pinned artifacts as usual, then:

```bash
source scripts/dsh-test-env.sh
nix shell nixpkgs#nodejs_24 -c bash scripts/dsh-test-prepare.sh all
node scripts/dsh-instance-actions-prepare.mjs
MYGO_CLIENT_COMPOSITION=single-root \
MYGO_STARTUP_CONFIG=.scratch/instance-actions/startup.json \
DSH_CLIENT_PORT=4220 DSH_CLIENT_BIND=0.0.0.0 \
DSH_CLIENT_PUBLIC_ORIGIN=http://100.97.207.47:4220 \
nix shell nixpkgs#nodejs_24 -c node .scratch/instance-actions/host.mjs start
nix shell nixpkgs#nodejs_24 -c node scripts/dsh-instance-actions-browser.mjs
node .scratch/instance-actions/host.mjs stop
```

The preparation helper generates only ignored build/startup/controller copies.
`--red` omits the component integration for the same browser acceptance test.
The build extension exposes the actual Context only in the private acceptance
build so the harness can observe original public lifecycle and Host read APIs.
No mocked controller or second client root is used. Cookies, token launch URLs,
profiles and detailed evidence remain in ignored scratch; never print them.

The browser uses original DSH login and the actual pinned Host. Only model
inference uses MODEL MOCK. In this fresh build the optional account-settings asset exists. Chromium blocks
only its one-resource download after boot; the harness uses original exported
`tearDownEntryFiber`, `modules.invalidate` and Loader `refresh` to reproduce an
inactive Entry with a genuine recorded download error. It retries that failure and checks the new original reconciliation failure plus unchanged local
rows, Host inventory and Host settings values/revisions. It observes Host
management requests independently. T3 preview must first be attempted; use the
repository Nix Chromium fallback only when preview is explicitly unavailable.

## Validation and limits

On parent `b3057af`:

- RED: the complete authenticated browser listed the real optional account Entry;
  the assertion for actions inside that qualified article failed with the component
  integration omitted. Evidence: `.scratch/instance-actions/red.log` and
  `red-failure.json`.
- GREEN: the actual button invoked original `ClientEntries.retry()`. Its original
  observable gained the account-settings failure; the UI reported one remaining
  failure and **not ACTIVE**, retaining the original import/reconciliation error.
  Unsupported controls were disabled. Actual local rows, original Host inventory,
  and Host settings values/revisions were identical before/after. No Host
  management mutation was observed.
- Frozen workspace install and all eight pristine artifact gates passed. The
  original Web `tsc -b` passed. The generated adapted single-root Vite build,
  standalone JavaScript syntax checks, upstream pin/integrity verification and
  `git diff --check` passed.
- There is no adapter-wide `checkJs` or separate TSX typecheck project. Vite
  compiles this new TSX; the passing original Web checker does not include this
  adapter. The shared regression suite and final multi-ticket integration remain
  parent work.
- T3 `preview_open` explicitly failed because host browser libraries were missing.
  Nix Chromium/CDP used ordinary port 4220 at `0.0.0.0`, advertised through
  `100.97.207.47`, with no allowed-port exception. Owned browser/Host/carrier/model
  processes were stopped normally after checks.

Final private evidence: `.scratch/instance-actions/final-green.log`,
`web-typecheck.log`, `.scratch/test-dsh/instance-actions-result.json`, and
`instance-actions.png` (visually inspected). No shared tracked startup, build,
browser harness, management UI, client composition service or unified page was
edited. The pristine upstream revision remains
`fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159`.

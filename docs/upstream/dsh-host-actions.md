# Explicit Host actions on the original Plugins page (ticket 56)

`entries/dsh-startup/local/unified-host-actions.tsx` exports
`HostPluginActions({ctx, row, onChanged})`. The Context is the original injected
plugin scope, with the existing local services still available. The row is the
actual inventory row, including its original `entryId`, `rowId` and `moduleName`.
The parent owns the source/instance/authentication-view boundary.

The component uses original `remote.pluginManager.listPlugins()` to resolve the
exact concrete Host Entry plus module, then calls original
`setPluginEnabled(target.entryId, enabled)`. It never guesses patch ids or uses
bundle enablement as a fallback. Unsupported entries show the original
`management-required` / `unaddressable` reason; missing or ambiguous Entries are
read-only. There are no local Loader writes. Ordinary Host switches use an
explicit “Enable/Disable on Host” label, consistent with the original UI's lack
of a confirmation modal for ordinary row enablement.

A shared per-Context lookup subscribes to the original `plugin-manager/changed`
and `connection/reset` events only while components are mounted. React effect
cleanup removes subscriptions and invalidates pending reads; the action drops
late replies after unmount or identity change. An already submitted Host write
is not advertised as cancelled. Original Remote codes/messages, application
outcomes, restart reasons and pre-existing inactive-entry warnings remain
visible. A missing/failed initial asset or account/settings entry is not hidden.

Parent wiring (not performed in shared files by this ticket):

1. Add `'remote.pluginManager'` to `inject` in the existing local
   `unified-plugin-manager.js` entry. Inventory injection alone does not authorize
   property access to this service in Cordis. Retain all its existing injections.
2. Import `{ HostPluginActions }` from `./unified-host-actions.tsx` in
   `unified-plugin-ui.tsx`.
3. Within the existing source-qualified article, after the original RowsSection:

   ```tsx
   <RowsSection rows={[row]} t={translate} resolveText={resolveText} />
   {source === 'HOST' && (
     <HostPluginActions ctx={ctx} row={row}
       onChanged={() => setRefresh(value => value + 1)} />
   )}
   ```

   Keep the article's qualified `key` and `data-plugin-key`. Do not replace
   `row.entryId` with that JSON key. Route LOCAL and INSTANCE CLIENT controls to
   their own components. Pass the connected original Context, never one inferred
   from a saved catalog preference or a module name.
4. Add `'unified-host-actions.tsx'` to the build adapter's existing list of local
   TSX importers resolved through original Web dependencies. Preserve original
   React deduplication and the `?mygo-rows` export. No additional root, Loader,
   startup module or default-composition change is needed.

The ignored build extension rehearses precisely this seam. It does not edit
shared UI, startup, build, browser helpers or pristine upstream sources. It
creates a harmless package `@mygo/dsh-host-action-fixture` under the workspace's
private install anchor and inserts a concrete row into the owned Host profile.
The fixture declares original `connection` injection and registers one original
exact Fetch route, `/api/mygo-host-action-fixture`, disposed with its plugin.
All pnpm invocations use the workspace-local environment, including dlx.

```bash
source scripts/dsh-test-env.sh
nix shell nixpkgs#nodejs_24 -c bash scripts/dsh-test-prepare.sh all
node scripts/dsh-host-actions-prepare.mjs green
MYGO_CLIENT_COMPOSITION=single-root \
DSH_CLIENT_PORT=4219 DSH_CLIENT_BIND=0.0.0.0 \
DSH_CLIENT_PUBLIC_ORIGIN=http://100.97.207.47:4219 \
nix shell nixpkgs#nodejs_24 -c node .scratch/host-actions/host.mjs start
nix shell nixpkgs#nodejs_24 -c node scripts/dsh-host-actions-browser.mjs
nix shell nixpkgs#nodejs_24 -c node .scratch/host-actions/host.mjs stop
```

Use preparation stage `red` for the pre-action page; stop the owned Host before
switching stages. Repeated preparation preserves the owned profile and other
settings. The browser restores the fixture through the original Remote after a
failed assertion following disable; cleanup outcomes, if needed, remain private.
Host/carrier/model shutdown uses the normal controller stop command.

Validation:

- RED: authenticated complete client reached the actual Host row; assertion
  “Host fixture row exposes its original-controller action” failed.
- GREEN: browser clicked Disable on Host; the actual fixture endpoint became
  404, its original inventory showed off, and visible text said
  `Host disable: applied`. Enable restored endpoint HTTP 200 and active state.
- Original local Entry ids, runtime states, configurations and device storage
  compared equal before/after both operations and refusal. Only three explicit
  `pluginManager/setPluginEnabled` writes were observed: disable, restore and
  the deliberate original `unknown-plugin` refusal. No Host bundle writes.
- Clearing the browser's original cookie produced visible original HTTP 401
  on the same control. The fixture stayed active. This is real browser admission
  refusal, not a fabricated response or non-owner browser-login claim.
- A real restricted in-process Peer invoked the same original Host method through
  the original Gateway. Its HTTP 200 envelope retained `remote-access/denied`;
  the existing exact-route fence retained HTTP 403. Native browser login remains
  owner-only. No server-cookie fallback, method allowlist or replacement Remote.
- Pristine pin `fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159`: frozen install and all
  eight artifact gates passed. Original Web `tsc -b` passed. The adapted build
  compiled the new TSX with Vite. There is no adapter-wide checkJs or separate
  TSX typecheck configuration; original Web typechecking does not establish
  full static checking of this new adapter. Six focused authenticated-carrier,
  carrier-trust and local-startup tests, both new script syntax checks and
  `git diff --check` passed.

T3 preview first returned unavailable; preview open explicitly reported missing
system libraries. The fallback used actual Nix Chromium/CDP on ordinary ports,
the real pinned Host and original browser login. Only inference was MODEL MOCK.
Browser screenshots of disabled success and admission refusal were inspected.
Private evidence: `.scratch/host-actions/{red,final-green}.log`,
`.scratch/host-actions/web-typecheck.log`,
`.scratch/test-dsh/host-action-{result,permission}.json`, and
`.scratch/test-dsh/host-actions{,-disabled}.png`. Tokens, cookies and launch URLs
remain in ignored scratch. The owned services were stopped normally after checks.
The default stays legacy until ticket 60. Parent integration/full shared review
remain parent work.

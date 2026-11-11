# Host roster removal and restoration (ticket 50)

The acceptance seam is the complete supplied-root browser client and a real Host
at the pristine pinned DSH revision
`fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159`. Only inference uses the existing
explicit local model mock. This check does not use the legacy
`entry-ownership.js` attribution registry: that registry's attach operation claims
all entries in a Loader and is unsuitable as evidence for a shared Loader.

Run from this worktree after its own pinned artifact build:

```bash
source scripts/dsh-test-env.sh
MYGO_CLIENT_COMPOSITION=single-root \
DSH_CLIENT_PORT=4213 DSH_CLIENT_BIND=0.0.0.0 \
DSH_CLIENT_PUBLIC_ORIGIN=http://100.97.207.47:4213 \
node scripts/dsh-test-host.mjs start > .scratch/host-ticket50.log 2>&1
node scripts/dsh-roster-browser.mjs
node scripts/dsh-test-host.mjs stop
```

Use Nix Node for build and browser commands and the launcher's pnpm-provided
Node 24.21 for the Host. Source the environment helper before every pnpm invocation.
Logs, original login URLs, cookies and browser profiles stay in ignored scratch.
T3 preview must be tried first; Nix Chromium/CDP is the documented fallback for
an explicitly unavailable preview. Ordinary port 4213 requires no browser port
exceptions. The carrier binds 0.0.0.0 and uses the stated Tailscale public origin.

The independent browser harness observes the original facade `create` and
ClientEntries `start` public seams, forwarding their actual arguments/results.
It retains the real Loader and module system. It neither creates a second client
root nor substitutes a Loader, manifest reconciler, SessionManager or RPC service.
The graph is the actual authenticated Host graph; a derived snapshot removes the
unchanged Terminal contribution from its entries and batches, then the original
snapshot restores it through `ClientEntries.sync`. This is a client graph-lifecycle
exercise, not a Host plugin-management mutation or an automatic Host write.

The browser opens a real session, uses the original Terminal contribution, observes
its visible guide and panel disposal, and compares concrete Entry, namespace and
fiber identities for the local marker and all unrelated Host entries. The removed
fiber must finish in DISPOSED state. The restored contribution must be ACTIVE;
the configured local marker must keep its original Entry, namespace, fiber and DOM
node throughout. Optional pre-existing inactive entries remain explicit in evidence.

The pinned ClientEntries already owns a `Map<string, Entry>` populated only by
its own `create` path. Its removal loop visits that Map, rather than enumerating
all Loader entries. Module pruning uses all remaining Loader entry roots. This
mechanism is retained unchanged. This scope covers one selected instance and
shared realm, not hostile JavaScript isolation or concurrent instance support.

## Discovered gap and parent wiring

The first removal/restoration behavior passed with the original managed Map;
no disposal or reconciliation fix is needed. The first harness run incorrectly
expected the restored Terminal guide even when its panel had reopened directly.
Correcting that observation yielded green; this was not a production RED.

A separate, valid graph adding `./plugins/marker.js` exposed an actual gap:
ClientEntries accepted that Host row, because the seed resolver can supply the
local module. The RED assertion was “Host graph cannot acquire a configured local
module identity” (no rejection). Original managed Entry ownership alone does not
reserve local module identities. `local-entry-boundary.js` adds only preflight
collision rejection to the original public `entries.sync`. The original release
change gate still handles different releases. Original disposal, retries, module
pruning and managed roster remain untouched. `/client` aliases are normalized to
match the original module resolver's package identity.

Ticket 49 owns `single-client.js` and build wiring. This commit deliberately does
not edit either. The parent must import and install the independent adapter just
after `facade.create(...)`, **before `bootClient` starts**:

```js
import { protectLocalEntryModules } from './local-entry-boundary.js'
// After modules exists; include every configured local module, even disabled ones.
const releaseBoundary = protectLocalEntryModules(modules, [
  ...configuration.entries.map(entry => entry.name),
  diagnosticName,
])
ctx.effect(() => releaseBoundary, 'mygo: local module ownership boundary')
```

Use the corresponding configured local-module names if ticket 49 renames its
configuration variable. Do not pass the entire platform seed (React/Cordis and
original client bootstrap services legitimately appear there). Do not install
`bindRemoteEntryOwnership` or replace the original managed roster. The adapter
returns a disposal callback that restores the original `sync` method.

The independent browser harness installs this same adapter over the captured real
module system and actual local Entry's module name. It proves the adapter behavior
on the real complete client/Host; **production startup wiring remains the parent's
integration work**. After wiring, rerun this harness and the parent's full browser
workflow. The default composition stays legacy until the later cutover ticket.

Evidence remains private under `.scratch/`: `roster-green-ticket50.log` records
original removal/restoration first green; `roster-conflict-red-ticket50.log`
records the real collision RED; `roster-conflict-green-ticket50.log` records GREEN.
`test-dsh/roster-validation.json` records concrete before/after identities and
original reconciliation diagnostics. A duplicate Host graph is also rejected by
the original parser without changing unrelated entries.

Validation in this isolated worktree on `eda7730`:

- Fresh original pinned artifact build: 8 gates passed, 0 failed.
- Original Web `tsc -b .../packages/client/web`: passed.
- The owned carrier rebuilt the supplied-root adapted Vite client successfully.
- Final real-browser run: removal, DISPOSED fiber, restoration, same ACTIVE local
  marker Entry/module/fiber/DOM, unrelated Host identities, cross-owner rejection
  and original duplicate-graph rejection all passed.
- Repository `node --test scripts/test/*.test.mjs`: 27 passed.
- All three added JavaScript files passed `node --check`; `git diff --check` and
  pristine pinned-source verification passed. There is no full `checkJs` project
  for these adapters; original Web TypeScript checking does not typecheck them.
- T3 preview explicitly failed on missing host system libraries; the documented
  Nix Chromium/CDP fallback completed using ordinary port 4213.
- The graph was restored and owned browser processes closed. Host/carrier/model
  mock were stopped with the normal workspace-scoped stop command.

# Controlled composition conflict rehearsal (ticket 59)

This isolated harness uses the authenticated complete browser client and the real
pristine pinned Host. Only model inference uses MODEL MOCK. It adds a test-only
Context reference in the generated Vite build; no upstream plugin is edited and
no second Context or Loader is created. Shared UI/build scripts are unchanged.

From the workspace root, prepare source and artifacts with
`bash scripts/dsh-test-prepare.sh all`, then:

```bash
source scripts/dsh-test-env.sh
node scripts/dsh-composition-diagnosis-prepare.mjs
MYGO_CLIENT_COMPOSITION=single-root \
MYGO_STARTUP_CONFIG=.scratch/composition-diagnosis/startup.json \
DSH_CLIENT_PORT=4222 DSH_CLIENT_BIND=0.0.0.0 \
DSH_CLIENT_PUBLIC_ORIGIN=http://100.97.207.47:4222 \
node .scratch/composition-diagnosis/host.mjs start
node scripts/dsh-composition-diagnosis-browser.mjs
node .scratch/composition-diagnosis/host.mjs stop
```

Try T3 preview first. When unavailable for missing host libraries, this harness
uses the documented Nix Chromium fallback with a private profile. Launch URLs,
profiles, logs and result evidence remain under ignored `.scratch`.

The browser submits one duplicate original account-settings package identity
through the public original `modules.entries.sync` API. The original parser's
error must appear in the existing Plugins reconciliation diagnostics. The test
retains actual Entry, module namespace and fiber references and verifies all
survive rejection unchanged; original Host inventory/settings must also remain
unchanged with no management writes. A valid original graph clears the diagnosis.

Parent wiring: retain the existing call to `protectLocalEntryModules` in
`entries/dsh-startup/single-client.js` and its existing Context effect disposer.
The existing `InstanceClientActions` already subscribes to
`ctx.modules.entries.state` and renders graph failures. No shared UI wiring is
required. Synchronous graph/preflight rejection is exposed through that public
observable while the original exception still reaches its caller. Loader,
transport and permission errors keep their original paths and messages.

## Validation in this worktree

The initial browser run failed specifically because the duplicate package error
was absent from the Plugins page. With the boundary change, duplicate identity
and cross-owner admission errors were visible; all retained Entry, namespace and
fiber identities survived each rejection. A valid graph cleared the diagnosis.
Host inventory/configuration values and revisions stayed unchanged and no Host
management mutation was observed. Schema serialization assigns fresh reference
ids on each read, so comparisons use namespace values/base/user/revision rather
than incidental schema ids.

Blocking just the optional unchanged account-settings bundle produced its
original import failure, distinct from the composition conflict; unblocking and
original roster retry restored ACTIVE. The original authentication UI check and
restricted-Peer permission refusal passed. Existing-session browser submission
and Host durable receipt/stream checks passed using MODEL MOCK. The generated
runner selects the shared browser's `check-submit` mode: its `check-create` mode
still assumes the retired dual-root ownership registry. No shared browser file
was changed.

Fresh original artifact gates passed 8/8, original Web project typecheck passed,
and focused carrier authority tests passed 3/3. The fixed source remained
pristine. This does not claim a full adapter checkJs pass, the parent's full
suite, arbitrary compatibility, missing-dependency coverage, or a newly induced
transport disconnection. Owned listeners were stopped normally after validation.

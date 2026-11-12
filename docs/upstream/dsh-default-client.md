# mygo client validation

mygo boots one Cordis client tree. The local startup roster in
`entries/dsh-startup/local/single-root.json` provides instance management and
local UI contributions. The selected DSH instance supplies its client graph.
There is no legacy composition, implicit default instance, or fallback UI tree.

Each saved instance is an equal connection profile. Opening an instance creates
an explicit `/mygo-instance/<route>/` binding and navigates to it. The route owns
that instance's upstream address and credential context. Editing the catalog does
not silently change the running route.

## Verification

Prepare the pinned upstream and start the owned test environment:

```bash
bash scripts/dsh-test-prepare.sh all
source scripts/dsh-test-env.sh
DSH_CLIENT_PORT=4224 DSH_CLIENT_BIND=0.0.0.0 \
DSH_CLIENT_PUBLIC_ORIGIN=http://100.97.207.47:4224 \
node scripts/dsh-test-host.mjs start
```

Run the current product checks:

```bash
node --test scripts/test/*.test.mjs
node scripts/dsh-startup.mjs build
node scripts/dsh-test-browser.mjs check-default
node scripts/dsh-test-host.mjs check-submit
node scripts/dsh-test-browser.mjs check-management
node scripts/dsh-unified-plugins-browser.mjs
```

The two-instance browser scenario uses a second real pinned Host. Start it in a
separate terminal, run the scenario, then stop it with `Ctrl-C`:

```bash
pnpm --config.auto-install-peers=false dlx --package=node-linux-x64@24.21.0 \
  node scripts/dsh-switch-host.mjs
node scripts/dsh-unified-plugins-browser.mjs --switch-instances
```

The scenario removes its temporary `second-dsh` and `unavailable-dsh` profiles
and proxy credentials before returning.

Only model inference uses MODEL MOCK. Browser authentication, Cordis lifecycle,
DSH Remote calls, sessions, receipts, streaming, settings, plugin inventory and
instance routing use the pinned DSH implementation. Private launch URLs, cookies
and browser profiles remain under ignored `.scratch/` paths and must not be
printed or committed.

The upstream pin is `fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159`. Verify it with:

```bash
bash scripts/dsh-upstream.sh verify
```

The original Web TypeScript build does not typecheck the local JavaScript and TSX
adapters. Their validation consists of the adapted build, focused tests and the
real-browser product checks above.

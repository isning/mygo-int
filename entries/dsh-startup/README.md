# mygo Web client

This entry builds one local Cordis Context and the original DSH Loader, React
renderer, navigation, Settings and Plugins UI. It starts without a harness.

Every DSH is added through `POST /mygo-local/connection` and opens under its own
`/mygo-instance/<route>/` document. The mygo reverse proxy stores that profile's
native credential privately and preserves original DSH admission and Remote
authorization. There is no default instance, browser-owned catalog, fallback
carrier, alternate composition or server-injected owner cookie.

Use the repository workflows:

```bash
bash scripts/dsh-test-prepare.sh acquire
bash scripts/dsh-test-prepare.sh install
bash scripts/dsh-test-prepare.sh build
node scripts/dsh-test-host.mjs start
node scripts/dsh-test-browser.mjs check-default
node --test scripts/test/*.test.mjs
```

The pinned DSH checkout remains unmodified. The build reuses its Vite graph and
adapts only the Plugins page export seam described in
[ADR 0008](../../docs/adr/0008-zero-instance-base-and-dsh-adapter-seams.md).
Current architecture and validation are recorded in
[ADR 0009](../../docs/adr/0009-one-product-startup-path.md) and the
[default-client handoff](../../docs/upstream/dsh-default-client.md).

# Pinned DSH source and build

Mygo uses deepseek-harness commit
`fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159` (`0.2.2-rc.1`). The checkout is
ignored under `.scratch/upstream/deepseek-harness` and must remain pristine.

```bash
bash scripts/dsh-test-prepare.sh acquire
bash scripts/dsh-test-prepare.sh install
bash scripts/dsh-test-prepare.sh build
bash scripts/dsh-upstream.sh verify
```

The frozen install uses pnpm 11.28.5. The build runs the original serialized
artifact graph. Mygo's adapted Web build then runs through
`node scripts/dsh-startup.mjs build`; it reuses the upstream Vite configuration
and writes only ignored output under `.scratch/`.

Distribution must retain [the upstream MIT license](dsh-LICENSE) and the notices
and asset licenses in the selected upstream closure.

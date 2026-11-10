# Original DSH artifact build (issue 27)

This run uses the unmodified source at
`fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159`, version `0.2.2-rc.1`.
See [the source handoff](dsh-build-handoff.md) for acquisition, module contracts
and license retention. Generated files and dependencies stay in ignored scratch.

## Reproduce

Run from the mygo worktree root in Bash. Do not run another generator/build in
the same upstream tree concurrently. Each command must succeed before continuing.

```bash
set -euo pipefail
bash scripts/dsh-upstream.sh acquire
bash scripts/dsh-upstream.sh verify
export XDG_CACHE_HOME="$PWD/.scratch/upstream/.cache"
export XDG_DATA_HOME="$PWD/.scratch/upstream/.data"
export XDG_STATE_HOME="$PWD/.scratch/upstream/.state"
export PNPM_HOME="$PWD/.scratch/upstream/.pnpm"
export npm_config_cache="$PWD/.scratch/upstream/.npm-cache"
export npm_config_store_dir="$PWD/.scratch/upstream/.pnpm-store"
mkdir -p .scratch/upstream/logs
pnpm dlx pnpm@11.28.5 --version
node -e 'const [a,b,c]=process.versions.node.split(".").map(Number); if (!(a>24 || a===24 && (b>9 || b===9 && c>=0)) || !process.features.typescript) process.exit(1)'
CI=true pnpm dlx pnpm@11.28.5 --dir .scratch/upstream/deepseek-harness \
  install --frozen-lockfile --store-dir "$npm_config_store_dir" \
  > .scratch/upstream/logs/install.log 2>&1
# The frozen install supplies upstream's exact pnpm JavaScript entrypoint.
test "$(node .scratch/upstream/deepseek-harness/node_modules/pnpm/bin/pnpm.cjs --version)" = 11.28.5
node .scratch/upstream/deepseek-harness/node_modules/pnpm/bin/pnpm.cjs \
  --dir .scratch/upstream/deepseek-harness \
  run build --scope artifacts --profile local --serial \
  > .scratch/upstream/logs/build.log 2>&1
bash scripts/dsh-upstream.sh verify
```

An interrupted install can be repeated with the frozen lockfile and retained
store. After resolving a build prerequisite, repeat the artifact command with
retained outputs; the original compiler handles its incremental products.
Never edit upstream sources or substitute a Web-only build to bypass a failed gate.

## Observed environment

2026-11-10, Linux x64 glibc: Node `24.21.0` with type stripping and
`include/node/node_api.h` beside its real installation; pnpm `11.28.5`;
`cc` is Clang `21.1.8`. Python, make and pkg-config were already available.
System pnpm `12.9.0` only launches the pinned pnpm through `dlx`; the install
and artifact graph use `11.28.5`. No system packages were installed.

Frozen install passed across all 394 workspace projects. Logs live at
`.scratch/upstream/logs/install.log` and `.scratch/upstream/logs/build.log`.

## Actual result and reuse

The original serialized artifact graph exited 0: **8 passed, 0 failed, 0
skipped**, in 102.59 seconds. Native addon, Host Typert, Host compiler, Host
bundle, Desktop bundle, Client compiler, Client bundle and Web build all passed.
Post-build acquisition verification passed; upstream `git status --short` was
empty. The frozen lockfile retains SHA-256
`b6f0946199db2661e45ac0ceead23e6ceedf148604b48ea9b05a6287a4094bcd`.

Relative to `.scratch/upstream/deepseek-harness`, retain the whole checkout for
dependent work, including dependencies and generated outputs:

- `apps/web/dist/`: original Web entry and preview worker, about 22 MiB.
- `packages/client/web/lib/index.js`, `apply-injections.js`, CSS and `types/`:
  original `@deepseek-ai/dsh-client-web` exports. Other workspace `lib/` products
  include generated Remote/Typert contracts and client/factory bundles.
- `.dsh-build/client-build-environment.json`: local profile, commit `fcc0ad4`,
  version `0.2.2-rc.1`, 367 covered client artifacts, digest
  `d1d7717dd1ace06f73c1a0acc6f8dee276653975dc341c46afaf11c4ec21ea61`.

The upstream digest covers its declared Web/dynamic-client artifact patterns,
not every generated library file. Independent post-build validation using its
`readClientBuildRecord` function passed:

```bash
node --input-type=module -e 'import {readClientBuildRecord} from "./.scratch/upstream/deepseek-harness/scripts/client-build-environment.ts"; console.log(readClientBuildRecord(process.cwd()+"/.scratch/upstream/deepseek-harness"))'
```

Selected SHA-256 values (paths relative to upstream):

```text
a08b293e998a43115b86704e42032e3123e8096809b512af029a1ad2f920acff  apps/web/dist/index.html
c4fdfdbee15c6d2b810fe40c264c41bd3a38b420636606ab540686843b38c05c  apps/web/dist/assets/index-CnyQSzND.js
193dfe6d927da34d03049602d4296328bb158626c5ef41aa092a0a53f0d84cd8  packages/client/web/lib/index.js
c019115f387f615a9d61644af7dafa7f69620ea745959e80130e7c28d866d617  packages/client/web/lib/apply-injections.js
861d64229728cd65a98d119612c12769582574d1a092f0b63c8b0fd474e7065f  apps/web/dist/assets/fonts/Montserrat-OFL.txt
```

Installed versions were checked from package manifests: TypeScript `6.0.3`,
tsx `4.23.13`, tsdown `0.22.2`, Web Vite `6.4.3`, React `18.3.1`.
No blocker remains for artifact production. Artifacts are ignored local files;
cherry-picking this handoff does not transfer them. Use the producing worktree
or rebuild in the consumer's own checkout with the commands above. Do not
extract only `dist` and assume it supplies bootstrap/authentication/transport.

Artifact production alone does not establish independent client boot. No Host
runtime or browser smoke check is part of this run. Reuse must retain original
package/module IDs, generated contracts and the original build closure; follow
the source handoff's notice requirements before redistribution.

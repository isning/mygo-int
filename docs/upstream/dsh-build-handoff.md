# Pinned DSH source and original Web build

Issue: [26](https://github.com/isning/mygo-int/issues/26), under the confirmed
[specification](https://github.com/isning/mygo-int/issues/25). This handoff acquires
and identifies build inputs; issue 27 constructs artifacts. No application,
replacement bundler, UI rewrite or toolkit selection is introduced here.

## Acquisition

Source: <https://github.com/deepseek-ai/deepseek-harness>.
Revision: `fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159` (detached Git checkout).
Original root package: `@deepseek-ai/dsh-root`, version `0.2.2-rc.1`.

From this worktree root, using Bash and Git:

```bash
bash scripts/dsh-upstream.sh acquire
bash scripts/dsh-upstream.sh verify
```

The helper fetches the exact commit at depth 1 into the already ignored
`.scratch/upstream/deepseek-harness`. It retains the entire original tree,
including workspace manifests, patches, lockfile, resources and notices. It
refuses an unexpected origin/revision, tracked edits and symlinked destinations;
it never resets or cleans an existing checkout. Rerun acquisition after a failed
fetch; inspect manually if interrupted checkout left files. Verification checks
tracked files against HEAD, not generated/untracked outputs or dependency integrity.
The initial inspection used `git clone --no-checkout` followed by
`git checkout --detach` at this same revision; the helper's shallow-fetch path
is separately checked as described below.

Reference SHA-256 values at the pin:

```text
b6f0946199db2661e45ac0ceead23e6ceedf148604b48ea9b05a6287a4094bcd  pnpm-lock.yaml
ebb4f09972aee8608be255debaf78451a68e95c290f55c240dec2ecfa16ea6be  LICENSE
4bd8832885ca31daf3e480fb950b9e849446438c0089b05fab67d6c2673fa2ef  THIRD_PARTY_NOTICES.md
```

## Original build entry and prerequisites

All paths below are relative to the acquired upstream root. Evidence is from
that revision, not inferred from earlier design proposals:

- `package.json`: Node `>=24.9.0`, package manager `pnpm@11.28.5`.
  `scripts/build.ts` additionally requires Node TypeScript stripping
  (`process.features.typescript`); do not disable it through `NODE_OPTIONS`.
- `pnpm-lock.yaml`: TypeScript `6.0.3`, tsx `4.23.13`, tsdown `0.22.2`;
  **apps/web** Vite `6.4.3`, React/ReactDOM `18.3.1`. The root also has Vite
  `8.2.2`; do not substitute it for the Web workspace's resolver.
- Keep `pnpm-workspace.yaml`, its `allowBuilds` policy, overrides, all patches
  and the frozen lockfile. This is the original workspace closure, not a claim
  to a minimal dependency set. Dependencies may run the reviewed native build
  scripts allowed there.
- `native/system/scripts/build.ts`: the artifact graph calls
  `build:native-system` with `--host-addon-only`. On Linux glibc this needs `cc`
  and Node-API headers at `../include/node` relative to the **actual Node
  executable**. Musl uses `musl-gcc`; macOS uses `cc` with its system SDK.
  Full static Landlock building is not requested by that flag. No compiler
  version is pinned by this script. Dependency install scripts can have further
  native prerequisites; these were not exercised in issue 26.

With that exact pnpm available, the executable handoff is:

```bash
set -e
bash scripts/dsh-upstream.sh verify
cd .scratch/upstream/deepseek-harness
# Keep package caches and the pnpm store inside this worktree.
export XDG_CACHE_HOME="$PWD/../.cache"
export XDG_DATA_HOME="$PWD/../.data"
export XDG_STATE_HOME="$PWD/../.state"
export PNPM_HOME="$PWD/../.pnpm"
export npm_config_cache="$PWD/../.npm-cache"
export npm_config_store_dir="$PWD/../.pnpm-store"
test "$(pnpm --version)" = 11.28.5
node -e 'const [a,b,c]=process.versions.node.split(".").map(Number); if (!(a>24 || a===24 && (b>9 || b===9 && c>=0)) || !process.features.typescript) process.exit(1)'
# CI=true skips upstream's root Git-hook installer (scripts/install-lefthook.mjs).
CI=true pnpm install --frozen-lockfile --store-dir "$PWD/../.pnpm-store"
pnpm run build --scope artifacts --profile local --serial
```

Run the checks as separate commands in a shell with `set -e` (or stop on any
nonzero exit). The installed pnpm observed during this task was `12.9.0`, so
it must not silently stand in for `11.28.5`. If missing, supply the exact version
with the permitted pnpm/Nix tooling; for example `pnpm dlx pnpm@11.28.5` from
the mygo root can launch it with `--dir .scratch/upstream/deepseek-harness`.
Set the cache variables before downloading tools. This optional provisioning
route has not been executed here. Do not use system installs or install scripts.

The artifact command delegates to **unmodified** `scripts/build.ts`. It selects
the local public branding profile, serializes the existing graph for diagnosis,
and omits aggregate test/script checks. `pnpm run build` is upstream's full
artifact-plus-check entry. The graph already performs:

1. Native host addon and source-only Typert generation. The latter is
   `tsx scripts/generate-typert.ts`, emitting contributor `lib/typert.host.*`
   and `lib/typert.remote-client.*` before compilation.
2. Host referenced-project compilation, Host tsdown bundle, Desktop bundle,
   then Client referenced-project compilation and Client tsdown bundle
   (`--config-loader native --env.DSH_BUILD_FACE client`). See
   `scripts/compile-referenced-projects.ts`; Client waits because compiler
   faces share `lib/types` products. Do not run parallel writers in one tree.
3. `pnpm run build:web`, which is exactly
   `pnpm --filter @deepseek-ai/dsh-web-frontend run build`, then `vite build`
   in `apps/web`, using its original `vite.config.ts`.
4. `.dsh-build/client-build-environment.json`, the upstream build record
   defined by `scripts/client-build-environment.ts`.

Thus `pnpm run build:web` alone is a valid original **final stage**, not a
fresh-checkout preparation command. `build:lib:client` alone does not replace
the generation/Host prerequisites. No separate generation command is needed
before the artifact orchestrator.

## Inputs and outputs for dependent workers

The original page is `apps/web/index.html` → `apps/web/src/main.ts` →
`@deepseek-ai/dsh-client-web`'s `AppWebEntry`. The library's
`packages/client/web/tsdown.config.ts` consumes `lib/types/index.js` and
`lib/types/apply-injections.js` through the original static-linked preset.
Preserve public package/module IDs, static singleton seeds, React dedupe,
Loader's browser definitions, generated Remote contracts, and factory bundles.

Issue 27 can build the unmodified source and inspect `apps/web/dist`, package
`lib` products and the build record. The original build also produces a worker
preview surface; it is not proof of an independently connected mygo client.
A second worker can inspect bootstrap/transport seams from this same pin in its
own checkout without waiting for artifacts. Each worker should acquire its own
ignored tree; generated outputs and dependency directories are not cherry-picked.

`apps/web/vite.config.ts` rejects bare serve/preview because it cannot inject
`window.__DSH_BOOT__`. Upstream's runtime reference is `pnpm dsh web`, not
static serving of `dist`. Neither a Host nor the app was launched here.
Complete Peer bootstrap, authenticated resources and independent hosting belong
to dependent implementation, as detailed in
[the extraction research](../research/dsh-react-extraction.md).

## Source and license retention

The root `LICENSE` is MIT, copyright (c) 2026 DeepSeek. Its exact text is retained
beside this document as [dsh-LICENSE](dsh-LICENSE). Root, Web frontend and
client-web manifests declare MIT. The acquired tree retains the original
`repository` metadata and all original notices; no packages are renamed.

Retain `THIRD_PARTY_NOTICES.md`, `vendor/README.md` and per-vendor `LICENSE`
files when selecting reused source. The notice inventory explicitly covers
direct dependencies, not the complete npm transitive closure; it points to
the lockfile and `pnpm licenses list` for further inspection. The Web Vite
plugin emits `assets/fonts/Montserrat-OFL.txt` alongside the brand font.
Do not omit it. KaTeX fonts are also bundled; their license/notice requirements
need inspection in the installed dependency and selected output, rather than
assuming the font transform (`apps/web/katex-fonts.ts`) emits notices.
Other workspace payloads have their own terms; inspect the actual selected
artifact closure before redistribution. These observations are not blanket
legal clearance or an audit of every dependency.

## Checks and limits (2026-11-10)

Source was fetched and inspected at the exact revision. The helper's fresh
shallow acquisition, repeated acquisition, verification and Bash syntax check
passed. The lockfile/license/notice SHA-256 values were computed, the copied
license compared byte-for-byte, the scratch exclusion checked with
`git check-ignore`, and `git diff --check` passed. The documented Node
version/type-stripping check passed. Local tools observed:
Git `2.56.0`, Node `24.21.0`, pnpm `12.9.0`; `cc` exists, but Node development
headers/native compilation were not verified. No dependencies installed, no
Typert generation, artifact build, browser smoke check or runtime connection
was attempted. Issue 26's source/build-entry acceptance does not assert issue
27's build success. Exact pnpm provisioning and any native dependency failures
remain checks for the artifact worker.

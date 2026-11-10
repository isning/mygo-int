#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
umask 077
source scripts/dsh-test-env.sh
mkdir -p .scratch/upstream/logs .scratch/test-dsh
chmod 700 .scratch .scratch/test-dsh
stage="${1:-all}"
case "$stage" in acquire|install|build|all) ;; *) echo 'Usage: bash scripts/dsh-test-prepare.sh {acquire|install|build|all}' >&2; exit 2;; esac
if [[ "$stage" == acquire || "$stage" == all ]]; then bash scripts/dsh-upstream.sh acquire; fi
bash scripts/dsh-upstream.sh verify
if [[ "$stage" == install || "$stage" == all ]]; then
  CI=true pnpm dlx pnpm@11.28.5 --dir .scratch/upstream/deepseek-harness install --frozen-lockfile --store-dir "$npm_config_store_dir" > .scratch/upstream/logs/install.log 2>&1
fi
if [[ "$stage" == build || "$stage" == all ]]; then
  test "$(node .scratch/upstream/deepseek-harness/node_modules/pnpm/bin/pnpm.cjs --version)" = 11.28.5
  node .scratch/upstream/deepseek-harness/node_modules/pnpm/bin/pnpm.cjs --dir .scratch/upstream/deepseek-harness run build --scope artifacts --profile local --serial > .scratch/upstream/logs/build.log 2>&1
fi
bash scripts/dsh-upstream.sh verify

#!/usr/bin/env bash
# Source only from the repository root, before every pnpm invocation.
export XDG_CACHE_HOME="$PWD/.scratch/upstream/.cache"
export XDG_DATA_HOME="$PWD/.scratch/upstream/.data"
export XDG_STATE_HOME="$PWD/.scratch/upstream/.state"
export PNPM_HOME="$PWD/.scratch/upstream/.pnpm"
export npm_config_cache="$PWD/.scratch/upstream/.npm-cache"
export npm_config_store_dir="$PWD/.scratch/upstream/.pnpm-store"
export NARB_NATIVE_CACHE_DIR="$PWD/.scratch/test-dsh/native-cache"
export DSH_HOME="$PWD/.scratch/test-dsh/home"
export DSH_AGENTS_HOME="$PWD/.scratch/test-dsh/agents"
export DSH_TELEMETRY_DISABLED=1

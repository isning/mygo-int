#!/usr/bin/env bash
# Acquire the original DSH tree; never replace an existing checkout or its edits.
set -euo pipefail

readonly revision=fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159
readonly repository=https://github.com/deepseek-ai/deepseek-harness.git
readonly workspace="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
readonly destination="$workspace/.scratch/upstream/deepseek-harness"

fail() { printf '%s\n' "$*" >&2; exit 1; }

# Keep acquisition inside this worktree even if an existing scratch path is a link.
for path in "$workspace/.scratch" "$workspace/.scratch/upstream" "$destination"; do
  [[ ! -L "$path" ]] || fail "Refusing symlink: $path"
done

verify() {
  [[ -d "$destination/.git" && ! -L "$destination/.git" ]] || fail 'Run acquire first (expected a standalone nested clone).'
  [[ "$(git -C "$destination" rev-parse --show-toplevel)" == "$destination" ]] || fail 'Unexpected Git root.'
  [[ "$(git -C "$destination" remote get-url origin)" == "$repository" ]] || fail 'Unexpected origin; leaving checkout untouched.'
  [[ "$(git -C "$destination" rev-parse HEAD)" == "$revision" ]] || fail 'Unexpected revision; leaving checkout untouched.'
  git -C "$destination" diff --quiet HEAD -- || fail 'Tracked upstream changes found; leaving checkout untouched.'
  printf 'Verified %s at %s\n' "$revision" "$destination"
}

case "${1:-}" in
  acquire)
    if [[ -e "$destination/.git" ]]; then
      # An interrupted acquisition can be resumed only before its first checkout.
      if git -C "$destination" rev-parse --verify HEAD >/dev/null 2>&1; then
        verify
        exit 0
      fi
      [[ -d "$destination/.git" && ! -L "$destination/.git" ]] || fail 'Unexpected Git metadata.'
      [[ "$(git -C "$destination" remote get-url origin)" == "$repository" ]] || fail 'Unexpected origin.'
      [[ -z "$(git -C "$destination" status --porcelain)" ]] || fail 'Incomplete checkout contains files; inspect manually.'
    else
      [[ ! -e "$destination" ]] || fail 'Destination already exists without Git metadata; inspect manually.'
      mkdir -p -- "$destination"
      git -C "$destination" init
      git -C "$destination" remote add origin "$repository"
    fi
    git -C "$destination" fetch --depth 1 origin "$revision"
    git -C "$destination" checkout --detach "$revision"
    verify
    ;;
  verify) verify ;;
  *) fail 'Usage: bash scripts/dsh-upstream.sh {acquire|verify}' ;;
esac

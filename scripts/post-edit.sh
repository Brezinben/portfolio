#!/usr/bin/env bash
# Claude Code PostToolUse hook: run the hk.pkl steps on the file Claude just edited.
# Exit 2 sends the remaining errors back to Claude, which fixes them before going on.
# Workaround (assumption 7): replace when `hk agent hooks` prints a PostToolUse hook.
set -uo pipefail

file=$(mise x -- jq -r '.tool_input.file_path // empty')
[ -f "$file" ] || exit 0

# In a worktree, CLAUDE_PROJECT_DIR is the original checkout: take the root from the file.
root=$(git -C "$(dirname -- "$file")" rev-parse --show-toplevel 2>/dev/null) || exit 0
[ -f "$root/.config/hk.pkl" ] || [ -f "$root/hk.pkl" ] || exit 0
cd "$root" || exit 0

# hk skips files outside the step globs; --no-stage keeps the edit out of the git index.
if ! out=$(mise x -- hk fix --no-stage --stash none --quiet "$file" 2>&1); then
  echo "$out" >&2
  exit 2
fi

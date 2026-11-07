#!/usr/bin/env bash
# Hook PostToolUse de Claude Code : lance les étapes de .config/hk.pkl sur le fichier édité.
# La sortie 2 renvoie les erreurs restantes à Claude, qui les corrige avant de continuer.
# Contournement : à remplacer quand `hk agent hooks` produira un hook PostToolUse.
set -uo pipefail

file=$(mise x -- jq -r '.tool_input.file_path // empty')
[ -f "$file" ] || exit 0

# Dans un worktree, CLAUDE_PROJECT_DIR désigne le checkout d'origine : la racine vient du fichier.
root=$(git -C "$(dirname -- "$file")" rev-parse --show-toplevel 2>/dev/null) || exit 0
[ -f "$root/.config/hk.pkl" ] || exit 0
cd "$root" || exit 0

# hk ignore les fichiers hors des globs ; --no-stage garde l'édition hors de l'index git.
if ! out=$(mise x -- hk fix --no-stage --stash none --quiet "$file" 2>&1); then
  echo "$out" >&2
  exit 2
fi

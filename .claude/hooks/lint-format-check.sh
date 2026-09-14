#!/bin/bash
# Vérifie lint et format sur le seul fichier édité, juste après l'édition. Mêmes
# règles que .githooks/pre-commit, mais plus tôt : la violation remonte à
# l'édition, pas au commit. Le lint corrige ce qu'il peut, comme 'bun run lint' ;
# le format ne corrige jamais, pour laisser l'agent voir et appliquer le diff.
set -u

command -v jq >/dev/null 2>&1 || exit 0

file=$(jq -r '.tool_input.file_path // ""')
case "$file" in
  *.ts | *.tsx | *.js | *.jsx | *.mjs | *.cjs) ;;
  *) exit 0 ;;
esac
[ -f "$file" ] || exit 0

# ATTENTION, mesuré : la racine se déduit du FICHIER, et non de CLAUDE_PROJECT_DIR.
# Dans un worktree, cette variable pointe sur le checkout d'origine. Le hook faisait
# donc `cd` vers l'origine puis lançait oxlint sur un chemin absolu du worktree :
# oxlint chargeait deux configurations, celle du cwd et celle du fichier, et le
# plugin anti-slop se retrouvait inscrit deux fois. Le hook échouait alors sur CHAQUE
# édition, avec « Plugin name 'anti-slop' is already registered », un message qui
# ressemble à une violation de lint sans en être une.
root=$(cd -- "$(dirname -- "$file")" && pwd) || exit 0
while [ "$root" != "/" ] && [ ! -f "$root/.oxlintrc.jsonc" ]; do
  root=$(dirname -- "$root")
done

# Un fichier hors de tout projet oxlint n'est pas une violation : les fichiers
# temporaires de l'agent vivent hors du dépôt.
[ -f "$root/.oxlintrc.jsonc" ] || exit 0

cd "$root" || exit 0
[ -x ./node_modules/.bin/oxlint ] || exit 0
[ -x ./node_modules/.bin/oxfmt ] || exit 0

lint_output=$(./node_modules/.bin/oxlint --fix --format=agent "$file" 2>&1)
lint_status=$?

format_output=$(./node_modules/.bin/oxfmt --check "$file" 2>&1)
format_status=$?

if [ "$lint_status" -ne 0 ] || [ "$format_status" -ne 0 ]; then
  {
    echo "Lint/format en échec sur $file (mêmes règles que le hook pre-commit)."
    [ "$lint_status" -ne 0 ] && echo "--- oxlint ---" && echo "$lint_output"
    [ "$format_status" -ne 0 ] && echo "--- oxfmt --check ---" && echo "$format_output"
    [ "$lint_status" -ne 0 ] && echo "Lint a deja corrige ce qu'il pouvait ; ce qui reste doit se corriger a la main."
    [ "$format_status" -ne 0 ] && echo "Corriger le format via 'bun run format', pas a la main."
  } >&2
  exit 2
fi

exit 0

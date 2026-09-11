# Revoir les règles @stylistic

Status: ready-for-human
Type: task

Reprend l'issue GitHub #1 du dépôt `Brezinben/portfolio`.

## Trois demandes

1. **Enlever ce qu'`oxfmt` fait déjà par défaut.** Un formateur et un linteur qui règlent
   la même chose se contredisent tôt ou tard. `.oxlintrc.json` porte aujourd'hui une
   longue liste `@stylistic/` dont une bonne part est de la mise en forme pure :
   `no-multi-spaces`, `no-mixed-spaces-and-tabs`, `no-multiple-empty-lines`, `new-parens`,
   `no-floating-decimal`.
2. **`multiline-ternary` sur une ligne si la ligne est courte.** Aujourd'hui
   `["error", "always-multiline"]` à `.oxlintrc.json:227`.
3. **Redemander les règles spécifiques.** Une pièce jointe à l'issue, `regles-stylistic-non-activees.md`,
   liste les règles qui ne sont pas activées et qui sont plus précises que ce qu'`oxfmt`
   sait faire.

## Ce qui manque pour agir

La pièce jointe n'est pas dans le dépôt. Il faut la récupérer depuis l'issue #1 avant de
trancher, sinon on décide sans la liste.

## Une remarque au passage

`no-duplicate-imports` et `consistent-type-specifier-style` se contredisent sur les
fichiers de test : `layout.spec.ts` et `a11y.spec.ts` portent tous deux l'erreur. Le
conflit est connu, jamais tranché. À régler dans le même passage.

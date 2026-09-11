# Revoir les règles @stylistic

Status: resolved
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

## Réponse

La pièce jointe de l'issue #1 mesure les 95 règles du plugin, une par une, sur ce dépôt :
la règle voit-elle le défaut, oxfmt le répare-t-il seul, et combien d'erreurs sur le code
existant. Elle range les 95 en six groupes.

Croisée avec les **66 règles `@stylistic` actives**, elle tranche les trois demandes d'un
coup.

| Groupe | Actives | Ce que la mesure dit | Décision |
|---|---|---|---|
| 6 — oxfmt les corrige seul | **58** | Activer ne change aucune ligne de code | retirées |
| 4 — contredisent oxfmt | 4 | Le formateur défait ce que la règle demande | retirées |
| 2 — doublons d'une règle native | 1 | Le natif fait le travail, en Rust | retirée |
| 1 — `lines-between-class-members` | 1 | « Surveille une forme que le projet n'écrit pas » | retirée |
| hors document | 2 | `padding-line-between-statements`, `spaced-comment` | gardées |

**64 retirées, 1 ajoutée.** `@stylistic/line-comment-position` est la seule que la mesure
recommande sans réserve : zéro correction, et elle garde une habitude déjà tenue.

### `multiline-ternary`, la demande nommée

Elle est dans le groupe 4. La mesure dit : « la règle et le formateur se disputent la même
décision ». La retirer **est** la réponse à « sur une ligne si pas long en char » : sans
elle, oxfmt décide, et il met les ternaires courts sur une ligne.

### Trente-neuf règles JSX pour un projet sans JSX

Sur les 64 retirées, 13 portent sur JSX. Ce dépôt n'en contient pas une ligne : il tourne
sur Alpine et du TypeScript. Elles ne pouvaient rien voir.

### Le conflit d'imports n'existait pas

`import/consistent-type-specifier-style` est déjà à `off`. L'erreur
`no-duplicate-imports` que portent `layout.spec.ts` et `a11y.spec.ts` venait d'ailleurs.
Elle ne se produit plus.

### Une porte était rouge, et personne ne la regardait

`bun run format:check` échouait déjà sur `main`, sur `tests/browser/agents.spec.ts`. Les 58
règles redondantes ne l'ont jamais vu — elles surveillaient la mauvaise porte. Corrigé dans
le même commit.

## Ce qui reste à arbitrer

**`@stylistic/lines-around-comment`.** La mesure la nomme « la seule candidate qui ajoute
une vraie décision de lisibilité ». Elle prolonge `padding-line-between-statements` du côté
des commentaires, et oxfmt ne pose jamais cette ligne vide. Elle coûte **56 corrections**,
que `--fix` sait poser.

Je ne la tranche pas : c'est une décision de goût, et 56 corrections dans cette PR
noieraient le retrait des 64.

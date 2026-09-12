# Interpréteur de commandes

Ce qui transforme une ligne tapée en lignes à afficher et en descripteurs d'effets.

**Pur et synchrone.** Il ne touche pas au DOM, ne fait aucune requête, ne pose aucun
minuteur. C'est ce qui permet de couvrir toutes les commandes sans navigateur, et c'est
le premier des deux seams du projet.

`src/interpret.ts` est la **façade** : la coquille et les tests unitaires passent par
cette porte, jamais par un module de ce dossier. Elle n'exporte que ce qui a un
consommateur.

## Language

**Façade** (`facade`) :
`src/interpret.ts`, réduit à des ré-exports. Elle matérialise la règle « un seam est une
porte, pas quinze ». Un import direct vers `src/interpret/*` depuis `src/app.ts` ou
depuis `tests/unit/` est un défaut.
_Avoid_: barrel, index, point d'entrée.

**Rang** (`rank`) :
La position d'un module dans l'ordre topologique. Un module n'importe que des modules de
rang strictement inférieur. Il n'existe aucun cycle, et l'ordre est le seul garde-fou :
une liaison lue avant son initialisation ne casse que l'artefact fondu, jamais les tests.
_Avoid_: niveau, couche, étage.

**Répartiteur** (`dispatch`) :
`dispatch.ts`, la fonction `interpret`. Elle reste **d'un seul tenant** : `max-statements`
est désactivé dans le lint pour cette raison exacte. La découper disperserait le seul
endroit qui dit, en un coup d'œil, ce que le terminal accepte.
_Avoid_: routeur, aiguilleur, contrôleur.

## Les rangs

| Rang | Modules | Ce qu'ils importent |
|---|---|---|
| 0 | `lookup` · `tone` · `vocabulary` · `share` | rien |
| 1 | `lines` | `tone` |
| 2 | `content` | `tone`, `lookup` |
| 3 | `effects` · `context` | des types seulement |
| 4 | `mascot` · `eggs` · `cowsay` | les rangs 0 à 3 |
| 5 | `completion` · `search` · `consent` | les rangs 0 à 4 |
| 6 | `dispatch` | tout ce qui précède |

## Trois placements qui ne vont pas de soi

**`SLASH_ONLY` vit dans `vocabulary`, pas dans `eggs`.** Il porte `slime`, `joke`,
`propose` et `matrix`, qui ne sont pas des easter eggs : ce n'est pas leur catalogue,
c'est la liste des noms qui exigent le slash. Ce placement supprime l'arête
`completion → eggs`.

**`MAX_SUGGESTIONS` vit dans `lines`, jamais dans `completion`.** Deux lecteurs le
partagent, `offer` et `candidates`. Le remonter dans la complétion forcerait l'arête
inverse, et ce serait le seul cycle possible du découpage.

**Il n'y a pas de `types.ts` central.** `verbatimModuleSyntax` efface les `import type` :
ils ne produisent aucune arête d'exécution, donc un hub n'achèterait rien et coûterait un
module que tout le monde importe. Chaque type vit avec le comportement qu'il décrit.
Deux exceptions, qui sont les deux contrats : `effects` porte ce que l'interpréteur
décrit, `context` ce que la coquille lui apprend.

**`OFFERED` et `ACTIVITIES` ont un lecteur distant.** Ils vivent dans `mascot`, mais
`completion` les lit pour proposer ce que la commande accepte. Les restreindre casserait
l'autocomplétion sans que rien ne le signale.

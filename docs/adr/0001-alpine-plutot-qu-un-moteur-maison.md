# Alpine plutôt qu'un moteur de gabarit écrit à la main

Le portage retire le runtime du canvas, qui apportait React et ReactDOM pour rendre un
gabarit de 494 lignes à cinq primitives : interpolation, liste à clé, condition, liaison
d'événement, ref de rappel. Il fallait donc un moteur pour remplacer celui qui partait.
Nous prenons **Alpine**, épinglé à une version exacte et servi depuis `production/`.

## Options considérées

Les deux options ont été mesurées avant de trancher, pas estimées.

**Moteur écrit à la main** — environ 300 lignes implémentant les cinq primitives avec
réconciliation par clé. Coût : 0 Ko ajouté, 0 réécriture. Le gabarit et `renderVals()`
restaient intacts, soit environ 800 des 2080 lignes conservées telles quelles, et le
diff entre `design/` et `production/` restait lisible ligne à ligne.

**Alpine** — 19 Ko mesurés en gzip. Alpine n'a pas de moustaches : les 265 interpolations
du gabarit sont réécrites, dont 177 situées dans un attribut. Les quelque 40 fermetures
que `renderVals()` rend aujourd'hui remontent dans le gabarit en `x-on:` et `x-ref`. Le
proxy réactif d'Alpine remplace l'objet d'état explicite.

**Vue avec compilateur de gabarit** — 39 Ko en gzip. Sémantiquement le plus proche du
gabarit du canvas, mais il consommait presque toute la marge du budget de poids.

## Décision

Alpine, malgré son coût supérieur sur les deux axes que le projet surveille : le poids et
le volume de réécriture.

La raison est la maintenance, pas la technique. Ce portfolio appartient à une personne
seule, sans équipe et sans pipeline. Un moteur de 300 lignes est du code dont cette
personne est l'unique responsable, y compris dans trois ans, sur un projet qu'elle
n'ouvrira que rarement. Alpine est maintenu par d'autres. L'arbitrage échange 19 Ko et un
portage de gabarit plus long contre l'absence d'un composant maison à entretenir seul.

## Conséquences

Le budget de poids passe d'environ 100 à 119 Ko, sur un plafond de 150 Ko. La marge tombe
à 30 Ko : une police supplémentaire ne passe plus.

`design/` et `production/` cessent d'être comparables ligne à ligne. Le gabarit du canvas
reste la référence de comportement, mais plus la référence de syntaxe.

Trois points demandent de l'attention au portage. La mascotte doit continuer d'écrire sa
position et sa transformation directement, sans passer par l'état réactif. La transition
de thème dépend d'un DOM déjà commité avant que `startViewTransition` ne résolve : c'était
un rappel de `setState`, cela devient `$nextTick`. Et le détecteur de changement manuel du
canvas disparaît, donc l'ordre qu'il protégeait — défilement en bas, puis piège de focus —
doit être reproduit explicitement après chaque commit.

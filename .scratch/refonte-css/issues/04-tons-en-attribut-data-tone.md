# Lot 4 — les tons deviennent un attribut `data-tone`

Status: resolved
Type: task
Blocked by: 03

Onze éléments portent `var(--${…})` où l'interpolation est un ton. `src/interpret.ts:13`
déclare `TONES = ["acc","fg","fg2","ok","warn"]`, et `safeTone` ramène toute valeur
inconnue à `fg`. L'ensemble est fermé et sûr : un `data-tone` convient.

## Le gain

Cinq règles. La correspondance `acc → var(--acc-text)` s'écrit **une fois**, au lieu des
six ternaires JavaScript identiques qui la répètent aujourd'hui.

## Deux points de vigilance

1. `tests/browser/sortie.spec.ts:146` sélectionne `span[style*="color"]` — un sélecteur
   sur la chaîne de l'attribut en ligne. Il casse, bruyamment. Il se réécrit en
   `span[data-tone]`.
2. `item.dot` vient de `app.ts` et **ne passe pas par `safeTone`**. À vérifier avant
   d'écrire la règle, pas à corriger dans ce lot.

## Prérequis

Ajouter **Ton** au glossaire de `CONTEXT.md`. Le terme existe dans le code depuis
toujours et le glossaire l'ignore.

## Vérification

`bun run test:browser` vert, instantané compris, sur les huit thèmes si possible.

## Réponse

Fait. Sept porteurs passent à `data-tone`, cinq règles les servent, et la correspondance
`acc → var(--acc-text)` est écrite une fois au lieu de six.

**Ton** est entré au glossaire de `CONTEXT.md`.

`sortie.spec.ts:145` lisait `span[style*="color"]`. Il lit maintenant `span[data-tone]`.
Il dit la même chose, en mieux : il interroge le rôle, plus la représentation.

## Ce qui n'est pas passé, et pourquoi

Six autres interpolations `var(--…)` restent. **Aucune ne porte un ton** : chacune encode
un prédicat d'état, ce qui relève du lot 5.

| Ligne | Interpolation | Ce que c'est vraiment |
|---|---|---|
| 1180, 1203 | `background:var(--${item.dot})` | Un **fond**, pas une couleur de texte. Et `item.dot` vient de `app.ts` sans passer par `safeTone`. Vérifié : trois valeurs seulement, `acc`, `fg2` et `ok`. |
| 1184 | `item.id === section ? 'fg' : 'fg2'` | L'état sélectionné d'une entrée de section. |
| 1254 | `entry.detail ? 'acc-text' : 'fg2'` | « cette entrée a un détail ». |
| 1436 | `ctxCells === 10 ? 'warn' : 'acc-text'` | Le seuil de la jauge. |
| 1453 | `running ? 'warn' : 'ok'` | L'exécution en cours. |

# Lot 4 — les tons deviennent un attribut `data-tone`

Status: ready-for-agent
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

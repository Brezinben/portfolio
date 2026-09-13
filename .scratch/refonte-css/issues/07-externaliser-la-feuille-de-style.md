# Externaliser la feuille de style

Status: ready-for-agent
Type: task
Blocked by: 06

Le bloc `<style>` fait 940 lignes dans `src/index.html`. Il n'est formaté par rien :
`.oxfmtrc.json` exclut `src/**/*.html`, et `oxfmt` ne connaît pas le CSS de toute façon.

## La décision, prise sur la page 404

Benjamin a tranché : **la source sort, l'artefact remet en ligne.** C'est la lecture 1
ci-dessous. `src/404.css` en est le premier cas : `tools/build.ts` le plie, puis le
remplace dans `src/404.html` à la place de son `<link>`. `index.html` reste à faire.

## Ce qui était à décider avant d'agir

Benjamin a écrit : « lors du bundle, il est réinjecté en inline dans le HTML ». C'est
exact — `tools/build.ts:80` applique `minifyCSS` au bloc en place. Mais **cet inline est
souhaitable** : le premier chargement est mesuré à ~69 Ko compressés pour un plafond de
150 Ko, et une feuille séparée coûte une requête de plus au premier rendu.

Deux lectures s'opposent :

1. **Sortir la source, garder l'inline à l'arrivée.** `src/styles.css` devient la source,
   `tools/build.ts` l'injecte dans `dist/index.html`. On gagne l'édition et le formatage,
   on ne perd rien à l'arrivée. C'est la lecture que je recommande.
2. **Sortir la source et la servir séparément.** On perd une requête au premier rendu, on
   gagne un cache séparé entre les déploiements.

## Le formatage, lui, est résolu par l'externalisation

Cette section disait le contraire, et elle avait tort. `oxfmt` formate le CSS : sorti en
`src/404.css`, le style a pris les point-virgules de fin, les couleurs en minuscules et les
zéros de tête (`.14` devient `0.14`). Seul `src/**/*.html` lui échappe, par `ignorePatterns`.

Conséquence pour `index.html` : sortir son bloc `<style>` le fera reformater d'un coup. Le
diff sera large, et il ne changera aucun rendu. Le prendre dans un commit à part.

Conséquence déjà payée : `tests/unit/agents.test.ts` compare les couleurs sans la casse,
puisque les trois pages ne sont plus formatées de la même façon.

## Contraintes si on procède

- `tools/build.ts` porte trois garde-fous qui lisent le CSS par expression régulière :
  `SLIME_RULE`, `SHEET_RULE`, `SHEET_URL`. Les trois supposent le bloc à sa place actuelle.
- `SHEET_URL` balaye **tout le fichier**, attributs `style=` compris : aucun
  `sprites/slime-*.png` ne doit apparaître ailleurs.
- `tests/browser/budget.spec.ts` reste le garde-fou du poids.

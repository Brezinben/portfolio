# Externaliser la feuille de style

Status: needs-info
Type: task
Blocked by: 06

Le bloc `<style>` fait 940 lignes dans `src/index.html`. Il n'est formaté par rien :
`.oxfmtrc.json` exclut `src/**/*.html`, et `oxfmt` ne connaît pas le CSS de toute façon.

## Ce qui est à décider avant d'agir

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

## Le formatage n'est pas résolu par l'externalisation

`oxfmt` ne formate pas le CSS. Un fichier `.css` reste aussi mal formaté qu'un bloc
`<style>`, sauf à ajouter un formateur CSS au dépôt. C'est une décision distincte, à
prendre séparément.

## Contraintes si on procède

- `tools/build.ts` porte trois garde-fous qui lisent le CSS par expression régulière :
  `SLIME_RULE`, `SHEET_RULE`, `SHEET_URL`. Les trois supposent le bloc à sa place actuelle.
- `SHEET_URL` balaye **tout le fichier**, attributs `style=` compris : aucun
  `sprites/slime-*.png` ne doit apparaître ailleurs.
- `tests/browser/budget.spec.ts` reste le garde-fou du poids.

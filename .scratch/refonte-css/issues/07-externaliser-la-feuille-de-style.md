# Externaliser la feuille de style

Status: resolved
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

## Réponse

**Ce ticket affirmait que l'externalisation ne réglerait pas le formatage. C'est faux :
`oxfmt` formate le CSS.** Il ne le voyait pas, parce que `.oxfmtrc.json` exclut
`src/**/*.html` et que la feuille vivait dedans. Sortie du fichier, elle est formatée, et
`bun run format:check` la garde. C'était le grief d'origine, et il est réglé.

La première lecture est retenue : `src/styles.css` est la source, `tools/build.ts`
l'injecte dans `dist/index.html`. On gagne l'édition et le formatage, on ne perd pas la
requête épargnée au premier rendu.

`src/index.html` passe de 1912 à 484 lignes.

## Ce que le formatage a réveillé

`BASE_RULE` exigeait **l'absence** de point-virgule sur la dernière déclaration d'un bloc,
là où le formateur en pose un. Le build jetait. Les trois expressions l'acceptent
désormais, et celle du slime **s'ancre sur son sélecteur** : sans ancre elle prenait la
première position de la feuille, quelle qu'elle soit, et une règle placée avant `.slime`
aurait reçu l'image fusionnée sans que rien ne le signale. La mascotte aurait disparu de
`dist/` seulement.

`tests/unit/agents.test.ts` lisait les huit thèmes dans `index.html` : il les lit dans la
feuille. Il comparait aussi les hexadécimaux à la lettre, et le formateur les met en
minuscules d'un côté sans lire `texte.html` de l'autre. La casse n'est pas une couleur.

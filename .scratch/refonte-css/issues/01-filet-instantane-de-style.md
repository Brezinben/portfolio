# Réécrire le filet : instantané de style calculé

Status: ready-for-agent
Type: task

Le lot 0 du plan avait produit `tests/browser/styles.spec.ts`. Une session concurrente
l'a supprimé avant tout commit. Sans lui, aucun lot suivant n'est vérifiable : déplacer
465 déclarations sans instantané revient à espérer.

## Ce que le test doit couvrir

Une trentaine de sélecteurs figés, un sous-ensemble de propriétés calculées, un
`toMatchSnapshot`. Six prises : `chassis`, `journal`, `suggestions`, `options`, `frise`,
`arbre`.

Trois thèmes au minimum :
- `dark` — le défaut.
- `light` — son `--acc-text` diffère (`#8f5f00`).
- `noctis` — il applique un `hue-rotate` à la mascotte.

Chaque état du lot 02 se prend **en paire**, sélectionné et non sélectionné.

## Contraintes

- Le seam navigateur sert `dist/`, pas `src/`. Ne jamais valider en ouvrant
  `src/index.html` seul : `minifyCSS` s'applique au bloc `<style>` et jamais aux
  attributs `style=`. Déplacer une déclaration la fait **entrer** dans le champ du
  minifieur.
- Figer l'instantané sur l'état **actuel**, lot 1 compris. L'état est correct aujourd'hui.
- `npx oxlint`, `oxfmt` et `tsc --noEmit` passent.

## Vérification

`bun run test:browser --grep styles` vert. Puis modifier une déclaration à la main et
vérifier que le test devient rouge.

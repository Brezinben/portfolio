# app.ts porte six groupes fermés et la page porte du style statique

Status: resolved
Type: task

## Constats

- 8 `:style` de `src/index.html` n'ont aucune partie dynamique (151, 160, 168, 170,
  534, 608, 610, 629). 16 autres portent surtout du statique.
- `src/app.ts` fait 2 849 lignes. La mascotte, le clavier, les options, `ask`, les
  suggestions et le journal sont des groupes fermés (ADR 0007).
  `terminal/mascot/slice.ts` ne porte qu'une méthode.
- La palette existe en trois copies : `styles.css`, `404.css`, `terminal/settings.ts`.
  Les copies ont divergé : `lux` a `#0f7d8c` dans `settings.ts` et `#0c6d7a` dans les
  feuilles.
- `app.ts` et `404.ts` lisent les options sauvées chacun à sa manière.
- `fetchContent()` rend `any`. `power` et `mode` sont typés `string`, alors que leurs
  valeurs sont fermées. `Delay` et `Beat` sont déclarés quatre fois.
- Les écouteurs globaux sont posés à la main, et `resize` est écouté deux fois.
  `reduced` ne suit pas un changement de préférence.
- clean-css 5.3 jette le nesting et `@scope` sans erreur.

## Correction attendue

Un commit par slice extraite. `app.ts` passe sous 1 000 lignes. Le piège de clean-css va
dans l'ADR 0002.

## Answer

Corrigé dans la PR #24.

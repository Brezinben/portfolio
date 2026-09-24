# Revue critique

Cinq revues ont lu le portfolio le 2026-09-24 : accessibilité, lint, tests, texte et code.
Chaque ticket porte les constats d'un lot, avec leur emplacement. Les lots se font dans
l'ordre des numéros : le découpage de `src/app.ts` passe en dernier, car les quatre
autres lots touchent ce fichier.

## Décisions du porteur

- La transition de thème circulaire est morte depuis la suppression de `design/`. Elle
  part : `data-vt-theme`, `--vt-*` et `vtReveal`.
- `tests/browser/styles.spec.ts` et ses instantanés partent. Le filet servait à la
  refonte CSS, qui est finie. Une base se régénère depuis git avant une autre refonte.
- Chaque contour de focus prend `--acc-text`. En thème clair, `--acc` donne un contraste
  de 2:1 environ contre le fond, et un indicateur de focus demande 3:1 (WCAG 1.4.11).
  Cette décision annule la conclusion de `correctifs-courts/01` sur `[data-ctl]`.
- Stryker reste un outil local, lancé sur les fichiers d'une MR. Aucun job CI.

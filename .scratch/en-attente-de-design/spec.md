# En attente de design

Six points qui demandent une décision visuelle avant toute implémentation. Rien n'est
spécifié pour eux dans `design/DECISIONS.md`.

Chaque ticket porte un **prompt à coller dans Claude Design**. Le résultat attendu est
une mise à jour du canvas `design/Portfolio Benjamin David - Terminal.dc.html`, et une
entrée dans `design/DECISIONS.md`. L'implémentation ne commence qu'après.

## Le contexte commun, à rappeler dans chaque prompt

- Interface terminal à trois volets : volet gauche (sections et missions), volet central
  (journal et ligne de commande), volet de sortie à droite.
- Huit thèmes. Le thème porte `--acc` (ambre décoratif), `--acc-text` (ambre textuel),
  `--acc-soft`, `--edge`, `--panel`, `--fg`, `--fg2`, `--ok`, `--warn`.
- Coins carrés partout sauf les six zones, qui portent `--radius: 5px`. Un élément qui
  prend le focus est toujours carré.
- Une mascotte visqueuse en feuilles de sprites, pilotée par états.
- Budget de premier chargement : 150 Ko compressés, ~69 Ko consommés aujourd'hui.
- Un réglage `anim` coupe toutes les animations. `prefers-reduced-motion` aussi.

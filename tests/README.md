# Tests

Un test vérifie un comportement que le visiteur observe : ce qu'il voit, ce qu'il atteint au
clavier, ce qui part sur le réseau. Un test ne recopie pas le texte, le contenu de
`content.json` ni une valeur CSS exacte. Il ne fige pas un retrait (« should no longer … »).

- `tests/unit/` : l'interpréteur et les modules purs. `bun test tests/unit/`.
- `tests/browser/` : la page construite, dans Chromium. Lancer un spec ciblé, avec
  `--workers=1` sur une machine à 7 Go. La CI lance la suite complète.

## Mutations

Une mutation qui survit montre un comportement que rien ne vérifie. Lancer Stryker sur les
fichiers d'une MR, avant la revue :

```sh
bun run test:mutation --mutate src/interpret/consent.ts
```

Stryker est une dépendance de développement (`@stryker-mutator/core`). La CI ne lance pas la
mutation. Le rapport s'écrit dans `reports/mutation/mutation.html`. Stryker ne mute pas les
chaînes : un texte changé est un changement de contenu, pas un défaut.

`thresholds.break` vaut 72 dans `.config/stryker.config.json`. Le score mesuré vaut 77 %.
Sous 72 %, Stryker sort en erreur. Ne baisse pas ce seuil pour faire passer une MR : ajoute le
test qui tue le mutant. Monte le seuil quand le score monte.

`.config/stryker.config.json` nomme un `tsconfigFile` qui n'existe pas, et c'est voulu. Sans ce
faux chemin, Stryker réécrirait le tsconfig avec une API que TypeScript 7 n'a plus, puis
s'arrêterait.

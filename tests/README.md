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

Stryker n'est pas une dépendance : `bunx` le tire à la demande, et la CI ne l'installe pas.
Le rapport s'écrit dans `reports/mutation/mutation.html`. Stryker ne mute pas les chaînes :
un texte changé est un changement de contenu, pas un défaut.

`stryker.config.json` nomme un `tsconfigFile` qui n'existe pas, et c'est voulu. Stryker
réécrit sinon le tsconfig avec une API que TypeScript 7 n'a plus, et il s'arrête.

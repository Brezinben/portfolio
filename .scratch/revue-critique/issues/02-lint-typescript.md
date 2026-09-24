# Aucune règle TypeScript d'oxlint ne tourne

Status: ready-for-agent
Type: task

`plugins` dans `.oxlintrc.jsonc` remplace la liste par défaut, et `typescript` n'y est
pas. `oxlint --print-config` montre 0 règle `typescript/`. `typeAware` et
`oxlint-tsgolint` tournent donc pour rien. Par exemple, `no-floating-promises` est
éteinte, alors que `src/app.ts` a 8 promesses que rien n'attend.

## Correction attendue

- Ajouter `typescript` aux plugins, avec `no-floating-promises`
  (`allowForKnownSafeCalls` sur le paquet `node:test` exactement), `no-confusing-void-expression`,
  `strict-boolean-expressions`, `switch-exhaustiveness-check`,
  `prefer-nullish-coalescing`, `require-await`, `no-use-before-define` et
  `unicorn/no-negated-condition`. `method-signature-style` passe à off.
- Retirer `globals` : `umami` est mort, et `Alpine` est déclaré dans `app.ts`.
- `capitalized-comments` passe en error, car un warn ne bloque pas la CI.
- `apply()` devient un `switch` exhaustif.

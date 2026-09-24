# Des tests figent l'implémentation et des comportements n'ont aucun test

Status: ready-for-agent
Type: task

Un test vérifie un comportement que le visiteur voit. Il ne recopie ni le texte, ni le
contenu, ni une valeur CSS.

## Tests à supprimer

- `tests/browser/styles.spec.ts` et ses 33 instantanés (décision du porteur).
- Les tests vides : `interpret.test.ts:567` (ajouter une ligne à l'aide le laisse vert)
  et `:268`.
- Les tests qui figent un retrait (« should no longer … ») et les doublons de
  `contenu.spec` et de `harness.spec:9`.
- Les tests qui recopient du contenu ou une constante.

## Tests à réécrire

Positions de sprite en pixels, noms d'animation, couleurs `rgb` exactes, `flexDirection`,
`--radius`, `waitForTimeout` et sélecteurs BEM deviennent des assertions de comportement.

## Trous prouvés par des mutations qui survivent

| Mutant | Comportement non testé |
|---|---|
| M9 | `isSafeUrl` sur une URL invalide |
| M11 | `{text}` encodé dans un `mailto` |
| M14 | complétion d'une saisie faite d'espaces |
| M16 | « stack » ouvre la fiche stack dans `ask` |
| M22 | dédoublonnage d'`addMark` |
| M26 | « ouistiti » n'est pas un oui |
| M27 | filtre du second mot de la complétion |
| M28 | tri par rang de la recherche globale |

Aucun test navigateur ne couvre le contact (copie, `send-mail`, LinkedIn, GitHub), ni
le réseau de `/propose`.

## Outil

`bun run test:mutation` lance Stryker avec le runner `command` sur `bun test`, en local
seulement.

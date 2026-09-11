# Lot 5 — le châssis statique

Status: ready-for-agent
Type: task
Blocked by: 04

Les 121 attributs `style=` statiques. Le plus gros volume, le plus mécanique.

| Regroupement | Nombre |
|---|---|
| Zones | 6 |
| En-têtes de zone | 3 |
| Listes de zone | 2 |
| Attributs purement typographiques | 49 |
| Motifs répétés à l'identique | 11 motifs, 41 attributs |

Les motifs les plus rentables : `color:var(--acc-text)` (10 fois),
`margin:0;color:var(--fg2)` (5), `color:var(--acc)` (5), `color:var(--ok)` (4).

## Nommage

`CONTEXT.md` tranche : les documents parlent français, le code parle anglais. Les classes
sont du code.

**Ajouter le moins de noms possible.** La page porte déjà un vocabulaire de crochets —
`data-ctl`, `data-pane`, `data-result`, `data-journal`, `data-suggestion`,
`data-timeline`, `data-tree`, `data-status`, `data-gauge`, `data-boot`, `data-opts`,
`data-technote`, `data-track`, `data-handle`. Les règles de survol et de focus existantes
s'y appuient, et les tests aussi.

Le partage qui se défend en relecture :

- **Une classe pour ce qu'une chose *est*** : `.zone`, `.zone__head`, `.zone__list`.
- **Un `data-*` pour ce qu'une chose *fait*, ou pour son état** : `[data-ctl]`,
  `[aria-current]`, `[data-tone]`.

Trois noms nouveaux au lieu de quarante, aucun sélecteur de test cassé.

## Le piège : la cascade apparaît

Aujourd'hui aucun conflit n'est possible, chaque élément porte son style. Après quarante
règles, l'ordre du fichier décide. **Une règle par élément, pas d'utilitaires qui se
chevauchent.**

## Le contrat de construction

`tools/build.ts:63` : `SLIME_RULE = /background-position: 0 0;\n/u`. La regex **n'est pas
ancrée sur `.slime`**. Elle prend la première occurrence du fichier. Introduire
`background-position: 0 0` dans une règle placée avant `.slime` injecterait l'image
fusionnée au mauvais endroit, sans que le garde-fou voie rien. La mascotte disparaîtrait
dans `dist/` seulement.

`tests/browser/mascotte.spec.ts:37` lit `backgroundImage` et l'attrape — mais seulement
si on lance la suite navigateur.

## Vérification

`bun run test:browser` vert. `tests/browser/budget.spec.ts` une fois en fin de lot.

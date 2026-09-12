# Lot 5 — le châssis statique

Status: resolved
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

## Réponse

126 attributs et 474 déclarations au départ. **68 attributs et 156 déclarations restent.**
Deux tiers des déclarations ont quitté le balisage.

Trois noms nouveaux, comme prévu : `.zone`, `.zone__head`, `.zone__list`. Rien d'autre.
Tout le reste passe par une prise qui existait déjà, ou par la structure.

| Passe | Effet |
|---|---|
| Les six zones, trois en-têtes, deux listes | 11 attributs |
| La marge par défaut de `p`, `dl`, `dt`, `dd` | 28 déclarations, une règle |
| Les couleurs statiques qui sont des tons | 58 attributs allégés |
| Les 17 éléments qui avaient déjà une prise | 17 attributs |
| Cinq éléments atteignables par la structure | 5 attributs |

## Un défaut trouvé en chemin

**`[data-pane="out"]` rendait `block`, pas `flex`.** Sa déclaration `display:flex` vivait
en ligne, et `x-show` d'Alpine appelle `style.removeProperty("display")` à chaque
affichage : la déclaration était effacée à la première ouverture du volet. Depuis la
feuille, elle tient. Mesuré : la géométrie ne change pas, le volet se tenait déjà comme
voulu par accident.

C'est exactement la classe de défaut que ce chantier existe pour supprimer.

## Où je me suis arrêté, et pourquoi

Les 68 attributs restants portent une à trois déclarations, sur des `span` et des `div`
anonymes. Les sortir demanderait **d'inventer une soixantaine de sélecteurs**, ce que la
consigne de nommage de ce ticket refuse.

Un lot reste possible, et il demande une décision de vocabulaire :

> Huit attributs portent `color:var(--acc)` ou `color:var(--edge)` sur des glyphes
> décoratifs — la barre d'une jauge, les flèches d'une aide clavier. **Ce ne sont pas des
> tons** : un ton nomme la couleur d'un texte, et `acc` en ton donne `var(--acc-text)`.
> Il leur faudrait un second vocabulaire, et donc une entrée au glossaire.

**Question pour Benjamin : comment nommer la couleur d'un glyphe décoratif ?** Tant qu'elle
n'a pas de nom, ces huit attributs restent en ligne.

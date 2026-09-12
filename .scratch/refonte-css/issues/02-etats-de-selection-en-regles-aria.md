# Lot 2 — les états de sélection deviennent des règles ARIA

Status: resolved
Type: task
Blocked by: 01

Sept éléments encodent « sélectionné » dans une liaison `:style`. Chacun porte déjà
l'attribut ARIA qui dit la même chose. Le CSS peut lire ce que l'accessibilité expose.

| Élément | Attribut déjà présent |
|---|---|
| `[data-ctl="nav"]` sections | `:aria-current` |
| `[data-ctl="nav"]` missions | `:aria-current` |
| `[data-ctl="tl"]` | `:aria-selected` |
| `[data-ctl="tech"]` | `:aria-pressed` |
| `[data-suggestion]` | `:aria-selected` |
| `[data-ctl="opt"]` | `:aria-pressed` |
| `[data-toggle]` | `:aria-pressed` |

Zéro état nouveau à inventer.

## Le travail

Déplacer **uniquement** les déclarations qui dépendent de l'état vers des règles
`[aria-current="true"]`, `[aria-selected="true"]`, `[aria-pressed="true"]`. Le reste du
binding devient un `style=` statique.

Les deux blocs de 300 caractères des liaisons `nav` sections et `nav` missions sont
strictement identiques. Ils fusionnent en une règle.

Supprime 14 liaisons.

## Le piège, et il est silencieux

**Un `style=` en ligne bat toujours un sélecteur d'attribut, quelle que soit sa
spécificité.** Si `border-left:2px solid transparent` reste dans l'attribut statique, la
règle d'état ne s'appliquera jamais. La sélection disparaît sans erreur. Une relecture ne
l'attrape pas. L'instantané du ticket 01 l'attrape.

## Question à poser à Benjamin dans ce lot

`[data-ctl="nav"]` porte `transition:background .18s,border-color .18s` et une règle
`:hover`. `[data-ctl="tl"]` n'a ni l'un ni l'autre. Le canvas dit « reprendre ce qui a
été fait sur la partie parcours » : à la lettre, la `transition` disparaît. À trancher
avec lui, pas en silence.

## Vérification

`bun run test:browser` vert, instantané compris.

## Réponse

Fait. Huit liaisons retirées, les 18 instantanés passent sans être réécrits.

La question laissée ouverte est close, et elle n'avait plus lieu d'être : **ni
`[data-ctl="nav"]` ni `[data-ctl="tl"]` ne portent aujourd'hui de `transition` ou de règle
`:hover`.** Le plan citait un état du fichier antérieur au lot 1. Rien à aligner.

Deux écarts avec le plan, tous deux imposés par le piège qu'il décrivait lui-même :

1. **La déclaration entière descend dans la feuille**, pas seulement la part qui dépend de
   l'état. Laisser `border-left: 2px solid transparent` en ligne aurait fait taire la
   règle d'état.
2. **Le guide de la frise a perdu son style en ligne.** Il portait
   `style="color:var(--fg2)"`, qui battait la règle `[aria-selected="true"] [data-guide]`.
   Le défaut est passé en règle lui aussi.

Un nom nouveau : `data-toggle-value`, sur le libellé d'état d'une bascule. Il suit le
vocabulaire de crochets existant. **À verser au glossaire si le lot 5 le confirme.**

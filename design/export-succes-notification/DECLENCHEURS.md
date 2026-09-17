# Les trente succès et leurs déclencheurs

> Document de référence, pas de spécification d'implémentation. Les libellés sont des
> propositions ; les déclencheurs décrivent une intention observable, pas un appel de
> fonction. **Le projet a le dernier mot** : si un déclencheur ne correspond pas à ce que
> le code fait déjà, c'est le code qui a raison, et le succès qui change de formulation.

Un principe tient toute la liste : **un succès se déclenche sur une action que le
visiteur a voulue**. Rien ne se débloque en arrivant sur la page, rien ne se débloque au
bout d'un délai. C'est ce qui fait la différence entre une récompense et une décoration.

Deuxième principe : **un seul point d'accroche par famille**. Trente appels dispersés dans
le code deviennent trente dettes ; un répartiteur qui reçoit le nom de la commande et
demande « est-ce que ça débloque quelque chose ? » n'en fait qu'une.

## exploration

Accroche proposée : routeur de sections (`goSection`) et pages annexes — un compteur de sections vues suffit, pas besoin d'événement par section.

| # | icône | succès | déclencheur |
| --- | --- | --- | --- |
| 01 | `compass` | je pars à la découverte | première section ouverte |
| 02 | `map` | visite guidée | toutes les sections vues |
| 03 | `page` | lecture au clair | la version texte |
| 04 | `broken` | hors des sentiers | la page 404 |
| 05 | `palette` | les huit ambiances | les huit thèmes essayés |

## terminal

Accroche proposée : le répartiteur de commandes de `src/interpret.ts`, un seul point d'accroche pour toute la famille.

| # | icône | succès | déclencheur |
| --- | --- | --- | --- |
| 06 | `prompt` | première commande | une commande tapée, pas cliquée |
| 07 | `book` | le manuel | help |
| 08 | `list` | inventaire | ls |
| 09 | `tab` | les deux premières lettres | Tab complète une commande |
| 10 | `history` | déjà vu | ↑ rappelle l'historique |
| 11 | `broom` | table rase | clear |

## easter eggs

Accroche proposée : `SLASH_ONLY` / `EGGS` de `src/interpret.ts`, au même endroit que l'effet de la commande.

| # | icône | succès | déclencheur |
| --- | --- | --- | --- |
| 12 | `cow` | la vache parle | /cowsay |
| 13 | `smile` | rira bien | /joke |
| 14 | `shield` | non. | /sudo |
| 15 | `teapot` | je suis une théière | /coffee |
| 16 | `esc` | :q! ne marche pas ici | /vim |
| 17 | `matrix` | réveille-toi | /matrix |
| 18 | `sign` | mon nom dans un terminal | /benjamin |

## mascotte

Accroche proposée : la machine à états de la mascotte dans `src/app.ts` (humeurs, activités, évolution).

| # | icône | succès | déclencheur |
| --- | --- | --- | --- |
| 19 | `heart` | elle apprécie modérément | /slime expression · la caresser |
| 20 | `dumbbell` | six occupations | /slime activity — les six |
| 21 | `evolve` | métamorphose | /slime evolve |
| 22 | `boom` | mauvaise idée | /slime kill |
| 23 | `zzz` | bonne nuit | sleep |

## contact

Accroche proposée : les commandes de contact et de partage, même répartiteur que la famille terminal.

| # | icône | succès | déclencheur |
| --- | --- | --- | --- |
| 24 | `envelope` | adresse en poche | email — copie l'adresse |
| 25 | `bulb` | une idée en l'air | /propose |
| 26 | `share` | bonne parole | share |

## secrets

Accroche proposée : écouteur clavier global (konami, shift ×5), bannière console au chargement, et `shutdown`.

| # | icône | succès | déclencheur |
| --- | --- | --- | --- |
| 27 | `pad` | haut haut bas bas | konami — à venir |
| 28 | `glitch` | cliché de développeur | shift ×5 — mode développeur, à venir |
| 29 | `console` | qui regarde la console | bannière ASCII au chargement |
| 30 | `power` | extinction des feux | shutdown |

## Les quatre qui n'existent pas encore

Quatre déclencheurs de la liste décrivent des fonctionnalités absentes du dépôt au moment
où ce dossier est écrit : le konami, le mode développeur (shift ×5), la bannière console,
et `/slime kill`. Deux options, à trancher côté projet : les garder verrouillés comme
promesse, ou les retirer et ramener le total. **Ne pas les marquer débloqués par défaut**
— un succès qui s'obtient sans rien faire dévalue les vingt-six autres.

## Stockage

Un seul tableau de clés dans `localStorage`, pas un objet par succès. Trois raisons :
la lecture au démarrage est unique, la migration se fait en une passe si la liste change,
et un succès retiré du catalogue disparaît sans laisser d'orphelin.

La clé d'un succès est stable et indépendante de son libellé : renommer « rira bien » ne
doit pas re-verrouiller le succès chez les visiteurs qui l'avaient.

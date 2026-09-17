# Le catalogue, le stockage et le déblocage

Status: ready-for-agent
Type: task

Le socle. Rien ne se voit à la fin de ce ticket : un succès se débloque, il survit au
rechargement, et un test unitaire le prouve.

## Le catalogue

Il vit dans `src/interpret/achievements.ts`, au rang 0 : aucun import. C'est une donnée
pure, et le seam de l'interpréteur la teste sans navigateur.

Chaque entrée porte quatre champs : `key`, `icon`, `title`, `trigger`. La clé est stable
et indépendante du libellé. Renommer un titre ne re-verrouille personne.

| # | key | icon | titre | déclencheur |
| --- | --- | --- | --- | --- |
| 01 | `first-section` | `compass` | je pars à la découverte | première section ouverte |
| 02 | `all-sections` | `map` | visite guidée | toutes les sections vues |
| 03 | `text-version` | `page` | lecture au clair | la version texte |
| 04 | `not-found` | `broken` | hors des sentiers | la page introuvable |
| 05 | `all-themes` | `palette` | les huit ambiances | les huit thèmes essayés |
| 06 | `first-command` | `prompt` | première commande | une commande tapée, pas cliquée |
| 07 | `help` | `book` | le manuel | help |
| 08 | `ls` | `list` | inventaire | ls |
| 09 | `tab` | `tab` | les deux premières lettres | Tab complète une commande |
| 10 | `history` | `history` | déjà vu | ↑ rappelle l'historique |
| 11 | `clear` | `broom` | table rase | clear |
| 12 | `shutdown` | `power` | extinction des feux | shutdown |
| 13 | `cowsay` | `cow` | la vache parle | /cowsay |
| 14 | `joke` | `smile` | rira bien | /joke |
| 15 | `sudo` | `shield` | non. | /sudo |
| 16 | `coffee` | `teapot` | je suis une théière | /coffee |
| 17 | `vim` | `esc` | :q! ne marche pas ici | /vim |
| 18 | `matrix` | `matrix` | réveille-toi | /matrix |
| 19 | `name` | `sign` | mon nom dans un terminal | /benjamin |
| 20 | `expression` | `heart` | elle apprécie modérément | /slime expression · la caresser |
| 21 | `activities` | `dumbbell` | six occupations | les six activités du slime |
| 22 | `evolve` | `evolve` | métamorphose | /slime evolve |
| 23 | `kill` | `boom` | mauvaise idée | /slime kill |
| 24 | `sleep` | `zzz` | bonne nuit | sleep |
| 25 | `email` | `envelope` | adresse en poche | email — copie l'adresse |
| 26 | `propose` | `bulb` | une idée en l'air | /propose |
| 27 | `share` | `share` | bonne parole | share |

La famille « secrets » de `DECLENCHEURS.md` disparaît : elle ne gardait que `shutdown`,
qui rejoint la famille terminal. Les familles ne servent qu'à ranger le tableau ci-dessus
et ne portent aucun comportement. Ne pas les faire entrer dans le code.

## Le stockage

Une seule entrée `bd-term-achievements`, et un seul tableau de chaînes. Deux sortes
d'entrées y cohabitent :

- une **clé de succès** — le succès est acquis ;
- une **marque de progression** préfixée — `theme:<id>`, `act:<nom>`, `sec:<id>`.

Trois succès se calculent sur les marques : `all-sections` compte six `sec:`,
`all-themes` compte huit `theme:`, `activities` compte six `act:`.

La lecture filtre sur le catalogue et sur les trois préfixes connus. Une clé retirée du
catalogue disparaît sans laisser d'orphelin.

**Relire avant d'écrire.** La page 404 écrit depuis un autre onglet. Une écriture qui
part de l'état en mémoire l'écraserait.

Un stockage refusé ne casse rien : la visite compte ses succès en mémoire, comme
`persist()` le fait déjà pour les réglages.

## Les deux compteurs

`acquis` et `vu` sont deux nombres distincts. Les confondre supprime la relance du badge.
Le second n'est pas persisté séparément : **ouvrir la modale marque tout l'acquis comme
vu**, et le stockage garde un seul nombre — combien de succès avaient été vus à la
dernière ouverture.

## Les accroches

`submit()` est la seule accroche des commandes. Elle lit le nom canonique dans l'effet
`track("commande", { cmd })`, et les quatre succès de la mascotte sur le type des effets
rendus : `emote` avec `cmd === "slime"`, `activity`, `evolve`, `blowUp`.

Sept accroches restent, une ligne chacune :

| où | ce qu'elle marque |
| --- | --- |
| `goSection` | `sec:<id>`, puis `first-section` |
| `setTheme` | `theme:<id>` |
| `complete()` | `tab` |
| le rappel d'historique | `history` |
| la caresse de la mascotte | `expression` |
| `404.ts` | `not-found` — voir le ticket 06 |
| le script de `texte.html` | `text-version` — voir le ticket 06 |

## Le marquage

Deux événements Umami, pas vingt-sept. `succes` avec la clé en propriété au déblocage, et
`succes_ouverts` à l'ouverture de la modale, comme `options_ouvertes`. Le plan de marquage
vit dans le commit 424ac69, et dans aucun document.

## Le glossaire

`CONTEXT.md` reçoit deux entrées, dans la partie « Le contenu » :

- **Succès** (`achievement`) — ce qu'un visiteur débloque par une action voulue. Vingt-sept.
  Acquis et vu sont deux états différents. _Avoid_: trophée, badge, récompense.
- **Badge** (`badge`) — la coupe et le compteur du pied, qui ouvrent la liste des succès.
  Le trophée est son icône, jamais la chose. _Avoid_: trophée, coupe.

## Les tests

`tests/unit/` couvre le catalogue et le calcul : clés uniques, icônes toutes présentes
dans le sprite, les trois succès à compteur, le filtre de lecture, la migration d'une
entrée inconnue.

## Critère d'acceptation

Un succès obtenu le reste après rechargement. Son libellé change sans le re-verrouiller.
Aucun succès ne se débloque à l'arrivée sur la page.

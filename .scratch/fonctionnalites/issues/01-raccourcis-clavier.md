# Le lot des raccourcis clavier

Status: needs-info
Type: task

Fusionne six lignes de l'issue GitHub #2. Elles touchent toutes le même gestionnaire de
touches, et les séparer ferait six fois le même travail.

| Raccourci | Effet demandé |
|---|---|
| `meta + K` | Ouvrir une palette de commandes / recherche globale, comme le `/ask` |
| `?` | Afficher l'aide des raccourcis |
| `Esc` | Fermer une modale, une palette, un menu |
| `↑` `↓` | Naviguer dans une liste |
| `↑↑↓↓←→←→ B A` | Konami code |
| `Shift` × plusieurs fois | Mode développeur, plus un message dans la console |

## Ce qui existe déjà

À vérifier avant d'écrire quoi que ce soit. `src/app.ts` gère déjà des touches :
l'autocomplétion répond aux flèches, `optsKey($event)` gère la modale d'options.
**`↑` `↓` et `Esc` sont probablement déjà faits en partie.** Le lot doit d'abord
recenser, puis compléter, pas réécrire.

## Le point dur : `meta + K`

La palette est la seule vraie fonctionnalité neuve du lot. Les cinq autres raccourcis
sont des branchements. Une palette demande :
- Un index de ce qu'elle cherche. Les commandes seules, ou aussi le contenu des sections ?
- Un rendu. La boîte de suggestions existante peut servir de base.
- Une décision sur `/ask`, que la demande cite en modèle : la palette le remplace,
  le double, ou l'appelle ?

## Ce qui reste à préciser

`Shift` × plusieurs fois : combien de fois, et dans quel délai ? Et surtout, **que fait
le mode développeur ?** Afficher un message dans la console est le signal, pas l'effet.

## Une contrainte d'accessibilité

Un raccourci à une seule touche, comme `?`, doit pouvoir être désactivé ou ne se
déclencher que hors champ de saisie. Le site a un champ de saisie qui a le focus par
défaut. `?` s'y tape légitimement.

## Comments

**Benjamin, sur `↑` `↓`** — « Techniquement c'est déjà implémenté. Je voulais revoir le
comportement dans les listes, typiquement au niveau des stacks. Imaginons une première
famille "front end" sur trois lignes, le curseur est tout à droite, et la troisième ligne
ne contient qu'un seul élément. Ensuite "back end" a deux lignes, la première est pleine.
Ce que j'attends, c'est que la deuxième ligne du front end passe à la première ligne.
Aujourd'hui le curseur arrive sur le premier élément de la troisième ligne, et comme ils
ne sont pas alignés, l'utilisateur n'est plus sur la même colonne. **L'utilisateur se
déplace en colonne, et parfois ça le fait partir en diagonale. On ne veut pas.** »

**Benjamin, sur le mode développeur** — « Au lieu d'afficher un message, faire une sorte de
design de hacking : les caractères jouent une animation de changement d'encodage. On ne
comprend plus rien, c'est un cliché de développeur. Ça change l'encodage du site pendant
cinq secondes puis ça le remet. Les caractères passent par le point d'interrogation, le
carré, et cetera. »

### Ce que cela change

Le lot se scinde. Ce ne sont plus six branchements plus une palette.

| Point | État réel |
|---|---|
| `↑` `↓` navigation | **Fait, mais défectueux.** C'est un défaut de navigation, pas une fonctionnalité. Voir ci-dessous. |
| `Esc` | À vérifier, probablement fait |
| Mode développeur | **Ce n'est plus un message dans la console, c'est une animation.** Il passe en `needs-design`. |
| `meta + K`, `?`, Konami | Inchangés |

### Le défaut de navigation, énoncé en une phrase

> Dans une grille, `↓` doit garder la colonne. Aujourd'hui il tombe sur le premier élément
> de la ligne suivante quand cette ligne est plus courte.

`src/app.ts` porte déjà `themeColumns()` pour la grille des thèmes, qui résout ce problème
sur la modale. La grille des technologies, elle, coule en
`grid-template-columns: repeat(auto-fill, minmax(148px, 1fr))` : le nombre de colonnes
dépend de la largeur. **Le test doit poser la largeur de la fenêtre, sinon il ne prouve
rien.**

Ce défaut mérite son propre ticket. Il est reproductible, il se teste, et il ne dépend
d'aucun design.

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

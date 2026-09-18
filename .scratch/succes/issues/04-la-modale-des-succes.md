# La modale des succès

Status: ready-for-agent
Type: task
Blocked by: 03

La liste des vingt-sept, verrouillés compris. Le badge l'ouvre.

## Le châssis

Celui de la modale d'options, sans rien y ajouter : le voile en `position: fixed`, la
`.zone` centrée, `role="dialog"`, `aria-modal="true"`, un `@keydown` unique, et le clic
sur le voile qui ferme. `src/index.html:2109` porte le modèle.

## Une entrée de la liste

Trois colonnes : le rang sur deux chiffres, l'icône de 32 px, puis le titre et son
déclencheur.

Un succès verrouillé garde son rang, et prend l'icône `locked`. Son titre devient `???`.
Son sous-titre devient une suite de `???` **de longueur variable** : une liste de
longueurs identiques fait grille de mots croisés. La longueur se dérive de la clé, jamais
d'un tirage — un tirage au rendu change à chaque passe d'Alpine, et la ligne clignote.

## Les états, un signal chacun

| état | signal |
| --- | --- |
| survol | fond `--acc-soft` |
| focus | contour de 2 px en accent, `outline-offset: -2px`, jamais arrondi |

La barre de sélection à gauche du design n'est pas construite, et la gouttière de 2 px
non plus. Rien n'est sélectionnable dans cette liste. Voir la spec.

Aucune mise en avant du « nouveau » dans la liste. Le design l'a essayée et retirée : le
neuf se signale au badge, et là seulement.

## Le clavier

- Le focus **entre** dans la modale à l'ouverture. Sans cela, `échap` et `tab` restent à
  la page derrière.
- Les flèches parcourent la liste, comme celle des sections.
- `tab` boucle dans la modale.
- `échap` ferme et rend le focus au badge.

Vingt-sept entrées ne tiennent pas dans un écran court. La liste porte un plafond de
hauteur et défile, comme les blocs de commentaires du commit 3c8c547. **La flèche doit
ramener l'entrée focalisée dans la vue.**

## L'ouverture marque le vu

Ouvrir la modale marque tout l'acquis comme vu, et la relance du badge s'arrête. C'est le
seul endroit qui écrit ce compteur.

## Les tests

`tests/browser/` reçoit `succes.spec.ts` : l'entrée du focus, la boucle de `tab`, le
retour au badge, les flèches, et l'arrêt de la relance. `a11y.spec.ts` couvre déjà la
page ; la modale ouverte doit y entrer.

## Critère d'acceptation

Le focus entre dans la modale à l'ouverture et revient au badge à la fermeture. Aucune
violation axe sur la modale ouverte.

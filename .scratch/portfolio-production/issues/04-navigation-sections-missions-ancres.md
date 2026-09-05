# 04: Navigation : sections, missions, ancres

**What to build:** Un visiteur ouvre une section en tapant son nom, ou `cd <section>`, ou en la choisissant dans
le volet gauche. L'URL porte une ancre partageable, et le bouton retour du navigateur
fonctionne.

La première visite d'une section joue la commande avant d'afficher le résultat. Une section
déjà vue répond immédiatement : l'effet ne doit jamais devenir une attente.

**Blocked by:** 03

**Status:** ready-for-agent

- [x] `cd`, `bd`, `open`, et le nom de section seul ouvrent la section
- [x] Les six sections et les quatre missions sont accessibles
- [x] Chaque section et chaque mission a son ancre, du type `#parcours` ou `#m-kereis`
- [x] Le bouton retour du navigateur revient à la vue précédente
- [x] La première visite tape la commande puis affiche le résultat ; le retour est immédiat
- [x] Une barre d'accent ambre de 2 px marque l'élément actif
- [x] `j` et `k` changent de section, les flèches gauche et droite changent de volet
- [x] Les flèches haut et bas parcourent le volet courant
- [x] La position du focus est mémorisée par volet

## Précisions apportées en cours de route

Le critère d'origine parlait d'« une barre d'accent avec un caret sur la ligne
sélectionnée ». Il confondait deux éléments du vocabulaire visuel. Dans le canvas, les
entrées de navigation portent une pastille et une barre d'accent ; le caret `›` appartient
à la frise du parcours, donc au ticket 05.

Les flèches gauche et droite quittent la saisie **quand elle est vide**. Dès qu'un
caractère est tapé, elles redeviennent des déplacements de curseur dans le texte. Sans
cette nuance, une fois le focus dans le champ, plus aucune flèche ne rendait la main aux
volets.

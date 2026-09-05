# 04: Navigation : sections, missions, ancres

**What to build:** Un visiteur ouvre une section en tapant son nom, ou `cd <section>`, ou en la choisissant dans
le volet gauche. L'URL porte une ancre partageable, et le bouton retour du navigateur
fonctionne.

La première visite d'une section joue la commande avant d'afficher le résultat. Une section
déjà vue répond immédiatement : l'effet ne doit jamais devenir une attente.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] `cd`, `bd`, `open`, et le nom de section seul ouvrent la section
- [ ] Les six sections et les quatre missions sont accessibles
- [ ] Chaque section et chaque mission a son ancre, du type `#parcours` ou `#m-kereis`
- [ ] Le bouton retour du navigateur revient à la vue précédente
- [ ] La première visite tape la commande puis affiche le résultat ; le retour est immédiat
- [ ] Une barre d'accent ambre de 2 px marque l'élément actif, avec un caret sur la ligne sélectionnée
- [ ] `j` et `k` changent de section, les flèches gauche et droite changent de volet
- [ ] Les flèches haut et bas parcourent le volet courant
- [ ] La position du focus est mémorisée par volet

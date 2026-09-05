# 07: Modale d'options, thèmes et réglages persistés

**What to build:** Le visiteur clique sur `options`, en tête de la colonne de gauche. Une modale se superpose,
le focus arrive sur le thème actif, et les flèches gauche et droite changent la valeur du
réglage sous le focus. Le thème s'applique immédiatement, en se propageant en cercle depuis
le point cliqué.

Le réglage de taille du texte disparaît : il était annoncé dans la modale et n'a jamais rien
fait.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] Le bouton `options` est en tête de la colonne de gauche
- [ ] Le focus initial de la modale est sur le thème actif
- [ ] Les flèches gauche et droite changent la valeur, les flèches haut et bas changent de réglage
- [ ] `Tab` boucle dans la modale, `Échap` ferme et rend le focus au bouton
- [ ] Les réglages sont : thème, animations, volet de sortie, densité. Aucune taille de texte.
- [ ] Les huit thèmes sont présents : `dark` `light` `noctis` `azureus` `uva` `bordo` `lux` `hibernus`
- [ ] La transition part du point cliqué à la souris, du centre du bouton au clavier
- [ ] Le réglage « animations désactivées » coupe aussi la transition de thème
- [ ] Six clés sont persistées sous `bd-term-opts`, et la lecture filtre sur ces six clés
- [ ] `scale` et `booted` ne subsistent nulle part
- [ ] Les instructions de déplacement clavier figurent dans la modale

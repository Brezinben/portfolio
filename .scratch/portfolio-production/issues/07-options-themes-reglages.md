# 07: Modale d'options, thèmes et réglages persistés

**What to build:** Le visiteur clique sur `options`, en tête de la colonne de gauche. Une modale se superpose,
le focus arrive sur le thème actif, et les flèches gauche et droite changent la valeur du
réglage sous le focus. Le thème s'applique immédiatement, en se propageant en cercle depuis
le point cliqué.

Le réglage de taille du texte disparaît : il était annoncé dans la modale et n'a jamais rien
fait.

**Blocked by:** 02

**Status:** ready-for-agent

- [x] Le bouton `options` est en tête de la colonne de gauche
- [x] Le focus initial de la modale est sur le thème actif
- [x] Les flèches gauche et droite changent la valeur, les flèches haut et bas changent de réglage
- [x] `Tab` boucle dans la modale, `Échap` ferme et rend le focus au bouton
- [x] Les réglages sont : thème, animations, volet de sortie, densité. Aucune taille de texte.
- [x] Les huit thèmes sont présents : `dark` `light` `noctis` `azureus` `uva` `bordo` `lux` `hibernus`
- [x] La transition part du point cliqué à la souris, du centre du bouton au clavier
- [x] Le réglage « animations désactivées » coupe aussi la transition de thème
- [x] Six clés sont persistées sous `bd-term-opts`, et la lecture filtre sur ces six clés
- [x] `scale` et `booted` ne subsistent nulle part
- [x] Les instructions de déplacement clavier figurent dans la modale

## Deux défauts évités

Les réglages « volet de sortie » et « densité des lignes » étaient sur le point d'être
persistés sans agir sur quoi que ce soit — exactement le défaut de la taille du texte, que
ce chantier avait supprimé pour cette raison. Ils sont branchés : masquer le volet le retire
de la page, la densité compacte resserre l'interligne. Deux tests le vérifient.

Le gestionnaire clavier global traitait les mêmes flèches que la modale, et le focus
s'échappait de la boîte de dialogue. Le global se tait tant que la modale est ouverte.

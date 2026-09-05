# 13: Contrat de mise en page

**What to build:** La page ne grandit jamais au-delà de l'écran : c'est ce qui fait l'expérience terminale. Le
contenu reste collé en haut de son volet au lieu de s'étirer. Sur un écran très large, les
trois volets cessent de grandir et se centrent.

Le journal des commandes se redimensionne au glisser, et sa hauteur est conservée.

**Blocked by:** 05

**Status:** ready-for-agent

- [x] La hauteur est bornée à la hauteur disponible, et la page ne croît jamais
- [x] Le contenu est aligné en haut, jamais étiré
- [x] La session garde un plancher, et le journal cède la place en premier
- [x] Au-delà de 2400 px, les volets cessent de grandir et la mise en page se centre
- [x] À 900 px, les trois volets s'empilent en une colonne
- [x] Le journal se redimensionne au glisser par la poignée, entre 44 px et la place disponible
- [x] La hauteur du journal est conservée sur l'appareil et bornée à chaque redimensionnement de fenêtre
- [x] Les barres de défilement sont masquées et remplacées par un indicateur sur chaque volet
- [x] Le défilement reste fonctionnel à la molette et au clavier

## Note

La requête de média qui empile les volets sous 900 px vit dans la feuille de style. C'est la
seconde chose, après le survol et le focus, qui sort des styles inline — pour la même raison :
un navigateur ne sait pas exprimer une requête de média en attribut.

La poignée est aussi utilisable au clavier, flèches haut et bas par pas de 24 px, ce que le
canvas ne proposait pas : une poignée qui ne répond qu'à la souris est un contrôle inatteignable.

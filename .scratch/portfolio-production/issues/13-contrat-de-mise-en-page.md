# 13: Contrat de mise en page

**What to build:** La page ne grandit jamais au-delà de l'écran : c'est ce qui fait l'expérience terminale. Le
contenu reste collé en haut de son volet au lieu de s'étirer. Sur un écran très large, les
trois volets cessent de grandir et se centrent.

Le journal des commandes se redimensionne au glisser, et sa hauteur est conservée.

**Blocked by:** 05

**Status:** ready-for-agent

- [ ] La hauteur est bornée à la hauteur disponible, et la page ne croît jamais
- [ ] Le contenu est aligné en haut, jamais étiré
- [ ] La session garde un plancher, et le journal cède la place en premier
- [ ] Au-delà de 2400 px, les volets cessent de grandir et la mise en page se centre
- [ ] À 900 px, les trois volets s'empilent en une colonne
- [ ] Le journal se redimensionne au glisser par la poignée, entre 44 px et la place disponible
- [ ] La hauteur du journal est conservée sur l'appareil et bornée à chaque redimensionnement de fenêtre
- [ ] Les barres de défilement sont masquées et remplacées par un indicateur sur chaque volet
- [ ] Le défilement reste fonctionnel à la molette et au clavier

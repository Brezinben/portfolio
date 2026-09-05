# 14: Garanties d'accessibilité sur la page finie

**What to build:** Ticket de vérification, pas de construction. L'accessibilité est un critère d'acceptation
dans chaque ticket ; celui-ci balaie la page terminée et ferme les deux points laissés
ouverts par le design.

L'ambre du thème clair donne environ 2,2:1. La teinte ne change pas : elle a été choisie en
connaissance de cause. C'est l'usage qui se sépare en deux.

**Blocked by:** 05, 07, 08, 13

**Status:** ready-for-agent

- [ ] Un ambre décoratif et un ambre textuel sont distingués ; le texte passe le contraste sur les huit thèmes
- [ ] La teinte `#e6a000` est inchangée
- [ ] Le liseré de focus n'apparaît qu'au clavier
- [ ] Un moteur de règles automatique ne remonte aucune violation sur les huit thèmes
- [ ] `prefers-reduced-motion` et `prefers-color-scheme` sont respectés
- [ ] Les cibles font 44 px au minimum
- [ ] Tous les contrôles portent leurs attributs `aria-*`
- [ ] Toute l'interface est atteignable au clavier seul
- [ ] Le focus revient à son point de départ après la fermeture de la modale
- [ ] Le résultat d'une commande est annoncé aux lecteurs d'écran

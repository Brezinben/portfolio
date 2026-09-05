# 14: Garanties d'accessibilité sur la page finie

**What to build:** Ticket de vérification, pas de construction. L'accessibilité est un critère d'acceptation
dans chaque ticket ; celui-ci balaie la page terminée et ferme les deux points laissés
ouverts par le design.

L'ambre du thème clair donne environ 2,2:1. La teinte ne change pas : elle a été choisie en
connaissance de cause. C'est l'usage qui se sépare en deux.

**Blocked by:** 05, 07, 08, 13

**Status:** ready-for-agent

- [x] Un ambre décoratif et un ambre textuel sont distingués ; le texte passe le contraste sur les huit thèmes
- [x] La teinte `#e6a000` est inchangée
- [x] Le liseré de focus n'apparaît qu'au clavier
- [x] Un moteur de règles automatique ne remonte aucune violation sur les huit thèmes
- [x] `prefers-reduced-motion` et `prefers-color-scheme` sont respectés
- [x] Les cibles font 44 px au minimum
- [x] Tous les contrôles portent leurs attributs `aria-*`
- [x] Toute l'interface est atteignable au clavier seul
- [x] Le focus revient à son point de départ après la fermeture de la modale
- [x] Le résultat d'une commande est annoncé aux lecteurs d'écran

## Ce que le balayage a trouvé

Mesure d'abord : **seul le thème `light` échouait**, à 2,10:1. Les sept autres passaient
déjà. Le critère parlait des huit ; la correction n'en concernait qu'un. La teinte
décorative `#e6a000` est inchangée, et le texte prend `#8f5f00`, mesuré à 5,19:1.

Trois défauts trouvés par axe, invisibles à la lecture :

**La poignée de redimensionnement** portait `role="separator"` et le focus, sans annoncer
sa valeur. Un lecteur d'écran annonçait un séparateur sans dire ce qu'il réglait.

**Le sous-titre de la section active** tombait à 4,19:1, parce que le fond ambré de
l'élément sélectionné assombrit le panneau. Il passe en `--fg` quand la section est active.

**Deux zones défilantes** n'étaient pas atteignables au clavier. Le journal et le volet de
sortie deviennent focalisables et nommés.

Un quatrième défaut a été trouvé par les tests eux-mêmes, pas par axe : mon
`aria-label="Journal des commandes"` contenait « Commande », le nom accessible de la
saisie. Deux éléments répondaient au même nom. Le journal reprend le terme du glossaire.

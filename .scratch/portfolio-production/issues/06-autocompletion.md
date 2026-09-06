# 06: Autocomplétion

**What to build:** Le visiteur commence à taper, et une liste de propositions se déplie sous la saisie. Les
flèches changent de proposition, `Tab` complète, `Échap` referme. Au second mot, la liste ne
propose que ce qui a du sens pour la commande en cours.

**Blocked by:** 03

**Status:** ready-for-agent

- [x] Une fonction pure calcule les candidats, partagée par `Tab` et par la liste dépliante
- [x] Dix propositions au maximum, sans défilement
- [x] Les préfixes `/` et `:` sont reconnus et complétés
- [x] Second mot contextuel : sous-commandes après `slime`, sections et missions après `cd` `bd` `open`, cibles après `share`, thèmes après `theme`, rien après `cowsay` qui prend du texte libre
- [x] Troisième mot contextuel : humeurs après `slime mood`, activités après `slime activity`
- [x] Une ligne sous la liste décrit la proposition choisie, à chaque niveau
- [x] `Tab` complète jusqu'au plus long préfixe commun, puis liste les candidats restants
- [x] Le dépliement dure 220 ms, le repliement 170 ms depuis la base
- [x] La fermeture est déterministe, et la liste se vide dès que la saisie perd le focus
- [x] Le compteur de génération sur le minuteur de fermeture n'est pas réintroduit
- [x] node:test couvre le calcul des candidats, y compris la normalisation des espaces

## Note

Le calcul des candidats est partagé par `Tab` et par la liste dépliante, comme le voulait
le ticket : le canvas dupliquait cette logique à deux endroits, qui pouvaient diverger.

Les durées de dépliement et de repliement passent par les transitions d'Alpine plutôt que
par de nouvelles `@keyframes`. Les valeurs figées, 220 ms et 170 ms, sont respectées.

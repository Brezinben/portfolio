# 06: Autocomplétion

**What to build:** Le visiteur commence à taper, et une liste de propositions se déplie sous la saisie. Les
flèches changent de proposition, `Tab` complète, `Échap` referme. Au second mot, la liste ne
propose que ce qui a du sens pour la commande en cours.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] Une fonction pure calcule les candidats, partagée par `Tab` et par la liste dépliante
- [ ] Dix propositions au maximum, sans défilement
- [ ] Les préfixes `/` et `:` sont reconnus et complétés
- [ ] Second mot contextuel : humeurs après `slime`, sections et missions après `cd`, cibles après `share`, modes de tête après `cowsay`, rien après `ask`
- [ ] `Tab` complète jusqu'au plus long préfixe commun, puis liste les candidats restants
- [ ] Le dépliement dure 220 ms, le repliement 170 ms depuis la base
- [ ] La fermeture est déterministe, et la liste se vide dès que la saisie perd le focus
- [ ] Le compteur de génération sur le minuteur de fermeture n'est pas réintroduit
- [ ] node:test couvre le calcul des candidats, y compris la normalisation des espaces

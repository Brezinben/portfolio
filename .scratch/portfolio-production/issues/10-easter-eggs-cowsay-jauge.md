# 10: Easter eggs, cowsay et jauge de contexte

**What to build:** Le visiteur qui explore trouve des commandes cachées. `cowsay` se comporte comme l'original,
avec ses arguments et ses modes de tête. La jauge de la barre d'état monte à chaque commande,
et se vide avec une compaction ironique quand elle est pleine.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] Les commandes `joke` `wtf` `sudo` `coffee` `vim` `pet` `matrix` `benjamin` et son alias `brezinben` répondent
- [ ] `slime <humeur>` pilote la mascotte, `shutdown` et `reboot` éteignent puis rejouent le boot
- [ ] `cowsay` fait un retour à la ligne adaptatif à la largeur du volet
- [ ] La bulle change de forme selon le nombre de lignes
- [ ] Les huit modes de tête fonctionnent : `-b` `-d` `-g` `-p` `-s` `-t` `-w` `-y`
- [ ] `cowthink` rend la bulle de pensée
- [ ] Le drapeau préformaté par ligne conserve les espaces multiples, et l'art ASCII reste intact
- [ ] Les ligatures restent désactivées, sans quoi les traits se recomposent
- [ ] La jauge monte à chaque commande et à chaque changement de section
- [ ] À 100 %, la compaction s'affiche, puis un résumé ironique, puis la jauge repart à zéro

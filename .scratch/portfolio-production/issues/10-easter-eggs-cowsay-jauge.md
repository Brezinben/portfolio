# 10: Easter eggs, cowsay et jauge de contexte

**What to build:** Le visiteur qui explore trouve des commandes cachées. `cowsay` se comporte comme l'original,
avec ses arguments et ses modes de tête. La jauge de la barre d'état monte à chaque commande,
et se vide avec une compaction ironique quand elle est pleine.

**Blocked by:** 03

**Status:** ready-for-agent

- [x] Les commandes `joke` `wtf` `sudo` `coffee` `vim` `pet` `matrix` `benjamin` et son alias `brezinben` répondent
- [x] `slime <humeur>` pilote la mascotte, `shutdown` et `reboot` éteignent puis rejouent le boot
- [x] `cowsay` fait un retour à la ligne adaptatif à la largeur du volet
- [x] La bulle change de forme selon le nombre de lignes
- [x] Les huit modes de tête fonctionnent : `-b` `-d` `-g` `-p` `-s` `-t` `-w` `-y`
- [x] `cowthink` rend la bulle de pensée
- [x] Le drapeau préformaté par ligne conserve les espaces multiples, et l'art ASCII reste intact
- [x] Les ligatures restent désactivées, sans quoi les traits se recomposent
- [x] La jauge monte à chaque commande et à chaque changement de section
- [x] À 100 %, la compaction s'affiche, puis un résumé ironique, puis la jauge repart à zéro

## Note

`cowsay` vit dans le module pur : la bulle, le retour à la ligne et les huit modes de tête
se testent sans navigateur, et huit tests unitaires les couvrent. Seul le nombre de colonnes
vient de la page, mesuré sur la largeur du volet.

La sortie a été comparée à l'original ligne à ligne. La ligne de la langue était décalée
d'un caractère à ma première tentative.

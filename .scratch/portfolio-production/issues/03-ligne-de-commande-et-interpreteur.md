# 03: La ligne de commande et l'interpréteur

**What to build:** Un visiteur tape `ls`, `help` ou `wtf` et voit le résultat apparaître dans le volet central.
La commande rejoint le journal, et la flèche haut la rappelle.

Ce ticket installe le seam deux : `interpret(entrée, contexte)` rend `{ lignes, effets }`. Les
effets sont des descripteurs — naviguer, marquer, dire, copier, ouvrir, minuter — et la
coquille les applique. Les 29 commandes passent toutes par ce point unique, y compris celles
qui n'ont aucun effet pur, pour que le dispatch ne vive jamais à deux endroits.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] `interpret()` est synchrone : elle ne touche pas au DOM, ne fait aucun `fetch`, ne pose aucun minuteur
- [ ] Les 29 branches passent par le point de dispatch unique
- [ ] `cowsay` reçoit la largeur du volet par le contexte, jamais en la mesurant
- [ ] `ask` et `ai` rendent leur partie pure en lignes, et l'appel asynchrone en effet
- [ ] node:test couvre `ls`, `help`, `wtf`, `vim`, `sudo`, `coffee`, `pet`, `sleep`, `benjamin` et la commande inconnue
- [ ] La flèche haut rappelle d'abord la commande de la section courante, puis l'historique
- [ ] Les commandes ne s'empilent pas
- [ ] Le résultat apparaît par bloc, jamais ligne à ligne, jamais lettre à lettre
- [ ] La latence d'exécution est de 20 ms, la frappe à 52 caractères par seconde
- [ ] Les espaces multiples sont normalisés en un seul

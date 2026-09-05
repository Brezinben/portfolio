# 03: La ligne de commande et l'interpréteur

**What to build:** Un visiteur tape `ls`, `help` ou `wtf` et voit le résultat apparaître dans le volet central.
La commande rejoint le journal, et la flèche haut la rappelle.

Ce ticket installe le seam deux : `interpret(entrée, contexte)` rend `{ lignes, effets }`. Les
effets sont des descripteurs — naviguer, marquer, dire, copier, ouvrir, minuter — et la
coquille les applique. Les 29 commandes passent toutes par ce point unique, y compris celles
qui n'ont aucun effet pur, pour que le dispatch ne vive jamais à deux endroits.

**Blocked by:** 02

**Status:** ready-for-agent

- [x] `interpret()` est synchrone : elle ne touche pas au DOM, ne fait aucun `fetch`, ne pose aucun minuteur
- [x] Les 29 branches passent par le point de dispatch unique
- [x] `cowsay` reçoit la largeur du volet par le contexte, jamais en la mesurant
- [ ] `ask` et `ai` rendent leur partie pure en lignes, et l'appel asynchrone en effet
- [x] node:test couvre `ls`, `help`, `wtf`, `vim`, `sudo`, `coffee`, `pet`, `sleep`, `benjamin` et la commande inconnue
- [x] La flèche haut rappelle d'abord la commande de la section courante, puis l'historique
- [x] Les commandes ne s'empilent pas
- [ ] Le résultat apparaît par bloc, jamais ligne à ligne, jamais lettre à lettre
- [ ] La latence d'exécution est de 20 ms, la frappe à 52 caractères par seconde
- [x] Les espaces multiples sont normalisés en un seul

## Ce qui reste, et pourquoi

Trois critères attendent d'autres tickets.

L'apparition par bloc et la latence de 20 ms accompagnent l'animation de frappe de la
commande de section : elle appartient au ticket 04, qui gère la première visite d'une
section. Le rendu est aujourd'hui immédiat.

`ask` et `ai` rendent bien un descripteur d'effet, mais leur partie pure — la recherche
locale et le diagnostic du modèle — arrive avec les tickets 12 et suivants.

## Contrat retenu

`interpret(entrée, contexte) → { lignes, effets }`. Les lignes portent des noms de tons
(`fg`, `fg2`, `acc`, `ok`, `warn`) et non des variables CSS : le module reste sans
présentation, et les tests s'écrivent sans connaître le thème.

Les effets sont des descripteurs : `navigate`, `clear`, `replay`, `say`, `emote`, `track`,
`state`, `matrix`, `power`, `drop`, `send`, plus un descripteur par commande déléguée à un
ticket ultérieur. La coquille applique ce qu'elle sait faire et ignore le reste, plutôt que
de le simuler.

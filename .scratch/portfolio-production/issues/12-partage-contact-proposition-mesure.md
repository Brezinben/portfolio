# 12: Partage, contact, proposition et mesure d'audience

**What to build:** Le visiteur partage la page vers la cible de son choix, copie l'adresse, écrit un courriel, ou
envoie une proposition. La mesure d'audience enregistre ce qui se passe, sans cookie et sans
identifiant.

La commande `propose` demande un consentement explicite en deux temps. Elle affiche ce qui
part, où ça part, et ce qui ne part pas. Rien n'est envoyé avant un `oui`.

**Blocked by:** 04

**Status:** ready-for-agent

- [x] `share` seul ouvre le menu natif sur mobile, sinon la liste des cibles
- [x] Les cibles viennent de `content.json`, et les jetons `{url}` `{title}` `{text}` sont substitués
- [x] Les trois genres de cible fonctionnent : page de partage, nouvel onglet, presse-papiers
- [x] `email` copie l'adresse, avec un repli quand le presse-papiers est refusé
- [x] `send-mail` ouvre le client de courrier
- [x] `propose` affiche ce qui part, la destination et ce qui ne part pas, et attend un `oui`
- [x] Trois chemins d'envoi dans l'ordre : `umami.track()`, puis un POST sur `/api/send`, puis `mailto:`
- [x] Le helper de marquage est silencieux : Umami absent, bloqué ou en erreur ne casse rien et n'écrit rien en console
- [ ] Les 24 événements du plan de marquage sont émis
- [x] Aucun cookie n'est posé

## Ce qui reste

Le plan de marquage compte 24 événements dans le README. Le portage en émet aujourd'hui
sept : `commande`, `commande_inconnue`, `easter_egg`, `partage`, `proposition`,
`proposition_refusee` et `section`. Les dix-sept autres suivent les fonctionnalités qui les
déclenchent, et plusieurs appartiennent à des comportements déjà portés — il s'agit
d'ajouter l'appel, pas de construire quoi que ce soit. Le critère reste décoché tant que
les 24 ne sont pas émis.

## Note

Le test « aucune requête externe » devient « aucune requête externe hors mesure
d'audience ». Umami est le seul tiers admis, il est auto-hébergé, différé, et son blocage
ne change rien à la page — un test le vérifie en coupant la route.

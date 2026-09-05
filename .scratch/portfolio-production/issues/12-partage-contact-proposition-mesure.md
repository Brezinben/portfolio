# 12: Partage, contact, proposition et mesure d'audience

**What to build:** Le visiteur partage la page vers la cible de son choix, copie l'adresse, écrit un courriel, ou
envoie une proposition. La mesure d'audience enregistre ce qui se passe, sans cookie et sans
identifiant.

La commande `propose` demande un consentement explicite en deux temps. Elle affiche ce qui
part, où ça part, et ce qui ne part pas. Rien n'est envoyé avant un `oui`.

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] `share` seul ouvre le menu natif sur mobile, sinon la liste des cibles
- [ ] Les cibles viennent de `content.json`, et les jetons `{url}` `{title}` `{text}` sont substitués
- [ ] Les trois genres de cible fonctionnent : page de partage, nouvel onglet, presse-papiers
- [ ] `email` copie l'adresse, avec un repli quand le presse-papiers est refusé
- [ ] `send-mail` ouvre le client de courrier
- [ ] `propose` affiche ce qui part, la destination et ce qui ne part pas, et attend un `oui`
- [ ] Trois chemins d'envoi dans l'ordre : `umami.track()`, puis un POST sur `/api/send`, puis `mailto:`
- [ ] Le helper de marquage est silencieux : Umami absent, bloqué ou en erreur ne casse rien et n'écrit rien en console
- [ ] Les 24 événements du plan de marquage sont émis
- [ ] Aucun cookie n'est posé

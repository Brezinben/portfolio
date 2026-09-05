# 09: États de démarrage et écran de panique

**What to build:** Quand `content.json` tarde, l'écran de boot reste affiché. Quand il ne charge pas, ou qu'il
est malformé, le visiteur voit une panique Go, avec un bouton `retry` et un lien vers la
version texte.

La page ne se rabat jamais silencieusement sur un contenu figé : le visiteur doit savoir que
le contenu n'a pas chargé.

**Blocked by:** 02, 11

**Status:** ready-for-agent

- [x] Le boot reste affiché tant que le contenu n'est pas arrivé
- [x] Un contenu malformé est détecté après analyse, et la clé fautive est nommée
- [x] L'écran d'échec imite une panique Go : `panic: content.json not found`, goroutine, `boot.go:42`, cause exacte
- [x] La phrase sur le JSON qui vit sa vie est conservée verbatim
- [x] Le bouton `retry` relance le chargement
- [x] Le lien vers `texte.html` résout
- [x] Les tests couvrent quatre cas : contenu valide, absent, malformé, lent
- [ ] L'écran de boot s'affiche même quand les animations sont désactivées ; seul le fondu de sortie dépend du réglage

## Défaut corrigé au passage

Le canvas pose `aria-hidden="true"` sur tout l'écran de démarrage. Cela convient au journal
de boot, qui est décoratif. Mais l'écran de panique vit dans le même conteneur : un lecteur
d'écran n'entendait donc ni le message d'erreur, ni le bouton `retry`, ni le lien vers la
version texte — les seules issues offertes au visiteur.

Le portage sépare les deux. Le journal de boot reste `aria-hidden`. L'écran de panique
devient un `role="alert"` exposé, et ses deux commandes sont atteignables.

Le dernier critère attend le ticket 07 : le réglage « animations » n'existe pas encore, donc
son effet sur l'écran de boot ne peut pas être vérifié.

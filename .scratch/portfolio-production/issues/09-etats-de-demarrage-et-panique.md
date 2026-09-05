# 09: États de démarrage et écran de panique

**What to build:** Quand `content.json` tarde, l'écran de boot reste affiché. Quand il ne charge pas, ou qu'il
est malformé, le visiteur voit une panique Go, avec un bouton `retry` et un lien vers la
version texte.

La page ne se rabat jamais silencieusement sur un contenu figé : le visiteur doit savoir que
le contenu n'a pas chargé.

**Blocked by:** 02, 11

**Status:** ready-for-agent

- [ ] Le boot reste affiché tant que le contenu n'est pas arrivé
- [ ] Un contenu malformé est détecté après analyse, et la clé fautive est nommée
- [ ] L'écran d'échec imite une panique Go : `panic: content.json not found`, goroutine, `boot.go:42`, cause exacte
- [ ] La phrase sur le JSON qui vit sa vie est conservée verbatim
- [ ] Le bouton `retry` relance le chargement
- [ ] Le lien vers `texte.html` résout
- [ ] Les tests couvrent quatre cas : contenu valide, absent, malformé, lent
- [ ] L'écran de boot s'affiche même quand les animations sont désactivées ; seul le fondu de sortie dépend du réglage

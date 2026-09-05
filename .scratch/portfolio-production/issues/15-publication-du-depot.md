# 15: Publication du dépôt

**What to build:** Le code part sur GitHub, en public. Le dépôt porte le portfolio, sa conception gelée, ses
décisions et ses tests.

**Blocked by:** 14

**Status:** ready-for-agent

- [x] Le dépôt est `Brezinben/portfolio`, public
- [x] Il contient `production/`, `design/` gelé, `DECISIONS.md`, `CONTEXT.md`, `docs/`, le spec et les tests
- [x] `design/uploads/`, `design/_ds/` et `design/.thumbnail` sont exclus
- [ ] Le pseudo est écrit `Brezinben` partout où il est affiché, y compris dans `content.json`
- [x] Le README explique comment lancer les deux seams et comment déployer `production/`
- [x] Aucun secret et aucune donnée d'employeur ne figure dans l'historique

## Reste à faire

Le pseudo est écrit `brezinben` en minuscules dans `content.json`, alors que le compte
s'appelle `Brezinben`. GitHub est insensible à la casse dans ses URL, donc le lien
fonctionne, mais l'affichage diverge du compte réel. C'est une correction de contenu, pas
de code : elle se fait dans `content.json` sans redéployer.

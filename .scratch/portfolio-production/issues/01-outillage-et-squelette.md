# 01: Outillage et squelette

**What to build:** Un développeur clone le dépôt, lance deux commandes, et les deux marchent : les tests
tournent, le linter passe. C'est le seul prefactor du lot, et tout le reste en dépend.

`production/` reste sans dépendance et sans étape de construction. Les outils servent au
développement uniquement : on doit pouvoir copier `production/` sur un serveur statique sans
jamais lancer npm.

**Blocked by:** Aucun (peut démarrer immédiatement)

**Status:** ready-for-agent

- [x] `package.json` existe, et toutes les dépendances sont dans `devDependencies`
- [x] `oxlintrc.json` est réécrit pour un projet navigateur : `unicorn`, `oxc`, `promise`, `import`
- [x] `typeAware`, `jsx-a11y`, `nextjs`, `react`, `react-perf` et le greffon `anti-slop` sont retirés
- [x] Les motifs ignorés `.next/**`, `.specify/**` et `app/tokens/**` sont retirés
- [x] `oxfmt` formate le projet sans diff résiduel
- [x] `node --test` s'exécute et rapporte zéro échec
- [x] Playwright est installé, avec un serveur statique qui sert `production/`
- [x] Une commande unique lance chaque seam, et le README les documente
- [x] `production/` ne contient aucune dépendance ni artefact de construction

# 02: Balle traçante : le boot et une section

**What to build:** Un visiteur ouvre `production/index.html` dans un navigateur. Le terminal démarre, la barre
de progression se remplit, l'écran de boot s'efface en fondu, et la section `whoami`
s'affiche avec son contenu lu dans `content.json`.

C'est la balle traçante : une seule section, mais elle traverse toutes les couches. Page
autonome, Alpine, polices locales, contenu externe, test de bout en bout, budget de poids.
Ce ticket porte la coquille à trois volets et la séquence de boot, soit environ 40 % du
gabarit.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] `production/index.html` est du HTML autonome : plus de `x-dc`, plus de `helmet`, plus de `support.js`
- [ ] Alpine est épinglé à une version exacte et servi depuis `production/`, jamais depuis un CDN
- [ ] JetBrains Mono 400 et 700 sont auto-hébergées, sous-ensemble, avec `font-display: swap`
- [ ] Aucune requête vers Google Fonts, aucune `Noto Sans Symbols 2`, aucune italique
- [ ] `content.json` est chargé par `fetch` relatif et doit être à côté de la page
- [ ] Le boot est plein cadre, jamais un squelette, et dure au minimum 2000 ms
- [ ] La barre de progression est en blocs et se remplit en 100 ms
- [ ] La sortie du boot est un fondu croisé de 620 ms
- [ ] `whoami` s'affiche avec ses lignes issues de `content.json`
- [ ] Les trois volets sont présents, coins carrés, rayon `0` partout
- [ ] Un test échoue si le premier chargement dépasse 150 Ko transférés après compression
- [ ] La page n'embarque aucun repli de contenu en dur
- [ ] Ni `startSection` ni `holdBootScreen` ne subsistent

# 11: Version texte et fichiers servis

**What to build:** Un visiteur ouvre `texte.html` et lit tout le contenu en une colonne, sans script, sans
image, sans animation. C'est aussi la cible du lien de secours de l'écran de panique.

Ce ticket met en place les fichiers que `production/` doit servir à côté des deux pages.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] `texte.html` est autonome : plus de `x-dc`, plus de `helmet`, plus de `support.js`
- [ ] Une seule colonne, police à empattements, aucun script, aucune image, aucune animation
- [ ] Le lien vers `index.html` résout
- [ ] `llms.txt`, `share.png` et le CV sont servis depuis `production/`
- [ ] La commande `cv` ouvre le CV servi
- [ ] `share.png` est atteignable à la racine du domaine, en `og:image` de 1200 × 630
- [ ] Les métadonnées Open Graph et l'URL canonique sont présentes sur les deux pages

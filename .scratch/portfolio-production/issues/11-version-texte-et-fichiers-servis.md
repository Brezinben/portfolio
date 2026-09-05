# 11: Version texte et fichiers servis

**What to build:** Un visiteur ouvre `texte.html` et lit tout le contenu en une colonne, sans
script, sans image, sans animation. C'est aussi la cible du lien de secours de l'écran de
panique.

Ce ticket met en place les fichiers que `production/` doit servir à côté des deux pages.

**Blocked by:** 01

**Status:** ready-for-agent

- [x] `texte.html` est autonome : plus de `x-dc`, plus de `helmet`, plus de `support.js`
- [x] Une seule colonne, police à empattements, aucun script, aucune image, aucune animation
- [x] Le lien vers `index.html` porte la bonne cible — la page arrive avec le ticket 02
- [x] `llms.txt` et `share.png` sont servis depuis `production/`
- [x] `share.png` est déclaré en `og:image` de 1200 × 630
- [x] Les métadonnées Open Graph et l'URL canonique sont présentes sur cette page
- [x] Aucun lien ne pointe vers un fichier du canvas — vérifié par test

## Correction apportée en cours de route

Deux critères d'origine reposaient sur une erreur : ils supposaient qu'un CV en PDF était
servi et ouvert par la commande `cv`.

C'est faux. La commande `cv` ouvre **la version texte**, décrite comme « imprimable en PDF »
(canvas, ligne 2863). `design/uploads/Profile.pdf` n'est référencé nulle part : c'est un
fichier de travail du canvas, et il part avec `uploads/`.

Aucun PDF n'est donc servi. Le spec impose de préserver le comportement sans l'étendre. Un
CV téléchargeable est une fonctionnalité à décider, pas un portage — à trancher par Benjamin.
Le comportement de la commande `cv` elle-même appartient au ticket 03.

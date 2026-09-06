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

## Reprise : la page devient un document, et elle suit le thème

Le critère « aucun script » visait la fragilité : la version texte est le repli, elle ne doit
dépendre d'aucun code. Il a été lu comme une interdiction du langage.

Deux besoins l'ont rouvert. La page s'adresse d'abord à un lecteur d'écran : le balisage doit
porter la structure, pas des `<div>` stylées en ligne. Et elle doit reprendre le thème choisi
sur la version terminal, sans proposer de sélecteur — la personne a déjà choisi, ou elle
imprime.

Le thème vit dans `localStorage`. Aucune règle CSS ne sait le lire. Le critère devient donc :

- [x] Aucune image, aucune ressource externe, aucune animation
- [x] Un seul script, en tête, qui pose `data-theme` et ne fait rien d'autre
- [x] La page reste entière sans JavaScript : `light-dark()` donne le thème système
- [x] Les huit thèmes de la version terminal s'appliquent, contrastes vérifiés par axe
- [x] Repères de navigation, un seul `h1`, aucun niveau de titre sauté
- [x] Changements de langue déclarés, dates en `<time>`, paires clé/valeur en `<dl>`
- [x] Atkinson Hyperlegible Next, auto-hébergée, sous SIL Open Font License 1.1
- [x] Une feuille d'impression : fond blanc, URL des liens, aucune mission coupée
- [x] Le contenu suit `content.json`, fiches techno comprises

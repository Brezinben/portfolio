# 02: Balle traçante : le boot et une section

**What to build:** Un visiteur ouvre `production/index.html` dans un navigateur. Le terminal
démarre, la barre de progression se remplit, l'écran de boot s'efface en fondu, et la section
`whoami` s'affiche avec son contenu lu dans `content.json`.

C'est la balle traçante : une seule section, mais elle traverse toutes les couches. Page
autonome, Alpine, polices locales, contenu externe, test de bout en bout, budget de poids.

**Blocked by:** 01

**Status:** ready-for-agent

- [x] `production/index.html` est du HTML autonome : plus de `x-dc`, plus de `helmet`, plus de `support.js`
- [x] Alpine est épinglé à une version exacte et servi depuis `production/`, jamais depuis un CDN
- [x] JetBrains Mono est auto-hébergée, sous-ensemble, avec `font-display: swap`
- [x] Aucune requête vers Google Fonts, aucune `Noto Sans Symbols 2`, aucune italique
- [x] `content.json` est chargé par `fetch` relatif et doit être à côté de la page
- [x] Le boot est plein cadre, jamais un squelette, et dure au minimum 2000 ms
- [x] La barre de progression est en blocs et se remplit en 100 ms
- [x] La sortie du boot est un fondu croisé de 620 ms
- [x] `whoami` s'affiche avec ses lignes issues de `content.json`
- [x] Les trois volets sont présents, et le vocabulaire visuel du canvas est conservé
- [x] Un test échoue si le premier chargement dépasse 150 Ko transférés après compression
- [x] La page n'embarque aucun repli de contenu en dur
- [x] Ni `startSection` ni `holdBootScreen` ne subsistent

## Mesure obtenue

| Ressource | Poids transféré |
|---|---|
| `index.html` | 7,9 Ko |
| `vendor/alpine.js` | 19,7 Ko |
| `content.json` | 6,9 Ko |
| `fonts/jetbrains-mono.woff2` | 18,6 Ko |
| **Total** | **53,1 Ko** sur 150 |

Le canvas transférait environ 540 Ko pour la même page.

## Corrections apportées en cours de route

Un critère d'origine exigeait « coins carrés, rayon `0` partout ». C'est une lecture trop
littérale de `DECISIONS.md` §4.1. Le canvas applique un rayon de 12 px aux panneaux, et
`0` aux éléments interactifs, aux survols et aux focus. Le canvas est la référence visuelle
validée : le portage le reproduit tel quel, et le critère devient « le vocabulaire visuel du
canvas est conservé ».

La police est **variable** : un seul fichier couvre 400 et 700. Le critère parlait de deux
graisses auto-hébergées ; c'est un fichier, pas deux.

## Ce que ce ticket ne livre pas

La modale d'options, le journal, la mascotte, la ligne de saisie et la barre d'état ne sont
pas dans la page : ils appartiennent aux tickets 07, 03, 08 et 10. Le bouton `options` est
présent mais désactivé, et la navigation entre sections fonctionne déjà.

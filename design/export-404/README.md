# Page 404 — export prêt à committer

Pour l'issue `.scratch/en-attente-de-design/issues/03-page-404-interactive.md`.

## Contenu

| fichier | destination proposée dans le dépôt |
| --- | --- |
| `404.html` | `src/404.html` |
| — | `src/assets/sprites/slime/slime-load.png` (déjà présent) |
| — | `src/assets/sprites/slime/slime-happy.png` (déjà présent) |

Aucune nouvelle image : la page réutilise deux feuilles déjà embarquées.

## Ce que la page fait

- Panneau unique qui reprend le rôle du pane `main` : mêmes bordures, mêmes barres
  haut / bas, même pied `~/404 main`.
- Transcript d'un `cd` échoué. Le chemin affiché vient de `location.pathname`,
  décodé, tronqué à 52 caractères avec `…` — la query string n'est pas affichée.
- Mascotte à l'état `load` (réflexion · chargement, 16 frames / 1,6 s) : le slime
  cherche. Au clic, `happy` (20 frames, une passe) puis retour à `load`.
- Trois sorties : `/`, `/texte.html` et un `mailto` pour signaler un lien mort.

## Conventions reprises de `src/` (relevées dans le dépôt, pas dans la maquette)

- **Police auto-hébergée** : `@font-face` sur `/assets/fonts/jetbrains-mono.woff2`,
  `font-weight: 400 800`, `font-display: swap`, préchargée. Aucun appel à Google Fonts.
- **`--radius: 5px`**, pas 12 px : la valeur unique des six zones de l'accueil.
- **`--acc-text`** : l'ambre décoratif (`--acc`) habille les glyphes et les barres,
  l'ambre textuel (`--acc-text`) colore le texte — dont `#8f5f00` sur le thème clair.
  Liens, chiffres du 404, `ls`, `help`, `cd ~`, `main` et le curseur le prennent.
- **Structure** : `[data-panes]` (max-width 2400px) → `section.zone[data-pane="main"]`,
  en-tête `.zone__head` (9px 12px, 11px, `.12em`), `footer` hors de la zone, sans
  bordure, `padding: 0 4px`, 12 px, `white-space: nowrap`.
- **Jetons de volet** `--pane-flex` / `--pane-min` et bascule à 900 px.
- **Curseur** : `_`, `caret 1s steps(1) infinite`, en `--acc-text`.
- **Corps** : `padding: 14px clamp(12px, 2.5vw, 26px)`, `font-size: 14px`,
  `line-height: 1.6`, `gap: 10px`, `p { margin: 0 }`, `::selection` en `--acc-soft`.
- **Mascotte** : classes `.slime--load` / `.slime--happy` aux specs de `src/index.html`
  (×2, 64 px, `background-position-x`, `steps(16)` / `steps(20)`), `hue-rotate` par
  thème (noctis 117deg, azureus 163deg, uva 205deg, bordo 306deg).
- **Mouvement** : `data-anim="false"` (même vocabulaire que `.tm[data-anim]`) et
  `prefers-reduced-motion: reduce` retirent la piste et ne chargent aucune feuille.
- **Chemins absolus** (`/assets/...`) : la page est servie sur une URL quelconque, un
  chemin relatif casserait sur `/a/b/c`.

## Poids

HTML ~11 Ko avant minification, deux feuilles de 8 et 9 Ko, la police et les icônes
déjà en cache depuis le reste du site. Rien d'autre : pas de `content.json`, pas
d'`app.js`, pas d'Alpine, pas de mesure d'audience.

## À trancher avant le merge

1. **Atlas.** `tools/build.ts` fusionne les feuilles en `assets/sprites/slime-sheets.png`
   dans l'ordre des règles `.slime--<état>` de `src/index.html`. Si les feuilles
   individuelles ne sont plus servies, la 404 doit soit viser l'atlas avec un décalage
   vertical, soit être ajoutée à la liste des pages dont les feuilles restent unitaires.
2. **Caddy.** `.scratch/portfolio-production/caddy.snippet` répond aux erreurs en
   `text/plain`. Servir cette page demande de remplacer le `respond` par
   `rewrite * /404.html` + `file_server` dans `handle_errors`, en gardant le statut 404.
3. **Interactivité.** La page reste une page, pas un shell : la seule interaction est le
   clic sur la mascotte. Si l'issue attend une vraie saisie de commande (`ls`, `help`,
   `cd`), il faut charger l'interpréteur — ce qui change le budget de la page.
4. **Tests.** À ajouter côté `tests/browser` : statut 404 rendu avec un corps, thème
   repris depuis `bd-term-opts`, mascotte absente sous `anim: false`, chemin affiché
   tronqué.

# palette de commandes (⌘K)

Recherche globale et exécution de commandes pour le portfolio terminal.
`⌘K` / `Ctrl+K` ouvre un panneau qui cherche dans tout le contenu du site —
sections, missions, stack, thèmes, succès, commandes — complète au `Tab`,
et joue la commande correspondante dans un volet d'exécution.

Quatre fichiers, aucune dépendance, aucun build :

| Fichier | Rôle |
| --- | --- |
| `palette.js` | moteur : DOM, recherche, clavier, volet d'exécution (IIFE, `window.commandPalette`) |
| `palette.css` | feuille complète du composant, classes `.pal-*`, variables du thème hôte |
| `palette-index.js` | données seules : l'index cherchable (`window.paletteIndex`) |
| `index.html` | démonstration autonome sur une maquette de terminal réduite |

Seule ressource distante : JetBrains Mono.

## Branchement

```html
<link rel="stylesheet" href="palette.css">
<script src="palette-index.js"></script>
<script src="palette.js"></script>
```

```js
const palette = commandPalette.create({
  index: paletteIndex.items,
  hotkey: "meta",                 // "meta" = ⌘K et Ctrl+K · "ctrl" = Ctrl+K seul · null = aucun écouteur
  maxResults: 5,
  onTheme:  (id, item) => document.documentElement.dataset.theme = id,
  onAction: (item) => { if (item.href) location.href = item.href; },
  onAsk:    (q) => runLocalModel(q),      // aucun résultat : repli modèle local
  onFind:   (q) => highlightInPage(q),    // « rechercher dans la page »
  onRun:    (item) => true                // false = ne pas ouvrir le volet
});

palette.open();
palette.run("matrix");            // exécute une entrée par label ou par cmd
palette.setIndex(nouvelIndex);    // remplace l'index à chaud
palette.destroy();                // retire l'écouteur clavier et le DOM
```

Le panneau est créé au premier `open()` puis réutilisé. À la fermeture il est
retiré du DOM : rien ne reste dans l'arbre quand la palette est fermée.

## Options

| Option | Défaut | Effet |
| --- | --- | --- |
| `index` | `[]` | entrées cherchables |
| `groups` | 7 groupes | ordre et libellés des sections de résultats, et étiquette de droite |
| `hotkey` | `"meta"` | raccourci global ; `null` si le site gère lui-même l'ouverture |
| `maxResults` | `5` | nombre de résultats affichés, tous groupes confondus |
| `findThreshold` | `5` | sous ce nombre de résultats, on propose « rechercher dans la page » |
| `typeSpeed` | `19` ms | vitesse de l'écho tapé |
| `runDelay` | `460` ms | durée de la barre « exécution… » |
| `texts` | français | tous les libellés de l'interface |
| `root` | `document.body` | parent du calque |

## Ce que fait le moteur

**Le classement n'est pas un score flou.** Chaque entrée reçoit un rang selon la
nature du match, ce qui rend l'ordre prévisible à la frappe :

| Rang | Condition |
| --- | --- |
| 0 | le libellé **commence** par la saisie |
| 1 | la commande commence par la saisie |
| 2 | le libellé **contient** la saisie |
| 3 + position/1000 | la saisie est ailleurs (description, mots-clés) — départagé par la position |

La comparaison passe par `fold()` : `NFD` puis suppression des diacritiques.
« Élève », « eleve » et « ELEVE » matchent la même chose — indispensable sur un
index francophone. Les mots-clés de l'index sont donc écrits sans accent.

**Complétion fantôme.** Le reste du premier résultat s'affiche en gris derrière
le champ, `Tab` l'accepte. Le calque duplique la saisie en `color:transparent`
puis ajoute la suite : le texte fantôme tombe exactement à la bonne colonne sans
mesurer quoi que ce soit. Elle n'apparaît que si le premier résultat **commence**
par la saisie, sinon on proposerait de compléter vers un mot sans rapport. Sans
complétion disponible, `Tab` garde son rôle normal de navigation.

**Deux natures d'entrée.** Les entrées `kind:"action"` et celles qui portent un
`themeId` ne produisent aucune sortie : elles ferment la palette et rendent la
main au site via `onAction` / `onTheme` — ouvrir un lien, copier, changer de
thème. Toutes les autres ouvrent le volet d'exécution.

**Volet d'exécution.** La commande est « tapée » caractère par caractère, puis
une barre de progression tourne `runDelay` ms, puis la sortie apparaît ligne par
ligne (45 ms de décalage). La position de l'écho est dérivée du temps écoulé
(`Date.now() - t0`) et non d'un compteur d'intervalles : un onglet en arrière-plan
qui ralentit les timers rattrape son retard au lieu de se désynchroniser.

`Échap` dans le volet revient à la recherche, `Échap` dans la recherche ferme.
L'écouteur du champ appelle `stopPropagation()` sur `Échap` — sinon l'écouteur
global, qui voit alors un mode déjà revenu à « search », referme tout le panneau.

**Rendu.** La liste est reconstruite en une passe `innerHTML` à chaque frappe ;
le déplacement de la sélection ne touche qu'une classe et `aria-selected`, sans
reconstruire. Les clics et le survol passent par deux écouteurs délégués sur le
conteneur, pas un par ligne.

## Accessibilité

- `role="dialog"` + `aria-modal`, champ `role="combobox"` avec `aria-expanded`,
  `aria-controls` et `aria-activedescendant`, liste `role="listbox"`, lignes
  `role="option"` avec `aria-selected`.
- Le focus est capturé : toute sortie du panneau le ramène au champ. À la
  fermeture, il retourne à l'élément qui avait le focus avant l'ouverture.
- Toutes les lignes font 44 px de haut au minimum.
- La sélection reste visible sans `scrollIntoView` (qui déplacerait la page
  entière) : le conteneur ajuste `scrollTop` de la hauteur manquante.
- `prefers-reduced-motion` coupe toutes les animations, y compris l'écho et la
  barre de progression.

## Thème

Le composant ne définit aucune couleur. Il consomme les variables du site avec
un repli intégré :

`--bg` `--panel` `--edge` `--fg` `--fg2` `--acc` `--acc-soft` `--ok` `--warn` `--radius`

Les couleurs de données (`kc`, `c` d'une ligne de sortie, pastilles de thème)
viennent de l'index et sont posées en ligne — c'est le seul style injecté par
le script.

## Index

Une entrée :

```js
{
  kind:  "mission",                        // doit exister dans `groups`
  label: "kereis",                         // affiché, et complété par Tab
  cmd:   "bd show mission/kereis",         // écho joué dans le volet
  desc:  "mai 2026 → · MCP, SpecKit, SDD", // ligne grise
  keys:  "urbanisme agents speckit mcp",   // mots-clés, sans accents
  title: "mission",                        // titre de la sortie
  out: [ { k: "statut", v: "en cours", kc: "var(--fg2)", c: "var(--acc)" } ]
}
```

Variantes : `themeId` + `swatch` + `swatchBg` pour une entrée de thème ;
`href` / `target` / `copy` pour une action (champs libres, c'est `onAction` qui
décide quoi en faire).

`palette-index.js` reprend l'index du prototype : 6 sections, 4 missions,
11 commandes, 9 briques de stack, 5 actions, 8 thèmes, 12 succès. Les succès et
les thèmes sont générés depuis leurs tables respectives — ne dupliquez pas les
entrées à la main quand la liste existe déjà côté site.

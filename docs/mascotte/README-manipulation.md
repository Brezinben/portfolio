---

> **Ce document est la spécification d'origine, conservée telle qu'elle a été livrée.**
> Le site s'en écarte sur trois points :
>
> - **Affichage à ×2, pas ×4.** Les `background-size` et les keyframes de ce document
>   visent ×4, soit 128 px. Le site affiche à 64 px : `512px 64px` pour huit cases,
>   `768px 64px` pour douze, et les keyframes vont à `-512px` et `-768px`.
> - **Le code n'est pas livré.** `slime.css` et `slime-drag.js` servent de référence.
>   Le composant Alpine reste seul maître de l'état de la mascotte, comme l'arrête
>   l'ADR 0004.
> - **Le chunk C2PA est retiré des images.** Les sept fichiers livrés pesaient
>   50 727 octets, les sept servies en font 10 337.

# Mascotte slime — attrapé, déplacé, plaqué

Sept sprite sheets pour rendre la mascotte manipulable à la souris ou au doigt.
PNG animés en CSS pur ; le JavaScript ne sert qu'à choisir l'état affiché et à
déplacer l'élément.

## Format

| propriété | valeur |
| --- | --- |
| grille source | 32 × 32 px par frame |
| affichage recommandé | 128 × 128 px (agrandissement ×4) |
| agrandissements valides | multiples entiers seulement : ×2, ×3, ×4, ×8 |
| disposition | une seule ligne, frames de gauche à droite |
| fond | transparent |
| lissage | interdit — `image-rendering: pixelated` obligatoire |

## Palette

| rôle | hex |
| --- | --- |
| base | `#F5B83B` |
| ombre | `#C98F1E` |
| lumière | `#FFD98A` |
| encre | `#242538` |

## Les sept feuilles

| état | fichier | frames | feuille | background-size | durée | boucle |
| --- | --- | --- | --- | --- | --- | --- |
| attrapé | `slime-grab.png` | 12 | 384 × 32 | `1536px 128px` | 1,20 s | infinie |
| déplacé à droite | `slime-drag-right.png` | 8 | 256 × 32 | `1024px 128px` | 0,40 s | infinie |
| déplacé à gauche | `slime-drag-left.png` | 8 | 256 × 32 | `1024px 128px` | 0,40 s | infinie |
| plaqué à droite | `slime-splat-right.png` | 12 | 384 × 32 | `1536px 128px` | 0,96 s | 1 passe, tenue |
| plaqué à gauche | `slime-splat-left.png` | 12 | 384 × 32 | `1536px 128px` | 0,96 s | 1 passe, tenue |
| plaqué au sol | `slime-splat-floor.png` | 12 | 384 × 32 | `1536px 128px` | 0,96 s | 1 passe, tenue |
| plaqué au plafond | `slime-splat-ceiling.png` | 12 | 384 × 32 | `1536px 128px` | 0,96 s | 1 passe, tenue |

### Contenu de chaque animation

- **attrapé** — le slime décolle du sol : il s'affine en haut, s'alourdit en bas, et
  une pointe pend sous lui. L'oscillation est asymétrique (un grand balancement, puis
  un plus petit en sens inverse) pour éviter le va-et-vient mécanique. État à jouer
  tant que le bouton reste enfoncé sans mouvement.
- **déplacé à droite / à gauche** — le corps est incliné vers l'avant : le haut suit
  le curseur, le bas prend du retard, la pointe traîne derrière. Trois pixels clairs
  marquent le sillage à l'arrière. Le regard part dans le sens du déplacement.
- **plaqué (4 variantes)** — deux frames d'impact où l'épaisseur tombe de moitié et
  où le corps s'étale le long de la paroi, deux pixels de bavure aux extrémités, puis
  quatre oscillations amorties. Les yeux se pincent en traits verticaux à l'impact.
  Le sol étale en largeur, le plafond fait passer l'ombre en haut et descend le reflet
  d'une rangée.

### Deux partis pris de dessin

1. **Aucun mur n'est dessiné.** Le côté plat d'un plaquage est *le bord même du PNG* :
   le sprite doit donc toucher exactement le bord de la fenêtre pour que la forme se
   lise comme un écrasement. Toute marge ou tout `padding` sur le conteneur laisse un
   vide visible entre la forme aplatie et le bord, et l'illusion tombe.
2. **Gauche et droite sont redessinés, pas retournés.** Un `transform: scaleX(-1)`
   inverserait aussi le reflet en haut à gauche, alors que la lumière ne bouge pas.

## CSS

Voir `slime.css`. Le principe :

```css
.slime {
  position: fixed;
  width: 128px; height: 128px;
  background-repeat: no-repeat;
  image-rendering: pixelated;
  cursor: grab;
  touch-action: none;                       /* sinon le doigt scrolle la page */
}
.slime--grab {
  background-image: url("slime-grab.png");
  background-size: 1536px 128px;            /* frames × 128 */
  animation: slime-12 1.2s steps(12) infinite;
}
@keyframes slime-8  { to { background-position: -1024px 0 } }
@keyframes slime-12 { to { background-position: -1536px 0 } }
@keyframes slime-16 { to { background-position: -2048px 0 } }
```

`steps(n)` doit valoir le nombre de frames, `background-size` la largeur totale de la
feuille affichée (`frames × 128`), et la valeur du keyframe cette même largeur en
négatif. Pour un autre agrandissement les trois nombres changent ensemble : à 96 px,
`background-size: 1152px 96px` et un keyframe à `-1152px`.

Les quatre plaquages utilisent `animation-fill-mode: forwards` : la feuille est jouée
une fois, puis la dernière frame reste affichée tant que le slime est collé.

## Déclencheurs (quand → alors)

| quand | alors | comment |
| --- | --- | --- |
| bouton enfoncé sur le slime | attrapé | `pointerdown` + `setPointerCapture`, curseur en `grabbing` |
| déplacement de plus de 2 px | déplacé à droite ou à gauche | le signe de `movementX` choisit la feuille ; sous le seuil on reste sur attrapé, sinon la mascotte tremble |
| le sprite touche un bord de la fenêtre | plaqué (4 variantes) | la position est bornée par un `clamp` ; le bord atteint donne la feuille, et la classe ne change plus tant qu'on reste collé |
| bouton relâché en l'air | retour à sa place | transition CSS sur `transform`, puis l'état de repos du site |
| bouton relâché contre une paroi | se décolle, puis retour | la feuille plaquée est rejouée avec `animation-direction: reverse` avant le retour |

## Machine à états

`slime-drag.js` contient l'implémentation complète. Le cœur :

```js
function set(nom) {
  if (el.dataset.state === nom) return;   // sinon l'animation repart à la frame 1
  el.dataset.state = nom;
  el.className = "slime slime--" + nom;
}
```

**C'est le seul piège réel de cette interaction.** Sans ce test, chaque `pointermove`
réassigne la classe et remet l'animation à sa première image : le slime paraît figé
pendant tout le déplacement.

Deux autres points :

- `touch-action: none` sur l'élément, sinon le doigt fait défiler la page au lieu de
  déplacer la mascotte.
- Le script ne se branche pas du tout sous `prefers-reduced-motion: reduce` — mieux
  vaut pas de glisser qu'un glisser figé sur une frame.

Le script rend la main à `window.slime.play("idle")` à la fin du retour, s'il existe
(machine à états principale de la mascotte). Sinon il retire simplement les classes.

## Intégration

```html
<link rel="stylesheet" href="slime.css">
<div class="slime"></div>
<script src="slime-drag.js"></script>
```

Le `<div>` doit être en `position: fixed` (déjà dans le CSS) et sans marge autour,
pour que les plaquages touchent les bords de la fenêtre.

## Contenu du dossier

```
export-slime-grab/
├── README.md
├── slime.css
├── slime-drag.js
├── slime-grab.png            12 frames · 384×32
├── slime-drag-right.png       8 frames · 256×32
├── slime-drag-left.png        8 frames · 256×32
├── slime-splat-right.png     12 frames · 384×32
├── slime-splat-left.png      12 frames · 384×32
├── slime-splat-floor.png     12 frames · 384×32
└── slime-splat-ceiling.png   12 frames · 384×32
```

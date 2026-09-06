---

> **Ce document est la spécification d'origine, conservée telle qu'elle a été livrée.**
> Le site s'en écarte sur trois points, arrêtés dans `docs/adr/0004-une-mascotte-en-feuilles-plutot-qu-en-ombres-portees.md` :
>
> - **Neuf feuilles, pas douze.** `slime-idle-noctis`, `slime-idle-azureus` et
>   `slime-idle-uva` sont supprimées : une seule manière de teindre, par filtre.
> - **Affichage à ×2, pas ×4.** Les keyframes de la section 4 visent ×4 ; le site emploie
>   `-768px` et `-1024px`.
> - **Le chunk C2PA est retiré des images.** Les fichiers livrés pesaient 94 391 octets,
>   les neuf servies en font 20 074.
>
> `slime.css` et `slime.js` ne sont pas livrés au visiteur. Ils servent de référence.

nom: Mascotte slime — sprite sheets animées
version: 1.0
date: 2026-09-06
projet: Portfolio développeur IA Benjamin (portfolio.brezinben.dpdns.org)
technique: sprite sheet PNG + CSS steps()
dependances: aucune
poids_total: 25 ko (12 PNG)
licence: usage libre dans le portfolio Benjamin David
---

# Mascotte slime — animations

Neuf boucles pixel art de la mascotte du terminal, plus trois variantes de palette.
Chaque animation est une bande PNG horizontale (une frame par case de 32 × 32 px),
jouée en CSS par `background-position` + `steps()`. Aucun JavaScript n'est nécessaire
pour animer ; le JS ne sert qu'à choisir l'état affiché.

## 1. Format

| propriété | valeur |
| --- | --- |
| grille source | 32 × 32 px par frame |
| affichage recommandé | 128 × 128 px (agrandissement ×4) |
| agrandissements valides | multiples entiers uniquement : ×2 (64), ×3 (96), ×4 (128), ×8 (256) |
| disposition | une seule ligne, frames de gauche à droite |
| fond | transparent (alpha) |
| lissage | interdit — `image-rendering: pixelated` obligatoire |
| sol du personnage | ligne y = 27 de la grille (le corps est posé, pas centré) |

## 2. Palette

Quatre couleurs pour le corps, reprises du thème « ambre nuit » du terminal.

| rôle | hex | usage |
| --- | --- | --- |
| base | `#F5B83B` | corps |
| ombre | `#C98F1E` | deux dernières rangées du corps |
| lumière | `#FFD98A` | trois pixels de reflet en haut à gauche, mains, points de chargement, Z |
| encre | `#242538` | yeux, bouche, clavier, ombre au sol (alpha 0,28) |

La couronne (`slime-crown.png`, `slime-idle-crown.png`) ajoute quatre couleurs
reprises telles quelles de l'art du terminal : `#F2C230` or, `#C8921A` or sombre,
`#2F7FE0` bleu, `#D8322B` rouge.

Variantes de palette (même géométrie, teintes des thèmes du terminal) :

| type | base | ombre | lumière |
| --- | --- | --- | --- |
| ambre | `#F5B83B` | `#C98F1E` | `#FFD98A` |
| noctis | `#49e9a6` | `#2a9c72` | `#9df3d1` |
| azureus | `#49ace9` | `#2478a8` | `#a5daf5` |
| uva | `#a29bfe` | `#6b62d6` | `#d3cfff` |

## 3. Les douze feuilles

`frames` = nombre de cases. `feuille` = dimensions réelles du PNG.
`background-size` = valeur à écrire pour un affichage à 128 px.

| état | fichier | frames | feuille | background-size | durée | boucle | ms/frame |
| --- | --- | --- | --- | --- | --- | --- | --- |
| idle | `sprites/slime-idle.png` | 12 | 384 × 32 | `1536px 128px` | 1,44 s | infinie | 120 |
| wink | `sprites/slime-wink.png` | 12 | 384 × 32 | `1536px 128px` | 1,68 s | 1 passe | 140 |
| jump | `sprites/slime-jump.png` | 16 | 512 × 32 | `2048px 128px` | 1,28 s | 1 passe | 80 |
| type | `sprites/slime-type.png` | 12 | 384 × 32 | `1536px 128px` | 0,72 s | infinie | 60 |
| load | `sprites/slime-load.png` | 16 | 512 × 32 | `2048px 128px` | 1,60 s | infinie | 100 |
| sleep | `sprites/slime-sleep.png` | 16 | 512 × 32 | `2048px 128px` | 3,20 s | infinie | 200 |
| morph | `sprites/slime-morph.png` | 16 | 512 × 32 | `2048px 128px` | 2,40 s | 1 passe | 150 |
| crown | `sprites/slime-crown.png` | 16 | 512 × 32 | `2048px 128px` | 1,44 s | 1 passe | 90 |
| king | `sprites/slime-idle-crown.png` | 12 | 384 × 32 | `1536px 128px` | 1,44 s | infinie | 120 |
| idle-noctis | `sprites/slime-idle-noctis.png` | 12 | 384 × 32 | `1536px 128px` | 1,44 s | infinie | 120 |
| idle-azureus | `sprites/slime-idle-azureus.png` | 12 | 384 × 32 | `1536px 128px` | 1,44 s | infinie | 120 |
| idle-uva | `sprites/slime-idle-uva.png` | 12 | 384 × 32 | `1536px 128px` | 1,44 s | infinie | 120 |

### Contenu de chaque animation

- **idle · respiration** — quatre frames identiques au repos, puis inspiration et
  expiration. Le volume est conservé : quand la hauteur monte, la largeur baisse.
- **wink · clin d'œil** — sept frames yeux ouverts, une à mi-course, deux fermées,
  une à mi-course. Seul l'œil droit se ferme.
- **jump · saut** — 1 frame d'anticipation écrasée, montée à grands pas,
  2 frames tenues au sommet, chute plus rapide que la montée, écrasement à
  l'atterrissage puis léger dépassement. L'ombre au sol rétrécit avec l'altitude.
- **type · frappe au clavier** — 4 frappes alternées gauche/droite. Le corps se
  décale d'un pixel à l'opposé de la main qui tape, la touche s'éclaire une frame,
  les yeux restent mi-clos. Clavier inclus dans le sprite (rangée `#242538`, y 28-29).
- **load · réflexion** — trois blocs au-dessus de la tête, 4 frames chacun, puis
  4 frames de pause. Le regard suit le bloc actif.
- **sleep · veille** — respiration deux fois plus ample et plus lente, yeux fermés
  en une ligne, bouche en `o`, Z qui monte de six pixels et s'efface sur les
  dernières frames pour que la boucle ne saute pas.
- **morph · changement de type** — 4 frames par type : 2 tenues, 1 frame écrasée en
  teinte claire (flash), 1 frame étirée déjà dans la couleur suivante.
  Ordre : ambre → noctis → azureus → uva → ambre (boucle fermée).
- **crown · couronne trouvée** — 5 frames de chute depuis le haut du cadre, 1 frame
  d'impact où la couronne s'enfonce dans le corps écrasé, 1 frame de rebond, puis
  la fierté qui respire. À jouer une seule fois.
- **king · idle couronné** — le repos définitif, une fois la couronne acquise.

### Principes de timing appliqués

1. Pas de cadence uniforme : les poses de repos sont dupliquées sur plusieurs frames
   (une cadence régulière donne un diaporama).
2. Une seule frame d'anticipation avant une action rapide.
3. Montée et descente asymétriques : la chute couvre plus de pixels par frame.
4. Mouvement secondaire toujours à contresens du mouvement principal
   (le corps contre la main qui tape, le regard contre le point actif).
5. Première et dernière frame compatibles, sinon la boucle saute.

Méthode inspirée de l'article de Ayotomiwa Wale-Durojaye,
« Reverse-Engineering Claude AI's Mascot Animations with SVG and GSAP », Codrops, 2026.

## 4. CSS minimal

Deux keyframes suffisent pour toutes les feuilles à 128 px : une pour 12 frames,
une pour 16. La valeur finale doit valoir la largeur totale de la feuille affichée
(`frames × 128`), et `steps(n)` doit valoir le nombre de frames.

```css
.slime {
  width: 128px;
  height: 128px;
  background-repeat: no-repeat;
  image-rendering: pixelated;
  background-image: url("sprites/slime-idle.png");
  background-size: 1536px 128px;          /* 12 × 128 */
  animation: slime-12 1.44s steps(12) infinite;
}
@keyframes slime-12 { to { background-position: -1536px 0 } }
@keyframes slime-16 { to { background-position: -2048px 0 } }

.slime--jump {
  background-image: url("sprites/slime-jump.png");
  background-size: 2048px 128px;          /* 16 × 128 */
  animation: slime-16 1.28s steps(16) 1;  /* 1 = une seule passe */
}

@media (prefers-reduced-motion: reduce) {
  .slime { animation: none }              /* la frame 1 reste une pose correcte */
}
```

Pour un autre agrandissement, multiplier les deux nombres :
à 96 px il faut `background-size: 1152px 96px` **et** un keyframe à `-1152px`
(un keyframe est lié au pas, donc à la taille d'affichage).

Fichier prêt à l'emploi : `slime.css`.

## 5. Machine à états

`slime.js` contient l'automate complet. Principe : une table `état → [fichier,
frames, durée, bouclée]`, une fonction `play(nom)` qui réécrit les trois propriétés
de fond et l'animation, et `animationend` qui ramène l'état de repos courant après
une passe unique.

```js
const S = {
  idle:  ["slime-idle.png",       12, 1.44, 1],
  wink:  ["slime-wink.png",       12, 1.68, 0],
  jump:  ["slime-jump.png",       16, 1.28, 0],
  type:  ["slime-type.png",       12, 0.72, 1],
  load:  ["slime-load.png",       16, 1.60, 1],
  sleep: ["slime-sleep.png",      16, 3.20, 1],
  morph: ["slime-morph.png",      16, 2.40, 0],
  crown: ["slime-crown.png",      16, 1.44, 0],
  king:  ["slime-idle-crown.png", 12, 1.44, 1]
};
```

Deux pièges :

- **Rejouer la même animation** ne la redémarre pas. Forcer
  `el.style.animation = "none"`, lire `el.offsetWidth`, puis réassigner.
- **`prefers-reduced-motion`** : couper les passes rapides (jump, crown, type)
  et ne garder que les boucles lentes, ou rien du tout.

## 6. Déclencheurs (quand → alors)

Une seule règle s'applique à la fois. Une action en cours n'est jamais coupée ;
la veille a la priorité la plus basse.

| quand | alors | comment |
| --- | --- | --- |
| la page se charge | idle | état de repos, boucle infinie |
| clic sur le slime | wink | une passe, puis retour au repos |
| 26ᵉ clic sur le slime | crown | une passe, puis `king` devient le repos — mémorisé en `localStorage`, ne se rejoue pas |
| frappe dans le prompt | type | sur `input` ; retour au repos 400 ms après la dernière touche |
| commande lancée, sortie en attente | load | dure le temps réel de la commande, pas une durée fixe |
| sortie affichée, easter egg trouvé | jump | une passe ; à réserver aux vraies réussites |
| changement de thème | morph | une passe qui s'arrête sur la teinte du nouveau thème |
| ni souris ni clavier pendant 10 s | sleep | minuteur remis à zéro sur `mousemove`, `keydown`, `scroll` ; réveil au premier mouvement |
| toutes les 5 s au repos, 4 % de chance | wink ou jump | une passe, jamais pendant une autre action |

Le portfolio terminal expose déjà des émotions nommées (`idle`, `happy`, `sleep`,
`alert`, `drop`, `laugh`, `sad`, `scared`) : il suffit de mapper chaque émotion sur
un état de cette table pour remplacer les poses fixes par ces boucles.

## 7. Couvrir les neuf thèmes du terminal

Les couleurs sont cuites dans les PNG. En l'état, chaque type demande sa propre
feuille : neuf états × neuf thèmes = 81 fichiers. Trois façons d'éviter ça.

| option | méthode | fidélité | fichiers |
| --- | --- | --- | --- |
| A | une feuille par type (fait ici pour 4 types) | exacte | 81 pour tout couvrir |
| B | feuille ambre + `filter: hue-rotate()` | approchée : rotation matricielle, la teinte dérive et l'encre des yeux vire aussi | 0 |
| C | feuille en masque alpha + `background-color` | exacte, pilotée par `var(--acc)`, y compris un thème futur | 4 masques par état (base, ombre, lumière, encre), 36 au total |

Valeurs de rotation pour l'option B, depuis l'ambre (teinte ≈ 40°) :
noctis `hue-rotate(117deg)`, azureus `hue-rotate(163deg)`, uva `hue-rotate(205deg)`.

Squelette de l'option C (quatre calques superposés, animés à l'identique) :

```css
.slime-layer {
  position: absolute; inset: 0;
  mask-image: url("masks/slime-idle-base.png");
  mask-size: 1536px 128px;
  mask-repeat: no-repeat;
  animation: slime-mask-12 1.44s steps(12) infinite;
}
@keyframes slime-mask-12 { to { mask-position: -1536px 0 } }
/* .slime-layer--base   { background: var(--acc) }
   .slime-layer--shadow { background: color-mix(in oklch, var(--acc), black 22%) }
   .slime-layer--light  { background: color-mix(in oklch, var(--acc), white 45%) }
   .slime-layer--ink    { background: var(--panel) } */
```

Les masques ne sont pas fournis dans ce dossier ; ils s'exportent depuis la même
géométrie en remplaçant chaque nuance par du blanc opaque sur fond transparent.

## 8. Contenu du dossier

```
mascotte/
├── README.md                        ce fichier
├── slime.css                        classes et keyframes prêts à l'emploi
├── slime.js                         machine à états et déclencheurs
└── sprites/
    ├── slime-idle.png               12 frames · 384×32
    ├── slime-wink.png               12 frames · 384×32
    ├── slime-jump.png               16 frames · 512×32
    ├── slime-type.png               12 frames · 384×32
    ├── slime-load.png               16 frames · 512×32
    ├── slime-sleep.png              16 frames · 512×32
    ├── slime-morph.png              16 frames · 512×32
    ├── slime-crown.png              16 frames · 512×32
    ├── slime-idle-crown.png         12 frames · 384×32
    ├── slime-idle-noctis.png        12 frames · 384×32
    ├── slime-idle-azureus.png       12 frames · 384×32
    └── slime-idle-uva.png           12 frames · 384×32
```

Intégration : copier `sprites/`, `slime.css` et `slime.js` à la racine du site,
poser `<div class="slime"></div>` où la mascotte doit apparaître, charger le CSS
puis le JS. Rien d'autre à installer.

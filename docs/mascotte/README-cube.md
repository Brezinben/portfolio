# Mascotte cube — trente-deux états

Le premier palier de la chaîne. Le cube ne s'écrase pas : ses arêtes restent droites sur toutes les frames, et la vie passe par l'intérieur du volume — un dégradé tramé dont la trame se décale à chaque frame.

Sprite sheets PNG animées en CSS pur. Aucune dépendance, aucun JavaScript pour animer.

## La chaîne

```
slime  →  cube  →  pingouin  →  slime
```

Chaque appel de `/slime evolve` monte d'un cran, le troisième referme le cycle. Ce
dossier contient les deux transitions qui encadrent le cube :

| transition | fichier | frames | durée |
| --- | --- | --- | --- |
| slime → cube | `slime-evolve-cube.png` | 40 | 2,40 s |
| cube → pingouin | `cube-evolve-pingouin.png` | 40 | 2,40 s |

**slime → cube** — six frames de ramassage, quatre de détente, seize où l'exposant de la forme passe de 2 à 7 : un seul paramètre transforme le dôme en carré.

**cube → pingouin** — dix frames où les angles se ramollissent avant que le col se pince et détache la tête. Il faut repasser par le dôme.

## Format

| propriété | valeur |
| --- | --- |
| grille source | 32 × 32 px par frame |
| échelle du site | ×2 (64 px) |
| échelle de ce CSS | ×4 (128 px) — voir la note en bas de `mascotte.css` |
| agrandissements valides | multiples entiers seulement |
| disposition | une seule ligne, frames de gauche à droite |
| fond | transparent |
| lissage | interdit — `image-rendering: pixelated` obligatoire |
| sol du personnage | ligne y = 27 de la grille |

## Palette

Quatre teintes exactes, rien de semi-transparent, aucune couleur intermédiaire. Vérifié
pixel par pixel sur les 37 feuilles.

| rôle | hex |
| --- | --- |
| base | `#F5B83B` |
| ombre | `#C98F1E` |
| lumière | `#FFD98A` |
| encre | `#242538` |

### Variantes de thème

Trois feuilles de repos supplémentaires, calées sur les thèmes du terminal, obtenues
par remappage exact des trois teintes — la géométrie et l'encre des yeux sont
identiques :

| thème | fichier | base | ombre | lumière |
| --- | --- | --- | --- | --- |
| noctis | `cube-idle-noctis.png` | `#49E9A6` | `#2A9C72` | `#9DF3D1` |
| azureus | `cube-idle-azureus.png` | `#49ACE9` | `#2478A8` | `#A5DAF5` |
| uva | `cube-idle-uva.png` | `#A29BFE` | `#6B62D6` | `#D3CFFF` |

## Les trente-deux états

| état | fichier | frames | feuille | background-size (×4) | durée | boucle |
| --- | --- | --- | --- | --- | --- | --- |
| repos | `cube-idle.png` | 12 | 384 × 32 | `1536px 128px` | 1,20 s | infinie |
| clin d'œil | `cube-wink.png` | 12 | 384 × 32 | `1536px 128px` | 0,96 s | 1 passe |
| saut | `cube-jump.png` | 16 | 512 × 32 | `2048px 128px` | 0,96 s | 1 passe |
| frappe au clavier | `cube-type.png` | 12 | 384 × 32 | `1536px 128px` | 0,72 s | infinie |
| chargement | `cube-load.png` | 16 | 512 × 32 | `2048px 128px` | 0,96 s | infinie |
| veille | `cube-sleep.png` | 16 | 512 × 32 | `2048px 128px` | 2,40 s | infinie |
| alert | `cube-alert.png` | 16 | 512 × 32 | `2048px 128px` | 0,96 s | 1 passe |
| happy | `cube-happy.png` | 20 | 640 × 32 | `2560px 128px` | 1,20 s | 1 passe |
| laugh | `cube-laugh.png` | 24 | 768 × 32 | `3072px 128px` | 1,44 s | infinie |
| sad | `cube-sad.png` | 24 | 768 × 32 | `3072px 128px` | 2,88 s | infinie |
| scared | `cube-scared.png` | 20 | 640 × 32 | `2560px 128px` | 1,00 s | infinie |
| explosion | `cube-boom.png` | 16 | 512 × 32 | `2048px 128px` | 1,28 s | 1 passe |
| reformation | `cube-reform.png` | 16 | 512 × 32 | `2048px 128px` | 1,44 s | 1 passe |
| chute | `cube-drop.png` | 24 | 768 × 32 | `3072px 128px` | 1,44 s | 1 passe |
| attrapé | `cube-grab.png` | 12 | 384 × 32 | `1536px 128px` | 1,20 s | infinie |
| déplacé à droite | `cube-drag-right.png` | 8 | 256 × 32 | `1024px 128px` | 0,40 s | infinie |
| déplacé à gauche | `cube-drag-left.png` | 8 | 256 × 32 | `1024px 128px` | 0,40 s | infinie |
| plaqué à droite | `cube-splat-right.png` | 12 | 384 × 32 | `1536px 128px` | 0,96 s | 1 passe |
| plaqué à gauche | `cube-splat-left.png` | 12 | 384 × 32 | `1536px 128px` | 0,96 s | 1 passe |
| plaqué au sol | `cube-splat-floor.png` | 12 | 384 × 32 | `1536px 128px` | 0,96 s | 1 passe |
| plaqué au plafond | `cube-splat-ceiling.png` | 12 | 384 × 32 | `1536px 128px` | 0,96 s | 1 passe |
| coin haut-gauche | `cube-splat-tl.png` | 12 | 384 × 32 | `1536px 128px` | 0,96 s | 1 passe |
| coin haut-droit | `cube-splat-tr.png` | 12 | 384 × 32 | `1536px 128px` | 0,96 s | 1 passe |
| coin bas-gauche | `cube-splat-bl.png` | 12 | 384 × 32 | `1536px 128px` | 0,96 s | 1 passe |
| coin bas-droit | `cube-splat-br.png` | 12 | 384 × 32 | `1536px 128px` | 0,96 s | 1 passe |
| vélo | `cube-bike.png` | 16 | 512 × 32 | `2048px 128px` | 0,96 s | infinie |
| train | `cube-train.png` | 24 | 768 × 32 | `3072px 128px` | 1,44 s | 1 passe |
| café | `cube-coffee.png` | 20 | 640 × 32 | `2560px 128px` | 1,20 s | 1 passe |
| goal | `cube-goal.png` | 24 | 768 × 32 | `3072px 128px` | 1,44 s | 1 passe |
| jonglage | `cube-juggle.png` | 16 | 512 × 32 | `2048px 128px` | 0,96 s | infinie |
| lift | `cube-lift.png` | 24 | 768 × 32 | `3072px 128px` | 1,44 s | 1 passe |
| changement de motif | `cube-morph.png` | 16 | 512 × 32 | `2048px 128px` | 1,60 s | 1 passe |

### Ce que chacun contient

- **repos** — un cube ne respire pas : il monte d'un pixel toutes les trois frames, et toute la vie vient du dégradé tramé.
- **clin d'œil** — le corps s'incline d'un pixel au lieu de se déformer — un cube qui fait un clin d'œil doit basculer, pas fondre.
- **saut** — compression de moitié moins que le slime : assez pour lire l'élan, pas assez pour qu'il redevienne mou.
- **frappe au clavier** — sept touches, celle frappée s'enfonce et s'éclaircit ; le corps se décale d'un pixel entier, jamais d'un demi.
- **chargement** — trois points allumés par groupes de trois frames sur un cycle de neuf, dans une boucle de seize.
- **veille** — le volume est parfaitement immobile ; ce sont les Z et le glissement de la trame qui font le sommeil.
- **attrapé** — le sommet suit la pince, la base prend du retard, l'inclinaison alterne en amplitude décroissante.
- **déplacé à droite** — cisaillement du volume : le haut mène, le bas traîne.
- **déplacé à gauche** — le miroir, redessiné — un scaleX(-1) déplacerait l'arête claire.
- **vélo** — le cube réduit d'un cinquième pour tenir sur le cadre ; un seul rayon clair par roue.
- **train** — attente avec le phare au loin, arrivée en freinant, il rétrécit dans l'embrasure, départ, quai vide.
- **alert** — sursaut d'une frame, détente trop haute, puis le point d'exclamation apparaît. Les six dernières frames servent à deux coups d'œil — c'est ce balayage, pas le sursaut, qui fait comprendre qu'il cherche quelque chose.
- **happy** — deux bonds, le second à moitié moins haut ; compression de moitié moins que sur le slime, yeux plissés au sommet seulement, trois étincelles.
- **laugh** — quatre cycles de six frames à amplitude alternée. Le cisaillement est réduit de moitié par rapport au pingouin : au-delà, un cube penché ne se lit plus comme un rire.
- **sad** — l'affaissement occupe la moitié de la boucle ; la hauteur perd un tiers en gardant les angles droits, plus la larme qui tombe.
- **scared** — le volume se referme de douze pour cent et tremble de deux pixels par frame ; les traits de vibration et la goutte sont indispensables.
- **explosion** — trois frames de surprise, une d'écrasement, un flash plein cadre, huit d'éclats en couronne, trois vides.
- **reformation** — les éclats reviennent en spirale sur sept frames, retombent en flaque, le volume se reconstitue en dépassant sa taille de douze pour cent.
- **chute** — six frames de chute étirée, deux d'impact avec la poussière, onze d'oscillation amortie. Un cube s'étire moins qu'un slime — c'est la poussière qui porte l'impact.
- **café** — la tasse monte en cinq frames, la gorgée en tient cinq, la redescente quatre, puis trois frames de coup de fouet.
- **goal** — le cube frappe du coin : une seule frame de contact, puis le ballon suit six positions jusqu'au fond du but, où il reste visible pendant la célébration.
- **jonglage** — trois blocs sur la même parabole décalés d'un tiers de cycle ; le corps perd un cinquième de sa taille pour que l'arc tienne dans la frame.
- **lift** — trois frames accroupies, cinq d'arraché, huit de tenue tremblante, cinq de reposé, trois de soulagement.
- **changement de motif** — quatre motifs internes de quatre frames — plein, rayé, à pois, damier. La géométrie ne bouge pas.
- **plaqué à droite** — comprimé dans l'axe de la poussée, allongé dans l'autre, angles droits conservés.
- **plaqué à gauche** — le miroir, bord plat à gauche.
- **plaqué au sol** — une dalle large et basse, le plus lisible des quatre.
- **plaqué au plafond** — retourné, l'ombre passe en haut contre le plafond.
- **coin haut-gauche** — l'angle intérieur se fait biseauter, de six à treize pixels selon la poussée.
- **coin haut-droit** — idem en miroir ; l'arête claire suit le biseau, seule face encore libre.
- **coin bas-gauche** — les coins du bas sont les plus crédibles : le cube est déjà posé au repos.
- **coin bas-droit** — l'ombre suit les deux parois à la fois, sur un pixel de large.

## Poids

| | |
| --- | --- |
| pixels | 72.5 Ko |
| sur le disque | 213.4 Ko |

Chaque PNG porte 5 758 octets de métadonnée de provenance C2PA, ré-ajoutés à chaque
écriture. **Retirer ce chunk à l'intégration** — sinon la comparaison au plafond de
budget n'a aucun sens :

```sh
oxipng --strip safe *.png          # ou
pngcrush -rem alla -brute in.png out.png
```

## CSS

Voir `mascotte.css`. Le principe :

```css
.mascotte {
  width: 128px; height: 128px;
  background-repeat: no-repeat;
  image-rendering: pixelated;
}
.ms--idle {
  background-image: url("cube-idle.png");
  background-size: 1536px 128px;               /* frames × 128 */
  animation: ms-12 1.2s steps(12) infinite;    /* steps = frames */
}
@keyframes ms-12 { to { background-position: -1536px 0 } }
```

`steps(n)` vaut le nombre de frames, `background-size` la largeur totale de la feuille
affichée, et le keyframe cette même largeur en négatif. À ×2 (l'échelle du site) les
trois nombres se divisent par deux.

Les états en une passe utilisent `animation-fill-mode: forwards` : la dernière frame
reste affichée au lieu de revenir à la première.

## Machine à états

```js
function set(nom) {
  if (el.dataset.state === nom) return;   // sinon l'animation repart à la frame 1
  el.dataset.state = nom;
  el.className = "mascotte ms--" + nom;
}
```

**C'est le seul piège réel.** Sans ce test, chaque `pointermove` réassigne la classe et
remet l'animation à sa première image : la mascotte paraît figée pendant tout le
déplacement.

Pour le glisser, tester **les coins avant les bords simples** :

```js
var r = x >= maxX, l = x <= minX, b = y >= maxY, t = y <= minY;
if (t && l)      set("splat-tl");
else if (t && r) set("splat-tr");
else if (b && l) set("splat-bl");
else if (b && r) set("splat-br");
else if (r) set("splat-right");
else if (l) set("splat-left");
else if (b) set("splat-floor");
else if (t) set("splat-ceiling");
```

Sinon un coin se lit toujours comme un mur. Et le côté plat d'un plaquage est le bord
même du PNG : le sprite doit toucher exactement le bord de la fenêtre, sans marge ni
`padding`, sans quoi l'illusion tombe.

Sous `prefers-reduced-motion: reduce`, ne rien jouer : la frame 1 de chaque feuille
reste une pose correcte.

### Le dégradé tramé

Trois teintes réparties par une matrice de Bayer 4×4 : chaque pixel choisit entre la teinte au-dessus et celle en dessous selon un seuil qui dépend de sa position. Aucune couleur intermédiaire n'est fabriquée, donc le `hue-rotate` des thèmes s'applique sans dériver. La matrice se décale de deux rangées et trois colonnes par frame — c'est ce glissement qui fait bouger les pixels, et ce qui rend la veille vivante alors que le volume est immobile.

### Ce que la rigidité coûte

Onze états du slime reposaient sur l'écrasement : saut, réception, chute, impact, plaquages, humeurs. Sur le cube ils sont rejoués avec une compression de moitié moins et une bascule d'un pixel. Le résultat est plus sec, ce qui sert les états courts et pénalise les longs — le rire, notamment, dont le cisaillement a dû être réduit de moitié pour ne pas se lire comme une dalle qui tombe.

## Contenu du dossier

```
export-cube/
├── README.md
├── mascotte.css
├── cube-idle.png                    12 frames
├── cube-wink.png                    12 frames
├── cube-jump.png                    16 frames
├── cube-type.png                    12 frames
├── cube-load.png                    16 frames
├── cube-sleep.png                   16 frames
├── cube-alert.png                   16 frames
├── cube-happy.png                   20 frames
├── cube-laugh.png                   24 frames
├── cube-sad.png                     24 frames
├── cube-scared.png                  20 frames
├── cube-boom.png                    16 frames
├── cube-reform.png                  16 frames
├── cube-drop.png                    24 frames
├── cube-grab.png                    12 frames
├── cube-drag-right.png              8 frames
├── cube-drag-left.png               8 frames
├── cube-splat-right.png             12 frames
├── cube-splat-left.png              12 frames
├── cube-splat-floor.png             12 frames
├── cube-splat-ceiling.png           12 frames
├── cube-splat-tl.png                12 frames
├── cube-splat-tr.png                12 frames
├── cube-splat-bl.png                12 frames
├── cube-splat-br.png                12 frames
├── cube-bike.png                    16 frames
├── cube-train.png                   24 frames
├── cube-coffee.png                  20 frames
├── cube-goal.png                    24 frames
├── cube-juggle.png                  16 frames
├── cube-lift.png                    24 frames
├── cube-morph.png                   16 frames
├── cube-idle-noctis.png             12 frames
├── cube-idle-azureus.png            12 frames
├── cube-idle-uva.png                12 frames
├── slime-evolve-cube.png            40 frames
└── cube-evolve-pingouin.png         40 frames
```

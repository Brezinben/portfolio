# Mascotte pingouin — vingt états

Le deuxième palier, et le dernier avant le retour au slime. L'inverse du cube : le pingouin a des membres — tête distincte, deux ailerons, deux palmes. Quatre articulations à animer, là où le slime n'avait qu'un volume.

Sprite sheets PNG animées en CSS pur. Aucune dépendance, aucun JavaScript pour animer.

## La chaîne

```
slime  →  cube  →  pingouin  →  slime
```

Chaque appel de `/slime evolve` monte d'un cran, le troisième referme le cycle. Ce
dossier contient les deux transitions qui encadrent le pingouin :

| transition | fichier | frames | durée |
| --- | --- | --- | --- |
| cube → pingouin | `cube-evolve-pingouin.png` | 40 | 2,40 s |
| pingouin → slime | `peng-devolve.png` | 24 | 1,44 s |

**cube → pingouin** — dix frames où les angles du cube se ramollissent, huit où le col se pince et détache la tête, huit pour les ailerons et le plastron, une frame d'éclat, puis le bec sort d'une pointe par frame et les palmes s'extrudent.

**pingouin → slime** — huit frames où la tête rentre dans le corps pendant que les ailerons, le bec et les palmes sont absorbés, quatre de flaque, puis le dôme remonte en dépassant sa hauteur de quatorze pour cent.

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
pixel par pixel sur les 25 feuilles.

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
| noctis | `peng-idle-noctis.png` | `#49E9A6` | `#2A9C72` | `#9DF3D1` |
| azureus | `peng-idle-azureus.png` | `#49ACE9` | `#2478A8` | `#A5DAF5` |
| uva | `peng-idle-uva.png` | `#A29BFE` | `#6B62D6` | `#D3CFFF` |

## Les vingt états

| état | fichier | frames | feuille | background-size (×4) | durée | boucle |
| --- | --- | --- | --- | --- | --- | --- |
| repos | `peng-idle.png` | 12 | 384 × 32 | `1536px 128px` | 1,20 s | infinie |
| clin d'œil | `peng-wink.png` | 12 | 384 × 32 | `1536px 128px` | 0,96 s | 1 passe |
| saut | `peng-jump.png` | 16 | 512 × 32 | `2048px 128px` | 0,96 s | 1 passe |
| frappe au clavier | `peng-type.png` | 12 | 384 × 32 | `1536px 128px` | 0,72 s | infinie |
| chargement | `peng-load.png` | 16 | 512 × 32 | `2048px 128px` | 0,96 s | infinie |
| veille | `peng-sleep.png` | 16 | 512 × 32 | `2048px 128px` | 2,40 s | infinie |
| attrapé | `peng-grab.png` | 12 | 384 × 32 | `1536px 128px` | 1,20 s | infinie |
| déplacé à droite | `peng-drag-right.png` | 8 | 256 × 32 | `1024px 128px` | 0,40 s | infinie |
| déplacé à gauche | `peng-drag-left.png` | 8 | 256 × 32 | `1024px 128px` | 0,40 s | infinie |
| vélo | `peng-bike.png` | 16 | 512 × 32 | `2048px 128px` | 0,96 s | infinie |
| train | `peng-train.png` | 24 | 768 × 32 | `3072px 128px` | 1,44 s | 1 passe |
| changement de motif | `peng-morph.png` | 16 | 512 × 32 | `2048px 128px` | 1,60 s | 1 passe |
| plaqué à droite | `peng-splat-right.png` | 12 | 384 × 32 | `1536px 128px` | 0,96 s | 1 passe |
| plaqué à gauche | `peng-splat-left.png` | 12 | 384 × 32 | `1536px 128px` | 0,96 s | 1 passe |
| plaqué au sol | `peng-splat-floor.png` | 12 | 384 × 32 | `1536px 128px` | 0,96 s | 1 passe |
| plaqué au plafond | `peng-splat-ceiling.png` | 12 | 384 × 32 | `1536px 128px` | 0,96 s | 1 passe |
| coin haut-gauche | `peng-splat-tl.png` | 12 | 384 × 32 | `1536px 128px` | 0,96 s | 1 passe |
| coin haut-droit | `peng-splat-tr.png` | 12 | 384 × 32 | `1536px 128px` | 0,96 s | 1 passe |
| coin bas-gauche | `peng-splat-bl.png` | 12 | 384 × 32 | `1536px 128px` | 0,96 s | 1 passe |
| coin bas-droit | `peng-splat-br.png` | 12 | 384 × 32 | `1536px 128px` | 0,96 s | 1 passe |

### Ce que chacun contient

- **repos** — respiration d'un pixel, ailerons à contretemps, une palme qui se soulève à tour de rôle.
- **clin d'œil** — la tête se décale sur le corps pendant que l'œil se ferme ; les palmes restent plantées.
- **saut** — il plie sur ses palmes, les ailerons montent d'un cran à l'apex.
- **frappe au clavier** — les ailerons encadrent le clavier ; le bec reste immobile.
- **chargement** — mêmes trois points que le cube, le corps suit d'un demi-temps.
- **veille** — respiration doublée et ralentie, palmes immobiles, ailerons pendants.
- **attrapé** — tenu par la tête, le corps oscille sous elle et les ailerons s'écartent.
- **déplacé à droite** — la tête part devant, le corps suit, les ailerons se plaquent vers l'arrière.
- **déplacé à gauche** — le miroir, redessiné : plastron et reflet restent du côté de la lumière.
- **vélo** — la forme qui va le mieux sur un vélo : les ailerons tiennent le guidon, les palmes trouvent les pédales.
- **train** — il ne monte pas : la rame surgit par la droite, le percute et l'emporte. La face avant est en encre, sinon la mascotte s'y noie.
- **changement de motif** — le plastron sert de zone de motif : plein, rayé, à pois, damier.
- **plaqué à droite** — vue de face pivotée : corps flush, tête distincte, deux ailes déployées le long du mur.
- **plaqué à gauche** — le miroir.
- **plaqué au sol** — la vue de face d'origine : ailes étalées à gauche et à droite, palmes vers le haut.
- **plaqué au plafond** — retourné ; les palmes servent de repère d'orientation.
- **coin haut-gauche** — corps en quart de disque, tête sur la diagonale, une aile le long de chaque paroi.
- **coin haut-droit** — idem en miroir, palmes sur la diagonale.
- **coin bas-gauche** — les ailes s'étalent sur le sol et le mur.
- **coin bas-droit** — ce sont les appendices, pas le volume, qui disent que la forme est bloquée.

## Poids

| | |
| --- | --- |
| pixels | 76.1 Ko |
| sur le disque | 216.9 Ko |

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
  background-image: url("peng-idle.png");
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

## Notes de conception

### Ce que les membres apportent

Quatre articulations donnent des mouvements secondaires gratuits : un aileron qui bat à contretemps, une palme qui se soulève, une tête qui prend du retard sur le corps. Les états lents y gagnent beaucoup, parce qu'il y a toujours quelque chose qui bouge sans que le volume ait à se déformer.

### Ce qu'ils coûtent

À 32 px, quatre appendices laissent peu de place : le corps fait dix-sept pixels de large contre vingt-cinq pour le slime, donc les états qui ajoutent un accessoire sont plus serrés. Les plaquages sont construits à part, depuis une vue de face pivotée par remappage de pixels — une rotation d'image fabriquerait des teintes hors palette.

## Contenu du dossier

```
export-pingouin/
├── README.md
├── mascotte.css
├── peng-idle.png                  12 frames
├── peng-wink.png                  12 frames
├── peng-jump.png                  16 frames
├── peng-type.png                  12 frames
├── peng-load.png                  16 frames
├── peng-sleep.png                 16 frames
├── peng-grab.png                  12 frames
├── peng-drag-right.png            8 frames
├── peng-drag-left.png             8 frames
├── peng-bike.png                  16 frames
├── peng-train.png                 24 frames
├── peng-morph.png                 16 frames
├── peng-splat-right.png           12 frames
├── peng-splat-left.png            12 frames
├── peng-splat-floor.png           12 frames
├── peng-splat-ceiling.png         12 frames
├── peng-splat-tl.png              12 frames
├── peng-splat-tr.png              12 frames
├── peng-splat-bl.png              12 frames
├── peng-splat-br.png              12 frames
├── peng-idle-noctis.png        12 frames
├── peng-idle-azureus.png       12 frames
├── peng-idle-uva.png           12 frames
├── cube-evolve-pingouin.png   40 frames
└── peng-devolve.png   24 frames
```

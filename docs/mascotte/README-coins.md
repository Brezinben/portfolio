# Mascotte slime — les quatre coins

Quatre sprite sheets pour le slime coincé dans un coin de la fenêtre, à utiliser avec
le glisser-déposer. PNG animés en CSS pur, aucune dépendance.

Elles complètent le lot `attrapé, déplacé, plaqué` : les plaquages simples couvrent
les quatre bords, ces quatre-ci couvrent les quatre coins.

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

## Les quatre feuilles

| coin | fichier | frames | feuille | background-size | durée | boucle |
| --- | --- | --- | --- | --- | --- | --- |
| haut-gauche | `slime-splat-tl.png` | 12 | 384 × 32 | `1536px 128px` | 0,96 s | 1 passe, tenue |
| haut-droit | `slime-splat-tr.png` | 12 | 384 × 32 | `1536px 128px` | 0,96 s | 1 passe, tenue |
| bas-gauche | `slime-splat-bl.png` | 12 | 384 × 32 | `1536px 128px` | 0,96 s | 1 passe, tenue |
| bas-droit | `slime-splat-br.png` | 12 | 384 × 32 | `1536px 128px` | 0,96 s | 1 passe, tenue |

Chacune : deux frames d'impact, puis quatre oscillations amorties, puis la pose tenue.

## Comment c'est dessiné

Un coin n'est pas la somme de deux plaquages : la matière n'a plus qu'une direction
pour s'échapper, la diagonale. La forme est donc un quart de disque dont l'arête libre
s'aplatit sous la poussée, tandis que la portée le long des deux parois passe de 18 à
25 pixels.

Deux détails qui font la lecture :

1. **L'ombre suit les deux parois à la fois**, sur un pixel de large. C'est ce liseré,
   plus que la silhouette, qui fait comprendre que la forme est bloquée et non
   simplement posée.
2. **Le visage remonte le long de la diagonale**, seul endroit où il reste de la place.
   Les yeux se pincent en traits verticaux sur les deux frames d'impact.

**Aucun mur n'est dessiné.** Les deux côtés plats sont les bords mêmes du PNG : le
sprite doit toucher exactement les deux bords de la fenêtre. Toute marge ou tout
`padding` sur le conteneur laisse un vide visible et l'illusion tombe.

## Détection : les coins d'abord

```js
var r = x >= maxX, l = x <= minX, b = y >= maxY, t = y <= minY;
if (t && l)      set("splat-tl");   // les coins AVANT les bords simples,
else if (t && r) set("splat-tr");   // sinon un coin se lit toujours
else if (b && l) set("splat-bl");   // comme un mur
else if (b && r) set("splat-br");
else if (r) set("splat-right");
else if (l) set("splat-left");
else if (b) set("splat-floor");
else if (t) set("splat-ceiling");
```

Et le garde-fou commun à toute l'interaction : ne réassigner la classe que si l'état
change réellement, sinon chaque `pointermove` remet l'animation à sa première frame.

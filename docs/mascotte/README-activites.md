# Mascotte slime — activités

Six sprite sheets d'actions, à distinguer des expressions : une émotion se lit sur le
visage, une activité demande un accessoire. À 32×32, un objet lisible coûte au moins
cinq pixels de large, donc le corps rétrécit pour lui faire de la place.

Trois de ces six viennent de la version illustrée du portfolio (le vélo, la barre de
l'exosquelette, le train), les trois autres sont de la vie de développeur.

## Format

| propriété | valeur |
| --- | --- |
| grille source | 32 × 32 px par frame |
| affichage recommandé | 128 × 128 px (agrandissement ×4) |
| agrandissements valides | multiples entiers seulement : ×2, ×3, ×4, ×8 |
| disposition | une seule ligne, frames de gauche à droite |
| fond | transparent |
| lissage | interdit — `image-rendering: pixelated` obligatoire |
| sol du personnage | ligne y = 27 de la grille (le corps est posé, pas centré) |

## Palette

| rôle | hex |
| --- | --- |
| base | `#F5B83B` |
| ombre | `#C98F1E` |
| lumière | `#FFD98A` (accessoires : ballon, tasse, disques, blocs, fenêtres) |
| encre | `#242538` (visage, roues du train) |

## Les six feuilles

| état | fichier | frames | feuille | background-size | durée | boucle |
| --- | --- | --- | --- | --- | --- | --- |
| goal | `slime-goal.png` | 24 | 768 × 32 | `3072px 128px` | 1,44 s | 1 passe |
| bike | `slime-bike.png` | 16 | 512 × 32 | `2048px 128px` | 0,96 s | infinie |
| coffee | `slime-coffee.png` | 20 | 640 × 32 | `2560px 128px` | 1,20 s | 1 passe |
| lift | `slime-lift.png` | 24 | 768 × 32 | `3072px 128px` | 1,44 s | 1 passe |
| juggle | `slime-juggle.png` | 16 | 512 × 32 | `2048px 128px` | 0,96 s | infinie |
| train | `slime-train.png` | 24 | 768 × 32 | `3072px 128px` | 1,44 s | 1 passe |

### Contenu de chaque animation

- **goal** — deux frames pour faire pousser les pieds, trois d'appui arrière, une
  seule de contact : la jambe s'allonge de sept pixels sur cette frame et sur aucune
  autre. Le ballon suit ensuite six positions jusqu'au fond du but, où il reste
  visible pendant les deux bonds de célébration — un ballon qui sort du cadre ne
  raconte rien, on ne sait pas s'il est entré. Le but occupe x 20 à 31, plus large que
  haut, et sa maille est dessinée à 30 % d'opacité : à pleine intensité elle mange la
  mascotte.
- **bike** — les roues font onze pixels de diamètre, minimum pour qu'un cercle reste
  un cercle. Un seul rayon clair tourne d'un huitième de tour par frame : deux rayons
  donneraient un effet stroboscopique, aucun rendrait la roue immobile. Les pédales
  alternent en opposition et le corps rétrécit d'un cinquième pour tenir sur le cadre.
- **coffee** — la tasse monte en cinq frames, la gorgée en tient cinq, la redescente
  quatre. Puis le coup de fouet : trois frames où le corps s'étire de vingt pour cent,
  yeux écarquillés. Sans ce sursaut l'animation ne raconte que « boire » ; avec, elle
  raconte la caféine.
- **lift** — clin d'œil à l'exosquelette. Trois frames accroupies, cinq d'arraché,
  huit de tenue tremblante à un pixel d'écart par frame, cinq de reposé, trois de
  soulagement. La barre est l'objet le plus lisible du lot parce qu'elle est
  horizontale : à cette taille, l'horizontale pardonne beaucoup plus que la diagonale.
- **juggle** — trois blocs sur la même parabole, décalés d'un tiers de cycle. Le corps
  perd un cinquième de sa taille pour que l'arc entier tienne dans la frame : sinon le
  sommet se fait couper, et un bloc qui disparaît en haut casse l'illusion. Le regard
  suit le bloc le plus haut, les mains se relèvent en alternance.
- **train** — quatre frames d'attente avec le phare qui grossit au loin, cinq
  d'arrivée en freinant, quatre où le slime rétrécit dans l'embrasure de la porte,
  sept de départ, puis un quai vide. C'est la seule animation qui se termine sans
  mascotte : elle fait la paire avec `drop`, qui la fait arriver.

### Principes de timing appliqués

1. Pas de cadence uniforme : les poses de tenue sont dupliquées sur plusieurs frames.
2. Une seule frame pour l'instant décisif (le contact du pied, le flash) — c'est la
   rareté qui donne l'impact, pas la durée.
3. Montée et descente asymétriques.
4. Mouvement secondaire à contresens du mouvement principal.
5. Dernière frame égale à la pose de repos pour les passes uniques (sauf `train`).

## Où les brancher

| quand | alors | pourquoi |
| --- | --- | --- |
| commande longue en cours | `juggle` | plus vivant que trois points de chargement |
| fiche de l'exosquelette ouverte | `lift` | l'objet renvoie au projet |
| ligne du parcours affichée | `bike` | le vélo fait partie de l'histoire racontée |
| retour après une longue inactivité | `coffee` | enchaîne mieux que de rejouer la veille |
| easter egg trouvé | `goal` | récompense franche, une seule passe |
| `exit` ou `clear` | `train` | la mascotte quitte l'écran, le quai reste vide |
| fin du boot | `drop` (lot expressions) | la mascotte arrive |

Aucune de ces activités ne devrait se déclencher au hasard : une activité raconte
quelque chose, donc elle a besoin d'un contexte, sinon elle passe pour un gadget.
Les états aléatoires doivent rester le clin d'œil et le saut.

Deux pièges :

- **Rejouer la même animation** ne la redémarre pas. Forcer
  `el.style.animation = "none"`, lire `el.offsetWidth`, puis réassigner.
- **`prefers-reduced-motion`** : couper les passes rapides et ne garder que les
  boucles lentes, ou rien du tout. La frame 1 de chaque feuille reste une pose
  correcte — sauf `train`, dont la frame 1 est la mascotte seule en attente.

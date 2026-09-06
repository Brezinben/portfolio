# Mascotte slime — expressions de commande

Six sprite sheets pour les émotions déclenchées par une commande du terminal.
Parce qu'elles ne réagissent pas à un survol mais à une action, elles peuvent durer :
16 à 24 frames au lieu de 12, avec de vraies phases (attaque, tenue, retour) plutôt
qu'une simple boucle.

Les deux autres émotions du terminal, `idle` et `sleep`, sont livrées dans le lot
principal de la mascotte.

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
| lumière | `#FFD98A` |
| encre | `#242538` |

## Les six feuilles

| état | fichier | frames | feuille | background-size | durée | boucle |
| --- | --- | --- | --- | --- | --- | --- |
| alert | `slime-alert.png` | 16 | 512 × 32 | `2048px 128px` | 0,96 s | 1 passe |
| happy | `slime-happy.png` | 20 | 640 × 32 | `2560px 128px` | 1,20 s | 1 passe |
| laugh | `slime-laugh.png` | 24 | 768 × 32 | `3072px 128px` | 1,44 s | infinie |
| sad | `slime-sad.png` | 24 | 768 × 32 | `3072px 128px` | 2,88 s | infinie |
| scared | `slime-scared.png` | 20 | 640 × 32 | `2560px 128px` | 1,00 s | infinie |
| drop | `slime-drop.png` | 24 | 768 × 32 | `3072px 128px` | 1,44 s | 1 passe |

### Contenu de chaque animation

- **alert** — le sursaut : une frame d'écrasement, une de détente trop haute, puis le
  point d'exclamation apparaît et le corps se stabilise. Les six dernières frames
  servent à deux coups d'œil, à gauche puis à droite. C'est ce balayage du regard, et
  non le sursaut, qui fait comprendre qu'il cherche quelque chose.
- **happy** — deux bonds, le second à moitié moins haut, avec écrasement au départ et
  à l'arrivée. Au sommet seulement, les yeux se plissent, la bouche s'élargit et trois
  étincelles marquent l'apex. Garder la joie pour les sommets évite l'effet
  « masque souriant » d'une expression tenue en permanence.
- **laugh** — quatre cycles de six frames dont l'amplitude alterne fort-faible, pour
  que le rire ne devienne pas un métronome. Le corps bascule vers l'avant en
  s'écrasant ; la bouche s'ouvre en grand sur les deux frames de bascule maximale.
- **sad** — l'affaissement occupe la moitié de la boucle : la hauteur perd un tiers,
  la largeur en gagne autant. La larme naît sous l'œil, grossit sur quatre frames,
  tombe en six, puis s'étale au sol. Le retour à la forme initiale est plus lent que
  l'affaissement.
- **scared** — le corps se referme (six pixels de moins en largeur), tremble de deux
  pixels à chaque frame, les yeux restent écarquillés. Les traits de vibration de
  chaque côté et la goutte qui glisse sur le flanc sont indispensables : sans eux, le
  tremblement passe pour un défaut d'affichage.
- **drop** — l'arrivée : six frames de chute étirée depuis le haut du cadre, deux
  frames de flaque à l'impact avec la poussière qui s'écarte, puis onze frames
  d'oscillation amortie à volume constant (quand la hauteur monte, la largeur baisse
  d'autant). Les yeux passent d'écarquillés à fermés, puis mi-clos avant de rouvrir.

### Principes de timing appliqués

1. Pas de cadence uniforme : les poses de tenue sont dupliquées sur plusieurs frames.
2. Une seule frame d'anticipation avant une action rapide.
3. Montée et descente asymétriques : la chute couvre plus de pixels par frame.
4. Mouvement secondaire toujours à contresens du mouvement principal.
5. L'expression est réservée aux extrêmes du mouvement, pas tenue tout du long.
6. Première et dernière frame compatibles pour les boucles ; dernière frame égale à la
   pose de repos pour les passes uniques.

## Branchement

Ces six états correspondent aux émotions déjà nommées dans le terminal.

Les trois bouclées (`laugh`, `sad`, `scared`) demandent une durée d'affichage
explicite, sinon elles tournent indéfiniment : deux à trois cycles suffisent avant de
revenir au repos.

Deux pièges :

- **Rejouer la même animation** ne la redémarre pas. Forcer
  `el.style.animation = "none"`, lire `el.offsetWidth`, puis réassigner.
- **`prefers-reduced-motion`** : couper les passes rapides (`alert`, `drop`,
  `scared`) et ne garder que les boucles lentes, ou rien du tout. La frame 1 de chaque
  feuille reste une pose correcte.

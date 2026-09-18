# L'alerte de déblocage et sa file

Status: ready-for-agent
Type: task
Blocked by: 04

Un bandeau ancré **en bas du volet de sortie**. Pas au centre de la page : le centre
recouvre la session que le visiteur est en train de lire.

## La forme

- Pleine largeur du volet, à angle droit en haut, et il épouse le rayon de la zone en bas.
- Filet d'accent de 2 px à gauche.
- **Aucune ombre portée.** Il n'y en a nulle part ailleurs dans le terminal.
- Contenu : l'icône du succès, la mention `succès débloqué`, le titre, le déclencheur, et
  un curseur bloc qui clignote.

Elle est cliquable, et elle ouvre la modale. Le bandeau est donc un `<button>`, dans un
conteneur `role="status"` : le lecteur d'écran annonce le texte, et le bouton garde son
rôle.

## La file

**Chaque succès a son alerte.** Deux déblocages rapprochés font la queue au lieu de
s'écraser. Une seule alerte à l'écran, dix secondes chacune.

La sortie n'est jouée que si **rien n'attend derrière**. Jouer une disparition pour la
recouvrir aussitôt ne se voit pas, et coûte une demi-seconde à chaque entrée de la file.

L'alerte appartient au moment du déblocage. Une clé écrite par la page 404 dans un autre
onglet ne la rejoue pas au chargement suivant : le badge s'en charge. Voir la spec.

## L'animation

Une grille de **20 × 6** cases couleur panneau couvre la boîte **entière** et s'efface
case par case, sans fondu, de gauche à droite, avec un grain d'aléatoire. Le bandeau se
construit au lieu d'apparaître.

Trois pièges, tous déjà payés par le design :

1. **Le masque doit couvrir le bord.** Posé à l'intérieur du bouton, le cadre et le filet
   d'accent apparaissent avant leur contenu, et l'effet tombe.
2. **La sortie a besoin de sa propre image-clé.** Réutiliser celle de l'entrée en
   `reverse` ne redémarre rien, et le bandeau disparaît d'un coup.
3. **Le tirage aléatoire se fait une fois par déblocage.** Recalculé à chaque rendu, il
   repart de zéro au moindre changement d'état voisin.

Les retards, mesurés à l'œil dans `maquette/animation.css` :

| | retard | grain | case |
| --- | --- | --- | --- |
| entrée | `(col / cols) × 300 ms` | 170 ms | 120 ms |
| sortie | `(1 − col / cols) × 460 ms` | 190 ms | 160 ms |

La sortie s'étale davantage que l'entrée. À 470 ms, personne ne la voit.

**Une case ne porte qu'une propriété personnalisée**, son retard. La durée et les
images-clés vivent dans la feuille. Le chantier `.scratch/refonte-css/` sort le style du
balisage ; cent vingt attributs `style=` iraient contre lui.

## Les deux coupures

`anim: off` et `prefers-reduced-motion` retirent la grille de masques **entièrement**.
L'alerte apparaît et disparaît sèchement. Ce n'est pas une dégradation, c'est le
comportement attendu. Elle reste lisible et cliquable.

`out: off` retire le volet de sortie, donc l'alerte. Rien ne se replie sur le journal, et
le volet ne se rouvre pas. Le badge du pied porte le signal. Décision de Benjamin.

## Critère d'acceptation

Deux déblocages rapprochés donnent deux alertes, l'une après l'autre. Rien ne recouvre la
session en cours de lecture.

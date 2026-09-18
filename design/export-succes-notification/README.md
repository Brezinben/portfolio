# Succès — badge, modale, alerte de déblocage

> **Ce dossier est une référence, pas une implémentation.**
> Ne reprends pas le code de la maquette, ne reprends pas mon découpage, ne reprends pas
> mes noms. Ce qui a de la valeur ici, ce sont les **décisions** : ce qui a été essayé,
> ce qui a été refusé, les valeurs réglées à l'œil, et les pièges déjà payés.
> **Le projet a le dernier mot sur toute l'implémentation.** Si une proposition entre en
> conflit avec les conventions de `src/`, avec les tests, ou avec le budget de poids,
> c'est le projet qui tranche et ce document qui a tort.

| fichier | rôle |
| --- | --- |
| `README.md` | les trois pièces, leurs états, les valeurs, les critères d'acceptation |
| `DECLENCHEURS.md` | les trente succès et ce qui les débloque |
| `maquette/icones.json` | les trente-deux icônes en données — la seule chose qui se reprend telle quelle |
| `maquette/animation.css` | les images-clés de l'alerte, commentées, à titre indicatif |

L'écran de conception correspondant est `Succes - notification.dc.html` : il se manipule,
avec un bouton pour débloquer un succès à la demande.

---

## 1. Les trois pièces

### Le badge du pied

Une coupe et un compteur, dans le pied de page, à gauche des liens de variantes.

- Le compteur sépare l'acquis du total par un **pipe** : `6 | 30`. L'acquis prend l'ambre
  textuel, le total reste en retrait. Une barre oblique se lisait comme une fraction ; ce
  n'en est pas une, c'est une progression.
- Tant qu'un succès débloqué n'a pas été **regardé**, la coupe s'agite toutes les deux
  secondes et une pastille d'accent apparaît en coin. La relance s'arrête **au clic**, pas
  au bout d'un minuteur : c'est la seule chose qui rappelle qu'il s'est passé quelque
  chose si le visiteur a raté l'alerte.
- Deux compteurs distincts derrière : ce qui est **acquis**, et ce qui a été **vu**. Les
  confondre supprime la relance.

### La modale

La liste des trente, verrouillés compris.

- Trois colonnes : le rang sur deux chiffres, l'icône 32 px, le titre et son déclencheur.
- Un succès verrouillé garde son rang et son cadenas, son titre devient `???` et son
  sous-titre une suite de `???` de longueur variable — une liste de longueurs identiques
  fait grille de mots croisés.
- **États séparés, un signal chacun** : survol = fond `--acc-soft` ; focus = contour de
  2 px en accent, posé à l'intérieur (`outline-offset: -2px`), jamais arrondi ;
  barre d'accent à gauche = **sélection**. Comme rien n'est sélectionnable dans cette
  liste, la gouttière de 2 px reste transparente — elle garde l'alignement pour le jour
  où un état sélectionné arrive.
- Pas de mise en avant du « nouveau » dans la liste. Essayé, retiré : le neuf se signale
  au badge, et là seulement.
- Clavier : le focus **entre** dans la modale à l'ouverture (sinon `échap` et `tab`
  restent à la page derrière), les flèches parcourent la liste comme celle des sections,
  `tab` boucle dedans, `échap` ferme et rend le focus au badge.

### L'alerte de déblocage

Un bandeau ancré **en bas du volet de sortie**, pas au centre de la page : le centre
recouvre la session qu'on est en train de lire.

- Pleine largeur du volet, **à angle droit en haut**, et il épouse le rayon de la zone en
  bas. Filet d'accent de 2 px à gauche. **Aucune ombre portée** — il n'y en a pas ailleurs
  dans le terminal.
- Contenu : l'icône du succès, la mention `succès débloqué`, le titre, le déclencheur, et
  un curseur bloc qui clignote.
- Cliquable : elle ouvre la modale.
- **Dix secondes** à l'écran, puis elle s'en va.
- **Chaque succès a son alerte** : deux déblocages rapprochés font la queue au lieu de
  s'écraser. La sortie n'est jouée que si rien n'attend derrière — on ne joue pas une
  disparition pour la recouvrir aussitôt.

## 2. L'animation, et pourquoi celle-là

Trois effets ont été essayés avant :

1. **Reflet glissé** sur le bandeau — refusé, c'est une convention d'interface web.
2. **Impression par paliers** (`clip-path` qui avance) — correcte, mais c'est un balayage.
3. **Matérialisation par blocs** — retenue.

Une grille de 20 × 6 cases couleur panneau couvre la boîte entière et s'efface case par
case, sans fondu, de gauche à droite, avec un grain d'aléatoire : le bandeau se construit
au lieu d'apparaître. La sortie rejoue la même chose à l'envers, depuis la droite.

Trois pièges, tous payés :

- **Le masque doit couvrir le bord.** Posé à l'intérieur du bouton, le cadre et le filet
  d'accent apparaissent avant leur contenu, et l'effet tombe.
- **La sortie a besoin de sa propre image-clé.** Réutiliser celle de l'entrée en `reverse`
  ne redémarre rien : le navigateur évalue la nouvelle durée depuis l'ancien départ, déjà
  terminé, et le bandeau disparaît d'un coup.
- **Le tirage aléatoire se fait une fois par déblocage.** Recalculé à chaque rendu, il
  repart de zéro au moindre changement d'état voisin.

Valeurs réglées à l'œil, dans `maquette/animation.css`. La sortie s'étale plus que
l'entrée : à 470 ms, personne ne la voit.

## 3. Les icônes

Trente-deux icônes en pixel art sur une grille 16 × 16, rendues ×2 dans un viewBox
32 × 32 — la grille d'une frame de mascotte.

Chaque icône est une pile de **calques** peints dans l'ordre : volume, couleur, contour,
reflet en dernier. Cinq teintes, toutes dérivées du thème, **aucune couleur en dur** :
l'encre suit le texte, l'accent suit le thème, l'ombre est l'accent fondu vers le panneau,
le reflet l'accent éclairci, et une sixième teinte perce un trou à la couleur du panneau.

Les données sont dans `maquette/icones.json`. C'est la seule chose de ce dossier qui se
reprend telle quelle — et encore : le format de rendu (SVG inline, sprite, symboles) est
une décision du projet, pas la mienne.

Deux remarques d'usage :

- Le volume des objets matériels (théière, enveloppe, manette, touches, livre) est en
  teinte **neutre**, pas en accent fondu : l'accent posé dessus doit ressortir.
- Sur les trois thèmes clairs, le reflet est moins blanc — sinon il disparaît dans le
  panneau.

## 4. Critères d'acceptation

- [ ] Aucun succès ne se débloque sans une action volontaire du visiteur.
- [ ] Deux déblocages rapprochés donnent deux alertes, l'une après l'autre.
- [ ] Le badge s'agite jusqu'à l'ouverture de la modale, et pas une seconde de plus.
- [ ] Le focus entre dans la modale à l'ouverture et revient au badge à la fermeture.
- [ ] `anim: off` et `prefers-reduced-motion` : aucune animation, et l'alerte reste
      lisible et cliquable.
- [ ] Les huit thèmes : aucune couleur en dur, icônes lisibles sur clair comme sur sombre.
- [ ] Un succès déjà obtenu le reste après rechargement, et son libellé peut changer sans
      le re-verrouiller.
- [ ] Rien ne recouvre la session en cours de lecture.

## 5. Ce qui reste à trancher — côté projet

1. **Le total.** Trente ici, le pied affichait `0/25` dans une version précédente. Quatre
   succès dépendent de fonctionnalités qui n'existent pas encore (voir `DECLENCHEURS.md`).
2. **Le marquage.** Un événement par succès débloqué est tentant ; un compteur de
   progression suffit peut-être, et pèse moins.
3. **Le son.** Aucune alerte sonore proposée. Si l'idée revient, elle doit être coupée par
   défaut.
4. **Le partage.** « 12 succès sur 30 » est une bonne ligne pour la commande `share`, mais
   c'est une décision de contenu.

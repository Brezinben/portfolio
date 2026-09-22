# Le visiteur n'atteint pas la réponse, et ne peut rien vérifier

Status: done

## Problem Statement

Je suis développeur, je cherche des missions, et mon portfolio est ma seule vitrine. Une
revue au navigateur, sur la version terminal servie, montre six points où le visiteur perd
soit la réponse, soit confiance.

**Il tape la commande que je lui recommande, et il ne voit pas la réponse.** Le pied de
page, les messages d'erreur et la barre d'état pointent tous vers `help`. Sur un écran de
1440 × 900, la réponse de `help` fait neuf lignes brutes et le journal fait 119 px. Le
visiteur voit quatre lignes coupées en haut. Au même instant, le résultat garde 400 px de
vide au-dessus, parce qu'il montre encore la section ouverte. La place est là, la réponse
est ailleurs. Sur téléphone le journal s'ouvre à la hauteur de sa réponse, et le défaut
n'existe pas : c'est un défaut de la mise en page à deux colonnes.

**Sur téléphone, choisir une section ne montre pas le résultat.** La colonne empilée met le
volet central en tête, puis les options, les sections, les missions, la sortie. Le visiteur
descend jusqu'à la liste des sections, touche `impact`, et reste devant la liste. Le
résultat est rendu hors écran, au-dessus. La page ne défile pas. Il doit remonter à
l'aveugle pour lire ce qu'il vient de demander.

**Rien de ce que j'affirme n'est vérifiable.** La fiche Assist'enGare annonce « 96 % de
conformité moyenne au RGAA 4.1, déclaration publique ». La déclaration est en ligne, elle
n'est pas liée. `fruggr` n'est pas lié. `herdr` n'est pas lié. Le dépôt de ce portfolio
n'est pas lié. La version terminal ne contient aucun lien sortant : la coquille ne sait pas
en dessiner. J'écris « prouver par le code ce qu'une licence coûteuse ne ferait qu'à
moitié », et le visiteur n'a pas une ligne de code à ouvrir. La commande `cv` répond « le
CV arrive », puis ouvre `whoami` : la pièce la plus attendue d'un portfolio est un talon.

**Le visiteur ne sait pas si je suis disponible.** `whoami` dit « Disponible pour des
missions en numérique responsable ». La frise dit Kereis « en cours », depuis mai 2026. Un
recruteur ne peut pas trancher entre un profil en poste et un profil libre. Il n'y a ni
date, ni type de contrat, ni délai.

**La page principale n'a ni `h1`, ni `main`.** Un scan axe sans filtre en donne trois :
`landmark-one-main`, `page-has-heading-one`, `region`. Ces règles sont hors WCAG, donc
`tests/browser/a11y.spec.ts` ne les voit pas : il filtre sur `wcag2a`, `wcag2aa`, `wcag21a`
et `wcag21aa`. La section `impact` annonce pourtant « structure sémantique ». La version
texte, elle, porte les deux et passe un scan complet. L'écart se voit et il est petit.

**Le boot ne s'écourte pas, même quand le visiteur demande moins de mouvement.** Le boot
dure au minimum deux secondes, valeur figée. Ni la touche ni le clic ne l'abrègent. Sous
`prefers-reduced-motion: reduce`, il dure toujours trois secondes mesurées : les animations
CSS s'arrêtent, l'attente reste. La section `impact` annonce « animations désactivables ».
Un visiteur qui a réglé son système attend quand même devant un log de boot qu'il n'a pas
demandé.

## Solution

Six corrections, sur les deux seams existants. Aucune ne change la nature du site : la
version terminal garde ses trois volets, ses six sections, ses quatre missions, sa
mascotte, ses huit thèmes et sa carte du clavier.

**Une commande peut réclamer le résultat.** L'interpréteur gagne le droit de dire où sa
réponse se lit. `help` réclame le résultat ; toutes les autres commandes gardent le
journal. Le résultat cesse d'être réservé à la section ouverte : il montre la dernière
chose qui l'a réclamé.

**Le résultat vient au visiteur.** Sur la colonne empilée, choisir une section ou une
mission amène le résultat à l'écran. Le visiteur voit ce qu'il a demandé sans remonter.

**Les affirmations deviennent cliquables.** Une ligne brute peut porter un lien. La
déclaration RGAA de Gares & Connexions, `fruggr`, `herdr`, le dépôt de ce portfolio et les
briques de la stack qui ont une source publique deviennent des liens sortants. La commande
`cv` sert un vrai document au lieu d'annoncer son absence.

**`whoami` dit ma disponibilité.** Une ligne, datée, qui nomme le statut et le type de
mission recherché. Elle lève la contradiction avec la frise.

**La page principale porte un `h1` et un `main`.** Le scan axe s'élargit aux règles de
bonne pratique, pour que la régression se voie au prochain changement.

**Le boot obéit au visiteur.** Une touche ou un clic l'abrège. Sous mouvement réduit, il ne
dure que le temps du chargement du contenu.

## User Stories

1. En tant que visiteur sur écran large, je veux que la réponse de `help` s'affiche dans le
   résultat, afin de la lire en entier sans faire défiler le journal.
2. En tant que visiteur, je veux que la barre d'état nomme la commande qui occupe le
   résultat, afin de savoir ce que je regarde.
3. En tant que visiteur, je veux que le journal garde l'écho de `help` et sa mesure, afin
   que l'historique reste complet.
4. En tant que visiteur, je veux qu'ouvrir une section après `help` remplace la réponse par
   la section, afin que le résultat ne montre jamais deux choses à la fois.
5. En tant que visiteur au clavier, je veux que le résultat annonce son changement de
   contenu, afin de ne pas rater la réponse sous lecteur d'écran.
6. En tant que visiteur sur téléphone, je veux que toucher une section amène le résultat à
   l'écran, afin de lire ma réponse sans remonter la page.
7. En tant que visiteur sur téléphone, je veux que toucher une mission amène sa fiche à
   l'écran, afin que le comportement soit le même pour les deux listes.
8. En tant que visiteur sur téléphone, je veux que le volet gauche reste atteignable après
   ce déplacement, afin de choisir une autre section sans revenir en arrière.
9. En tant que visiteur sur téléphone qui demande moins de mouvement, je veux que ce
   déplacement soit immédiat et non animé, afin que le réglage de mon système soit tenu.
10. En tant que visiteur sur écran large, je ne veux aucun déplacement de la page au
    changement de section, afin que la mise en page à trois volets reste stable.
11. En tant que recruteur, je veux ouvrir la déclaration d'accessibilité de Gares &
    Connexions depuis la fiche Assist'enGare, afin de vérifier les 96 % annoncés.
12. En tant que recruteur, je veux ouvrir le dépôt de ce portfolio, afin de juger le code
    plutôt que la page.
13. En tant que développeur curieux, je veux ouvrir la source de `herdr`, de `fruggr` et
    des briques qui en ont une, afin de voir ce dont je parle.
14. En tant que visiteur au clavier, je veux atteindre chaque lien par tabulation avec un
    focus visible, afin de naviguer sans souris.
15. En tant que visiteur au doigt, je veux que chaque lien fasse au moins 44 px de haut,
    afin de le toucher du premier coup.
16. En tant que visiteur sous lecteur d'écran, je veux qu'un lien sortant s'annonce comme
    un lien et porte un nom qui se comprend hors contexte, afin de savoir où il mène.
17. En tant que visiteur, je veux qu'un lien sortant s'ouvre sans perdre le terminal, afin
    de revenir à ma lecture.
18. En tant que recruteur, je veux télécharger un CV depuis la commande `cv`, afin de le
    joindre à un dossier.
19. En tant que recruteur, je veux que le CV soit aussi atteignable depuis la section
    `contact` et depuis la version texte, afin de ne pas avoir à connaître la commande.
20. En tant que responsable du budget de poids, je veux que le CV ne parte pas au premier
    chargement, afin que la page reste sous son plafond.
21. En tant que recruteur, je veux lire en une ligne si Benjamin est disponible, à partir de
    quelle date et pour quel type de mission, afin de décider s'il faut le contacter.
22. En tant que recruteur, je veux que cette ligne ne contredise pas la frise, afin de ne
    pas douter de la fraîcheur du portfolio.
23. En tant que propriétaire du contenu, je veux que cette ligne vive dans `content.json`,
    afin de la changer sans redéploiement.
24. En tant que visiteur sous lecteur d'écran, je veux que la page principale porte un titre
    de niveau un, afin de savoir de qui parle ce site dès la première touche.
25. En tant que visiteur sous lecteur d'écran, je veux que le contenu tienne dans des
    repères, afin de sauter d'une zone à l'autre.
26. En tant que mainteneur, je veux que le scan axe couvre aussi les règles de bonne
    pratique, afin qu'une régression de structure échoue en intégration.
27. En tant que mainteneur, je veux que ce scan élargi passe sur les huit thèmes, afin de ne
    pas corriger un thème contre un autre.
28. En tant que visiteur pressé, je veux abréger le boot d'une touche ou d'un clic, afin
    d'arriver au contenu tout de suite.
29. En tant que visiteur qui demande moins de mouvement, je veux que le boot ne dure que le
    chargement du contenu, afin que le réglage de mon système soit tenu jusqu'au bout.
30. En tant que visiteur, je veux que le boot abrégé mène au même terminal qu'un boot
    complet, afin qu'aucune section ne manque.
31. En tant que visiteur dont le contenu ne charge pas, je veux que l'écran de panique
    s'affiche même après une abréviation, afin de ne pas rester devant une page vide.
32. En tant que visiteur qui abrège le boot, je veux que la touche ne parte pas aussi dans
    la ligne de saisie, afin de ne pas taper une commande sans le vouloir.

## Implementation Decisions

**La destination de la réponse se décide dans l'interpréteur.** `Outcome` gagne un champ
facultatif `result?: ContentLine[]`. Quand il est présent, la coquille pose ces lignes dans
le résultat, à travers le chemin de mise en forme existant. Quand il est absent, rien ne
change. Ce choix garde la décision au seam le plus haut, couvert sans navigateur.

**Le résultat prend des lignes brutes, pas des lignes de journal.** `result` porte des
`ContentLine`, la même forme que `content.json` écrit pour une section. La coquille garde
un seul chemin de rendu pour le résultat, et le bandeau, les jetons et la ligne simple
continuent de fonctionner.

**Le journal garde l'écho et la mesure.** Une commande qui réclame le résultat écrit quand
même son écho dans le journal, et fait monter la jauge de contexte. Seul le corps de la
réponse change de place. `lines` reste rempli pour cet écho.

**Le résultat appartient à la dernière demande.** Un choix de section ou de mission reprend
le résultat. La coquille tient l'état « le résultat vient d'une commande », qui retombe dès
la navigation suivante. La barre d'état affiche `~/help` tant que la réponse occupe le
résultat.

**`help` est la seule commande de cette spec qui réclame le résultat.** Le mécanisme est
générique, l'usage ne l'est pas. `?` est un alias, il suit.

**Le déplacement du résultat se fait dans la coquille, sur la colonne empilée seulement.**
Après un choix de section ou de mission, la coquille amène le résultat à l'écran. Elle ne
le fait que quand les volets sont empilés, sous 900 px. Sur trois colonnes le résultat est
déjà visible, et un déplacement casserait la mise en page qui ne dépasse jamais la fenêtre.
Sous mouvement réduit, le déplacement est immédiat.

**Une ligne brute peut porter un lien.** `ContentLine` gagne `href?: string`. Le rendu
dessine un élément intérieur `a`, à angle droit, focalisable, d'au moins 44 px de haut.
C'est le premier lien de la version terminal : la coquille n'en dessinait aucun. Le nom
accessible du lien reprend le texte de la ligne, complété par la cible quand le texte seul
ne suffit pas.

**Les liens sortants vivent dans `content.json`.** Aucune URL en dur dans la coquille. Les
fiches de mission, les fiches techno et la section `contact` portent leurs `href`.

**Le CV est un fichier servi, au nom figé.** L'effet `cv` existe déjà et ouvre `whoami` : il
ouvre désormais le document. Le nom du fichier rejoint `FIXED_NAMES` dans la construction,
comme `content.json` et `apple-touch-icon.png` : c'est un contrat avec l'extérieur, il ne
prend pas d'empreinte. Le document ne part pas au premier chargement.

**La disponibilité est une ligne de `whoami` dans `content.json`.** Pas de nouveau champ de
profil, pas de nouvelle section. La ligne porte la date et le type de mission. La version
texte et `llms-full.txt` la reprennent, puisqu'ils recopient les mêmes faits.

**Le `h1` et le `main` vivent dans le squelette servi, pas dans le rendu.** La version
terminal les porte dès `index.html`, avant que la coquille démarre. Le `h1` porte le nom,
visuellement masqué si la maquette ne peut pas l'accueillir : le bandeau de `whoami` est
une image de points, il ne remplace pas un titre. Le `main` enveloppe les trois volets. Le
lien de saut vers la version texte reste le premier élément focalisable.

**Le scan axe s'élargit.** `tests/browser/a11y.spec.ts` cesse de filtrer sur les seules
étiquettes WCAG. Les règles écartées, s'il en reste, sont écartées une par une, avec la
raison écrite à côté.

**Le boot devient interruptible et sensible au mouvement réduit.** `BOOT_MS` reste une
valeur figée pour le cas nominal. Deux sorties s'ajoutent : une touche ou un clic pendant
le boot le termine ; `prefers-reduced-motion: reduce` réduit le plancher à zéro, et le boot
ne dure alors que le chargement du contenu. La touche qui abrège le boot est consommée :
elle ne part pas dans la ligne de saisie. L'écran de panique garde la priorité : un contenu
absent ou malformé affiche la panique, abréviation ou non.

**`CONTEXT.md` change.** L'entrée **Boot** dit « dure au minimum deux secondes ». Elle doit
dire que ce plancher tombe sous mouvement réduit, et que le visiteur peut l'abréger. La
glossaire fait foi : le code ne peut pas la contredire en silence.

## Testing Decisions

Un bon test décrit ce que le visiteur observe. Il nomme une commande, une touche ou une
taille de fenêtre, puis affirme ce que la page rend. Il ne lit pas un champ privé de l'état
du terminal, il ne compte pas les appels d'une fonction, et il ne fige pas une valeur que
la maquette peut légitimement bouger.

**Seam interpréteur, `tests/unit/interpret.test.ts`.** La destination de la réponse s'y
couvre entièrement : `help` rend un `result` non vide, une commande ordinaire n'en rend
pas, `help` garde son écho dans `lines`. Prior art : les tests de `share` et de
`complete`, qui affirment sur la forme de l'`Outcome` sans navigateur.

**Seam interpréteur, `tests/unit/content.test.ts`.** Le contenu se valide déjà là. Les
`href` ajoutés s'y vérifient : forme d'URL absolue, et aucun `href` vide.

**Seam page, `tests/browser/terminal.spec.ts`.** Le test « le boot dure au moins deux
secondes » encode le comportement actuel. Il doit devenir deux tests : le boot nominal tient
son plancher, et le boot sous mouvement réduit ne le tient pas. Deux tests s'ajoutent :
une touche abrège le boot, et cette touche ne se retrouve pas dans la ligne de saisie.

**Seam page, `tests/browser/boot.spec.ts`.** Un test s'ajoute : un contenu absent affiche la
panique même quand le visiteur abrège le boot.

**Seam page, `tests/browser/layout.spec.ts`.** Sur trois colonnes, la réponse de `help` se
lit en entier dans le résultat, et le journal ne déborde pas. Prior art : « un journal trop
haut rend sa place au résultat au changement de section », qui mesure déjà `clientHeight` et
`scrollHeight`.

**Seam page, `tests/browser/tactile.spec.ts`.** Après un choix de section, puis après un
choix de mission, le résultat est dans la fenêtre. Prior art : le fichier pose déjà un
téléphone de 360 × 640 et mesure des hauteurs de volets. Le test « le journal montre toute
la réponse d'une commande » reste vrai : sur téléphone, `help` continue d'occuper le
résultat, et le journal ne porte que l'écho.

**Seam page, `tests/browser/a11y.spec.ts`.** Le scan élargi tourne sur les huit thèmes, sur
la version terminal et sur la version texte. Le test des 44 px couvre déjà les boutons : il
s'étend aux liens.

**Seam page, `tests/browser/budget.spec.ts`.** Le CV ne part pas au premier chargement, et
le premier chargement reste sous son plafond. Prior art : « le premier chargement ne tire
qu'une image de mascotte », qui compte déjà les requêtes.

**Seam page, `tests/browser/contenu.spec.ts`.** Les liens déclarés dans `content.json`
apparaissent bien dans la fiche qui les porte.

## Out of Scope

- La version anglaise. Aucun `hreflang`, `lang="fr"` reste.
- Les données structurées `JSON-LD` `Person` et `ProfilePage`.
- Le bloc `noscript` de la version terminal. Le lien de saut vers la version texte reste le
  seul repli sans script.
- La réécriture des fiches LDC Services et FPEE Industries, et le retrait de « tout un tas
  de trucs » de `whoami`.
- Le changement d'adresse e-mail vers le domaine.
- Le remplissage du vide vertical sous le résultat et sous la sortie.
- Le comportement de la saisie quand aucun élément n'a le focus. Taper sans cliquer ne
  produit toujours rien ; `/` reste le chemin documenté.
- Toute nouvelle section, toute nouvelle mission, tout nouveau thème.

## Further Notes

Le défaut du journal est propre aux deux colonnes. Sur téléphone, `tests/browser/tactile.spec.ts`
prouve déjà que le journal s'ouvre à la hauteur de sa réponse. Corriger la destination de
`help` ne doit pas casser cette garantie.

Les trois violations axe sont des règles de bonne pratique, pas des échecs WCAG. Le site ne
ment donc pas sur sa conformité. Il annonce quand même « structure sémantique », et la
version texte tient la promesse mieux que la version principale.

Le lien sortant est une première pour la version terminal : la coquille ne dessine
aujourd'hui aucun `a`. Attendre un coût sur l'accessibilité, la taille de cible et le focus,
pas sur le rendu.

`BOOT_MS` est une valeur figée au sens du glossaire. Cette spec ne la transforme pas en
réglage : elle lui ajoute deux sorties, l'une demandée par le visiteur, l'autre demandée par
son système.


## Comments

Livré sur `main`, commits `13de655` à `e77bbe2`. 268 tests navigateur et 137 tests unitaires
au vert, lint et typecheck propres, `bun run build` passé.

Cinq des six corrections sont faites. Les liens de preuve ne le sont pas : ils demandent des
URL exactes, et aucune n'était disponible. Le mécanisme `ContentLine.href` n'a pas été écrit
non plus, faute d'un seul lien à porter — du code sans usage. À reprendre quand la
déclaration RGAA de Gares & Connexions, `fruggr` et `herdr` auront leur adresse.

Le CV ne sera pas un PDF : la commande `cv` ouvre la version texte, qui porte déjà le
parcours complet.

Six corrections sont sorties du périmètre initial, trouvées en chemin :

- La jauge de contexte ne comptait que le journal. Déplacer la réponse de `help` la rendait
  presque gratuite et la compaction ne partait plus.
- La sortie lisait la dernière commande au lieu de la section ouverte, et se vidait.
- La largeur de la colonne des clés se mesurait sur le résultat, donc sur une réponse sans
  sortie : chaque clé passait sous sa valeur.
- La flèche droite menait toujours à la ligne de commande, en passant devant la grille des
  technos et la frise.
- Le contour du focus était rogné à droite : le résultat défile, il n'avait pas la place.
- La bascule des animations restait active sous mouvement réduit, où elle ne peut rien.

Deux décisions de lint ont été prises au passage : `no-duplicate-imports` s'applique
désormais à la source et pas aux tests, et le jeu recommandé de `@stylistic` est appliqué,
moins les huit règles qui contredisent oxfmt. Voir `.scratch/portfolio-production/spec.md`.

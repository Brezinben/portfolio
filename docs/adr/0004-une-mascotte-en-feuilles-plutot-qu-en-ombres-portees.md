# Une mascotte en feuilles plutôt qu'en ombres portées

La mascotte était dessinée en `box-shadow`, un pixel par ombre, sans aucune image. Sept
humeurs, un dessin par humeur, zéro octet de ressource. Nous la remplaçons par neuf feuilles
d'images animées en CSS.

## Le problème

Le dessin en ombres portées ne sait faire que des poses. Chaque humeur est une image fixe,
et le mouvement se limite à ce qu'une transformation CSS peut faire du bloc entier : une
respiration, une ondulation, un glissement. La mascotte ne peut pas sauter, taper, cligner
des yeux ni se déformer.

Un jeu de neuf feuilles a été dessiné pour ce projet. Chacune porte les cases d'une
animation, sur une ligne, en cases de 32 × 32 pixels.

## Options considérées

**Garder les ombres portées.** Coût nul, poids nul, aucune requête. Mais les animations
demandées n'existent pas et ne peuvent pas exister sous cette forme.

**Faire cohabiter les deux.** Les ombres pour la pose fixe, les feuilles pour le mouvement.
Le repli est gratuit et le mouvement réduit ne coûte rien. Rejetée : deux dessins de la même
mascotte à tenir à jour, et deux machines à états.

**Les feuilles livrées telles quelles.** Le dossier fournit un `slime.js` complet, avec sa
machine à états et sa persistance. Rejetée : le composant Alpine tient déjà l'état de la
mascotte. Deux systèmes se disputeraient la même chose.

## La décision

**Les feuilles remplacent entièrement le dessin en ombres portées.** `sprite()`, `MASCOT`,
`FACES` et les humeurs disparaissent. Neuf états prennent leur place. `slime.js` sert de
spécification, il n'est pas livré : le composant Alpine reste seul maître de l'état.

**La mascotte devient décorative.** Elle porte `aria-hidden` en permanence et sort du
parcours clavier. C'est la conséquence assumée du point suivant : ce qui peut disparaître
sans perte n'est pas du contenu.

**Le mouvement réduit la retire, et ne charge aucune feuille.** Ce choix va plus loin que la
préférence ne demande — elle parle de mouvement, pas de contenu. Il est cohérent parce que
la mascotte est décorative, et il économise toutes les images pour les visiteurs concernés.
Sa piste reste en place, vide, pour que la page garde la même silhouette dans les deux modes.

**Le chunk C2PA est retiré des images.** Les fichiers livrés pesaient 94 391 octets, dont
69 240 de métadonnée de provenance. Les pixels seuls font 25 151 octets. Sans ce retrait, le
premier chargement frôlait les 150 Ko du budget.

**Une seule manière de teinter.** `hue-rotate` sur les cinq thèmes sombres, palette ambre
inchangée sur les trois thèmes clairs, où la teinte ne suffirait pas : le filtre tourne la
teinte, pas la clarté. Les trois feuilles peintes à la main pour noctis, azureus et uva sont
supprimées, pour ne pas tenir deux façons de teindre.

**Le CSS des feuilles vit dans la page.** Les chemins passent donc par la réécriture de la
construction et reçoivent l'empreinte de contenu, donc le cache long. Dans un fichier séparé
ils pointeraient dans le vide après construction.

## Ce que cela coûte

Neuf feuilles, 20 074 octets, contre zéro auparavant. Le budget les compte, avec un plafond
propre de 22 Ko. Seule la feuille de repos part au premier chargement, soit 1 693 octets ;
les huit autres arrivent à leur premier déclenchement, au prix d'un temps mort possible.

Sept humeurs disparaissent, redirigées vers les états des feuilles : `happy` et `scared`
vers `jump`, `alert` vers `wink`, `laugh` vers `jump`, `sad` vers `sleep`. Le comportement
reste, le visage change. Chaque humeur doit avoir sa redirection : `/joke` et `/slime laugh`
passent par `interpret.js`, pas par un appel direct dans `app.js`, et une humeur sans
correspondance ramène la mascotte au repos en coupant ce qu'elle faisait.

La déformation visqueuse du glissement est perdue. C'était un effet CSS sur le bloc dessiné,
et aucune feuille ne la couvre.

La teinte par filtre approxime. Le README des feuilles le signale : `hue-rotate` fait aussi
tourner l'encre des yeux. Sur les cinq thèmes sombres, la mascotte n'aura pas exactement les
couleurs d'une feuille peinte à la main.

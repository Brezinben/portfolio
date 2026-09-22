# 9. Des icônes en SVG mis en ligne, plutôt qu'en feuille

**Statut :** acceptée

## Le problème

Les succès demandent trente icônes en pixel art : une par succès, la coupe du badge et
le cadenas des verrouillés. Elles sont dessinées sur la même grille que la mascotte, seize
unités de côté.

La mascotte est déjà résolue : les ADR 0004 et 0006 en font des feuilles PNG fusionnées,
une par forme, tirées à la demande. Reprendre cette réponse ici paraissait évident.

Elle ne marche pas. Une icône de succès porte **cinq teintes dérivées du thème** : l'encre
suit le texte, l'accent suit le thème, l'ombre est l'accent fondu vers le panneau, le
reflet l'accent éclairci, et une sixième teinte perce un trou à la couleur du panneau. Le
site porte huit thèmes. Un PNG les figerait, et il en faudrait huit.

La mascotte n'a pas ce problème : elle est dessinée, pas teintée.

## Options considérées

**Huit feuilles PNG, une par thème.** Huit fois le poids, et un changement de thème
devient une requête réseau. Le thème se change à la flèche dans la modale d'options : la
grille entière défile en quelques secondes.

**Un PNG en masque de transparence.** Une icône devient une couleur unie. Les cinq teintes
demanderaient cinq masques superposés par icône, et le volume des objets matériels se
perdrait.

**Un fichier SVG servi à part, référencé par `<use>`.** C'est la forme qui paraît la plus
propre, et elle ne marche pas : un `<use>` vers un document externe **n'hérite pas des
variables CSS du document hôte**. Les huit thèmes tomberaient en silence, sans erreur et
sans test rouge — le sprite se dessinerait, en une seule couleur.

## La décision

Un fichier `src/assets/succes.svg` qui ne porte que des `<symbol>`, et que la construction
met **en ligne** dans `index.html`, à la place d'un marqueur. C'est le même geste que pour
`src/404.css`, décrit par l'ADR 0002 : la source sort pour être lisible, l'artefact la
remet en ligne.

Chaque teinte est une variable CSS, déclarée une fois sur la racine. Aucune couleur en dur,
aucune règle par thème. Les huit thèmes suivent sans une ligne de plus.

Le fichier est **généré une fois**, par `tools/icones.ts`, depuis l'export du design. Cet
outil ne tourne pas dans la construction : ces données ne bougent qu'au prochain export, et
un pas de construction permanent pour une conversion unique serait spéculatif. La sortie
est commitée, et un test unitaire vérifie que le sprite dessine chaque icône que le
catalogue nomme.

## Ce que cela coûte

2,1 Ko compressés sur le premier chargement, pour toutes les icônes, sur tous les thèmes.
Elles partent même chez qui n'ouvrira jamais la liste. L'import dynamique de l'ADR 0008
n'aurait rien acheté : la première alerte arrive à la première commande, donc le sprite
serait tiré presque aussitôt, et en une requête de plus.

Le dépôt porte maintenant deux façons de servir du pixel art, et la raison de cette
différence ne se devine pas à la lecture. C'est ce document.

Modifier une icône demande de relancer l'outil, et non d'éditer le SVG. Éditer le SVG
marche, et le prochain export du design l'écraserait.

# La navigation en flèches part en diagonale dans une grille

Status: resolved
Type: task

## Le problème, en une phrase

Dans une grille, `↓` doit garder la colonne. Il tombe sur le premier élément de la ligne
suivante quand cette ligne est plus courte.

## Comportement observé

La grille des technologies coule en colonnes, comme la sortie d'un `ls`. Une famille
« front end » occupe trois lignes, et sa troisième ligne ne porte qu'un élément. Le curseur
est à droite sur la deuxième ligne.

`↓` amène le curseur sur le seul élément de la troisième ligne, tout à gauche. La colonne
est perdue. Les frappes suivantes partent d'ailleurs.

## Comportement attendu

Le curseur descend dans sa colonne. Si la colonne n'a pas d'élément sur la ligne suivante,
il passe à l'élément suivant **dans la même colonne**, pas au premier de la ligne.

## Ce qui existe déjà

`src/app.ts` porte `themeColumns()`, qui résout exactement ce problème pour la grille des
thèmes de la modale. La grille des technologies n'a pas d'équivalent.

## Le piège du test

La grille des technologies est déclarée
`grid-template-columns: repeat(auto-fill, minmax(148px, 1fr))`. **Le nombre de colonnes
dépend de la largeur de la fenêtre.** Un test qui ne pose pas sa fenêtre ne prouve rien :
il passera ou échouera selon la machine.

Poser la largeur, compter les colonnes obtenues, puis vérifier la descente.

## Vérification

Un test qui pose une fenêtre où la dernière ligne d'une famille est plus courte que les
précédentes, place le curseur dans une colonne au-delà de cette longueur, presse `↓`, et
vérifie que la colonne n'a pas changé.

## Réponse

Fait. `gridMove` cherche d'abord une cellule dans la colonne du curseur, parmi **toutes**
les lignes atteignables, et non plus seulement la ligne d'à côté. Le repli sur la cellule
la plus proche ne sert plus que si la colonne est vide jusqu'au bout.

Le diagnostic du ticket était incomplet. `gridMove` faisait déjà de la navigation par
géométrie : il lisait la position réelle des cellules, pas un pas fixe. Son défaut était
plus étroit — **il visait la ligne suivante, puis cherchait la meilleure colonne dedans.**
L'ordre était inversé.

Mesuré avant la correction : le curseur passait de 498 px à 301 px.

Deux tests dans `tests/browser/grille.spec.ts`. Le second garde le cas ordinaire, pour que
la correction ne se paye pas d'une régression.

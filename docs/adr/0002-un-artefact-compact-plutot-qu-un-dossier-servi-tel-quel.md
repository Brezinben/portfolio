# Un artefact compact plutôt qu'un dossier servi tel quel

Le dépôt sert `production/` directement : un conteneur Caddy monte
`/mnt/portfolio/production` en lecture seule et le publie. Chaque sauvegarde de fichier
part en ligne dans la seconde. Nous ajoutons une étape de construction qui produit
`dist/`, un artefact compact.

## Le problème

Éditer et publier sont le même geste. Un fichier à moitié écrit est public. Rien ne
sépare le brouillon du site.

Le poids n'est pas le problème. Le premier chargement pèse 70,3 Ko compressés, sur un
budget de 150 Ko fixé par `tests/browser/budget.spec.js`. La marge est de 80 Ko.

## Options considérées

**Ne rien faire.** Le coût est nul et le site fonctionne. Mais publier reste involontaire.

**Un artefact versionné.** Le dépôt reste auto-suffisant. Un clone frais se sert sans
lancer npm. Rejeté : chaque ligne de CSS touchée produirait un diff de 60 Ko.

**Un artefact ignoré par git.** Retenu.

## Décision

`production/` reste la source, lisible et servable telle quelle. `npm run build` produit
`dist/`, ignoré par git. Le module en ligne de `index.html` absorbe `interpret.js`. Le
minifieur renomme ensuite les identifiants, puis retire du HTML ses espaces et ses
commentaires.

Les outils sont `rolldown` et `html-minifier-terser`. Un seul `import` existe dans tout le
projet. Il n'y a donc pas de graphe à résoudre. Rolldown ne sert qu'à fusionner
`interpret.js` dans la page.

> **Périmé :** le code est découpé en modules depuis l'ADR 0007, et le graphe existe.
> Rolldown le fond comme il fondait le fichier unique, et le premier chargement ne bouge
> pas d'un octet. Ce qui reste vrai de cet ADR : l'artefact ne contient aucune référence à
> un fichier TypeScript, et le minifieur renomme les identifiants de portée module.

**Le montage Docker ne bouge pas encore.** Le conteneur continue de servir `production/`.
Périmé : la bascule a eu lieu. Voir l'ADR 0003.
Tant que la bascule n'est pas faite, sauvegarder publie toujours, et cet ADR décrit une
intention plus qu'un état. La bascule demande de recréer le conteneur, et elle attend que
`dist/` ait vécu.

## Conséquences

Le premier chargement passe de 70,3 à 62,7 Ko compressés. Ces 7,6 Ko sont un effet de
bord, pas la raison.

Les tests navigateur servent `dist/` et lancent la construction avant. Ils exercent donc le
code servi, renommage compris. Les tests unitaires gardent `production/interpret.js`. Ils
couvrent la source, pas l'artefact.

Le renommage des identifiants impose une règle au code de `index.html`. Une expression
Alpine vit dans une chaîne d'attribut, que le minifieur ne lit pas. Toute valeur lue depuis
un attribut `x-*` ou `:style` passe donc par une propriété de l'objet `Alpine.data`. Aucune
ne passe par une constante de portée module.

Un clone frais ne porte pas `dist/`, qui est hors de git. Playwright le construit avant de
servir, donc les tests fonctionnent. Le jour où le montage basculera, un `dist/` absent
deviendra un site en 404. Ce jour est arrivé. Voir l'ADR 0003.

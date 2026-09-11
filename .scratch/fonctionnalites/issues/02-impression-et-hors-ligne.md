# Mode impression propre et mode hors ligne

Status: ready-for-agent
Type: task

Deux lignes de l'issue GitHub #2, fusionnées : toutes deux se règlent dans la page servie,
sans design nouveau.

## Le mode impression

« Mode "impression" propre ». Le dépôt a déjà la bonne réponse sous la main :
`src/texte.html` est la version texte, une colonne, serif, aucune image, aucun script,
aucune animation. C'est une page à imprimer.

Deux chemins :
1. Une feuille `@media print` sur `index.html` qui cache les volets et déplie le contenu.
2. Rediriger l'impression vers `texte.html`, qui est déjà propre.

Je recommande le premier : le second surprend, et une personne qui imprime la page
terminal s'attend à imprimer ce qu'elle voit. Mais `texte.html` donne la cible visuelle.

Vérifier au passage que `texte.html` s'imprime bien lui aussi.

## Le mode hors ligne

« Offline mode avec indication claire ». Deux choses distinctes :

1. **Détecter la perte de réseau** — `navigator.onLine` et les événements `online` /
   `offline`. C'est peu de code.
2. **L'indication claire** — le volet de sortie a déjà un indicateur d'état, un point et
   un libellé, avec `--ok` et `--warn`. Il sert de précédent.

Le site est statique : une fois chargé, il fonctionne hors ligne, sauf pour les
commandes qui partent ailleurs (`/share`, les liens). **C'est cela que l'indication doit
dire** : pas « vous êtes hors ligne », mais « ces commandes-là ne marcheront pas ».

Un service worker rendrait le site rechargeable hors ligne. Ce n'est **pas** demandé, et
cela ajoute un cycle de vie de cache à gérer. Ne pas le faire sans décision explicite.

## Vérification

Un test qui imprime en PDF via Playwright et vérifie que les trois volets ne s'empilent
pas en pages vides. Un test qui simule `offline` via le contexte Playwright.


## L'impression, faite ici

La feuille d'impression vit dans `src/styles.css`. **Elle n'était pas écrivable avant** :
un style en ligne bat une requête de média, et chaque déclaration en portait un.

Le premier chemin du ticket est retenu — une feuille `@media print` sur `index.html`, pas
une redirection vers `texte.html`. Une personne qui imprime ce qu'elle voit s'attend à
l'imprimer. `texte.html` a servi de cible visuelle : sa feuille d'impression emploie la
même technique de surcharge de variables.

La colonne se déplie, le fond passe au blanc dans les huit thèmes, et ce qui n'a pas de
sens sur papier disparaît : la ligne de saisie, la barre d'état, la mascotte, le décor, les
suggestions, le bouton des options.

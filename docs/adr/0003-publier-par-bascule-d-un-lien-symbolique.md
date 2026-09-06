# Publier par bascule d'un lien symbolique

L'ADR 0002 gardait le montage sur le dossier source et annonçait la bascule pour plus tard.
La bascule a eu lieu. Ce dossier s'appelle `src/` depuis ; les ADR 0001 et 0002 le nomment
`production/`, son nom d'alors. Le conteneur Caddy monte le dépôt en lecture seule et sert
`/srv/portfolio/dist`. Publier n'est plus une sauvegarde de fichier, c'est `npm run build`.

## Le problème

Trois défauts sont apparus avec la bascule.

`dist/` est la racine servie. La construction le détruisait puis le recréait, donc le site
rendait des 404 pendant ce temps. Un arrêt brutal figeait cet état : le site restait mort
jusqu'à une intervention à la main.

Deux constructions simultanées effaçaient toutes les copies du site. Le cas n'était pas
théorique : `playwright.config.js` lançait `npm run build` avant chaque série de tests, sur
cette même racine servie. Lancer les tests publiait l'arbre de travail.

Cloudflare relève tout `Cache-Control` plus court que le sien sur les extensions qu'il met
en cache. Le `no-cache` posé sur `vendor/alpine.js` arrivait au navigateur en
`max-age=14400`. Une page fraîche pouvait donc s'exécuter contre un Alpine vieux de quatre
heures : le décalage de version que l'ADR 0002 croyait avoir supprimé, remonté d'une couche.

## Options considérées

**Ne rien faire.** Les trois défauts sont rares. Mais le premier laisse le site mort sans
alerte, et le troisième casse la page sans laisser de trace dans les journaux.

**Verrou et reprise.** Garder les deux renommages, ajouter un verrou et une réparation au
démarrage. Moins de changement, mais la fenêtre de 404 subsiste.

**Règle de cache Cloudflare.** Corrige le troisième défaut sans toucher au dépôt. Rejetée :
le comportement du site dépendrait d'un réglage invisible depuis le code.

## La décision

**La construction écrit dans `.versions/dist/<horodatage>/` puis remplace le lien `dist`.**
Remplacer un lien symbolique est atomique. Le chemin servi désigne donc toujours une version
complète. Un arrêt brutal laisse la version précédente en place, et la construction suivante
repart sans réparation.

**Un verrou empêche deux constructions simultanées.** Il porte le pid de son propriétaire.
Si ce processus est mort, la construction suivante reprend le verrou : sinon un Ctrl-C
interdirait toute construction jusqu'à un effacement à la main.

**Les tests construisent ailleurs.** `PORTFOLIO_DIST` choisit la sortie, et
`playwright.config.js` la fixe à `dist.test`. Lancer la suite ne publie plus rien.

**La construction pose une empreinte du contenu dans le nom des actifs.** `vendor/alpine.js`
devient `vendor/alpine.b30997fc.js`. Une URL ne rend donc jamais deux contenus, et Cloudflare
ne peut plus servir un actif périmé contre une page fraîche. Caddy donne à ces noms
`max-age=31536000, immutable`.

Les pages sont réécrites à la construction, pas à la source. `src/` reste servable tel
quel par un serveur statique, sans étape de construction. C'est la contrainte de l'ADR 0002 et
elle tient toujours.

Cinq noms échappent à l'empreinte, parce qu'ils sont des contrats avec l'extérieur : iOS
demande `/apple-touch-icon.png` sans balise, la page charge `content.json` par une URL
relative, et les robots lisent `llms.txt`, `robots.txt` et `sitemap.xml` à leur adresse fixe.

## Ce que cela coûte

Un clone frais ne porte pas `dist/`. Le lien n'existe pas non plus, donc Caddy rend 404 sur
toute adresse jusqu'à la première construction. L'ADR 0002 avait écrit cette conséquence ;
elle est maintenant réelle. Rien ne la surveille.

`.versions/` garde les trois dernières constructions. Le dossier grossit de la taille de
l'artefact, environ 130 Ko par version.

Le Caddyfile est monté fichier par fichier, donc épinglé sur son inode. Un éditeur qui écrit
un fichier temporaire puis le renomme désynchronise l'hôte et le conteneur, sans erreur. Ce
piège n'est pas créé par cette décision, mais il la rend plus coûteuse : une règle de cache
qui semble posée peut ne jamais atteindre le serveur.

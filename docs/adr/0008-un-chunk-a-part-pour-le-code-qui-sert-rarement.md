# 8. Un chunk à part pour le code qui sert rarement

**Statut :** acceptée

## Le problème

La commande `/radio` fabrique un morceau dans le navigateur : une dérivation, un graphe
Web Audio, un séquenceur et un volet. Cela pèse 8,8 Ko avant compression, et presque
aucun visiteur ne tapera la commande.

Le budget de poids n'était pas menacé : la page consomme environ 93 Ko des 150 autorisés,
et la radio tenait dans la marge. Le problème est ailleurs : envoyer à tout le monde un
code que presque personne n'exécutera.

L'ADR 0007 fermait la porte :

> Les imports dynamiques, qui allégeraient la page, n'ont pas été faits ici : le filtre de
> copie et le fait que `bundle()` ne garde que le premier chunk les rendent impossibles
> sans toucher à la construction.

Cette phrase décrivait une limite de `tools/build.ts`, pas une propriété souhaitable.
`const [chunk] = result.output` gardait le premier chunk et jetait les autres **en
silence** : la page serait partie en production avec un import vers un fichier absent,
et les tests seraient restés verts.

## Options considérées

**`import defer`.** Il diffère l'évaluation du module, pas son téléchargement. Le fichier
part quand même au premier chargement. Il ne répond donc pas au besoin.

**Ne pas découper.** La marge de budget le permettait. Mais la même question se reposera
à chaque commande de ce genre, et la réponse aurait été la même à chaque fois.

**Servir l'entrée comme fichier plutôt qu'en ligne.** Le chunk paresseux aurait alors pu
importer l'entrée normalement. C'est une requête bloquante de plus sur toutes les pages,
pour régler un cas qui n'en concerne aucune. L'ADR 0002 a choisi la mise en ligne.

## La décision

`bundle()` sépare le chunk d'entrée des autres. L'entrée est mise en ligne dans la page,
comme avant. Les autres sont écrits dans l'artefact, reçoivent leur empreinte SHA-256 par
`stampAssets`, et `rewritePages` réécrit leur nom **dans le bundle en ligne**, qui fait
partie du texte de la page.

Un spécificateur relatif dans un `<script type="module">` en ligne se résout contre
l'adresse du document. `index.html` est servi à la racine, le chunk est écrit à la racine :
`./radio.js` résout.

Trois garde-fous, parce que la panne serait invisible autrement.

**Le chunk paresseux doit être autonome.** L'entrée est en ligne : elle n'a pas d'URL,
donc rien ne peut l'importer. La construction échoue si un chunk paresseux déclare le
moindre import. Le premier essai est tombé dessus : `radio/slice.ts` appelait `slice()` du
socle, partagé avec la mascotte, et le chunk sortait avec `import{t as e}from"./app.js"`.
La tranche de la radio emploie donc `ThisType` directement, sans rien emprunter.

**Un seul nom de chunk.** `chunkFileNames` écrit `radio.js`. La construction échoue si un
second import dynamique apparaît : le nom devra alors se dériver.

**La page d'erreur n'a droit à aucun import dynamique.** Elle est servie sur une adresse
quelconque, donc un spécificateur relatif n'y résoudrait pas. La construction le vérifie.

## Ce que cela coûte

Une requête de plus pour qui tape `/radio`, et un fichier de plus dans l'artefact.

La tranche de la radio ne peut plus employer `slice()` du socle, ni aucune autre valeur
partagée avec le paquet principal. La contrainte est réelle et tenue par la construction,
mais elle ne se devine pas à la lecture : le commentaire en tête de `radio/slice.ts` la
rappelle.

La phrase de l'ADR 0007 citée plus haut est désormais fausse. Elle reste dans le document,
qui décrit l'état du dépôt à sa date.

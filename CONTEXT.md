# Portfolio Benjamin David

Portfolio personnel servi en pages statiques. Le contenu vit dans un fichier JSON
chargé au démarrage, séparé de la page, pour être modifié sans redéploiement.

Les documents parlent français. Le code parle anglais. Chaque terme ci-dessous
donne les deux noms : le terme canonique en français, et l'identifiant à employer
dans le code.

## Language

### Les trois zones

**Volet gauche** (`leftPane`) :
Colonne qui porte le bouton des options, la liste des sections et la liste des missions.
_Avoid_: menu, navigation, sidebar.

**Volet central** (`mainPane`) :
Colonne qui porte la commande en cours, le résultat, le journal, la mascotte, la ligne de
saisie et la barre d'état.
_Avoid_: session, terminal, corps.

**Volet de sortie** (`outputPane`) :
Colonne de droite, dont le contenu dépend de la section ouverte.
_Avoid_: panneau contextuel, aside, volet droit.

### Ce que la machine affiche

**Résultat** (`result`) :
Ce qu'une commande rend dans le volet central.
_Avoid_: sortie, output, retour.

**Sortie** (`output`) :
Le contenu du volet de droite. Jamais ce que rend une commande.
_Avoid_: contexte, détail.

**Journal** (`log`) :
Historique des commandes déjà exécutées, dans le volet central. Redimensionnable.
_Avoid_: historique, console, log.

**Log de boot** (`bootLog`) :
Lignes système affichées pendant le démarrage. Sans rapport avec le journal.
_Avoid_: journal système, console de démarrage.

### Le contenu

**Section** (`section`) :
Une des six entrées du portfolio, chacune avec sa commande et son ancre.
_Avoid_: page, onglet, rubrique.

**Mission** (`mission`) :
Une expérience professionnelle, présentée en fiche depuis le volet gauche.
_Avoid_: expérience, poste, projet.

**Fiche techno** (`techNote`) :
Texte attaché à une technologie de la stack, en trois parties : où, quoi, pourquoi.
_Avoid_: tooltip, détail techno, carte.

### Le comportement

**Boot** (`boot`) :
Séquence de démarrage. Elle attend le chargement du contenu et dure au minimum deux
secondes.
_Avoid_: chargement, splash, loader.

**Écran de panique** (`panicScreen`) :
Écran d'échec affiché quand le contenu ne se charge pas. Imite une panique Go.
_Avoid_: page d'erreur, écran 404.

**Mascotte** (`mascot`) :
Le slime du volet central. Décorative : un lecteur d'écran ne l'annonce jamais. Elle
disparaît quand le visiteur demande moins de mouvement.
_Avoid_: slime, avatar, personnage.

**État de la mascotte** (`mascotState`) :
Ce que la mascotte fait à un instant donné. Neuf états : `idle`, `wink`, `jump`, `type`,
`load`, `sleep`, `morph`, `boom`, `reform`. Un seul à la fois. Remplace les humeurs.
_Avoid_: humeur, mood, émotion, pose.

**Feuille** (`sheet`) :
Image qui porte toutes les cases d'un état de la mascotte, sur une seule ligne. Une feuille
par état. Le dossier qui les réunit garde le nom technique `src/sprites/`.
_Avoid_: spritesheet, planche, atlas.

**Jauge de contexte** (`contextGauge`) :
Jauge de la barre d'état qui monte à chaque commande, et se vide avec une compaction
ironique quand elle est pleine.
_Avoid_: barre de progression, compteur.

**Valeur figée** (`frozenValue`) :
Durée ou seuil arrêté après itération, qui ne doit pas redevenir un réglage.
_Avoid_: constante, paramètre, réglage.

### Le travail

**Seam** (`seam`) :
Point où le comportement se teste depuis l'extérieur. Ce projet en a exactement deux :
l'interpréteur de commandes, testé sans navigateur, et la page servie, testée dans un
navigateur réel. Terme technique conservé en anglais, employé tel quel dans les documents.
_Avoid_: couture, point de test, interface de test.

### Les artefacts

**Version terminal** (`index.html`) :
La page principale, interface à trois volets. Seule variante qui lit le contenu JSON.
_Avoid_: version principale, app.

**Version texte** (`texte.html`) :
Repli en une colonne, sans script et sans image. Cible du lien de secours de l'écran de
panique. Contenu écrit en dur.
_Avoid_: version simple, version accessible, fallback.

**Source** (`src/`) :
Le dossier que l'on édite. Il reste servable tel quel par un serveur statique, sans étape
de construction. S'appelait `production/` jusqu'au renommage.
_Avoid_: production, app, sources.

**Artefact compact** (`dist/`) :
Le dossier que la construction produit. Même page que `src/`, sous forme minifiée.
Hors de git. Les tests navigateur servent ce dossier.
_Avoid_: sortie, distribution, bundle.

**Construction** (`npm run build`) :
L'étape qui produit l'artefact compact à partir de `src/`.
_Avoid_: build, compilation, packaging.

**Contenu** (`content.json`) :
Fichier JSON chargé au démarrage, seule source de vérité du contenu de la version
terminal. Ses clés sont en anglais.
_Avoid_: données, config, payload.

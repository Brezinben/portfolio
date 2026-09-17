# Portfolio Benjamin David

Portfolio personnel servi en pages statiques. Le contenu vit dans un fichier JSON
chargé au démarrage, séparé de la page, pour être modifié sans redéploiement.

Les documents parlent français. Le code parle anglais. Chaque terme ci-dessous
donne les deux noms : le terme canonique en français, et l'identifiant à employer
dans le code.

## Language

### Les trois zones

**Zone** (`zone`) :
Un conteneur encadré : les deux cartes du volet gauche, les trois volets, les deux
modales, le cadre de démarrage. Une zone porte un coin arrondi et ne prend jamais le focus.
_Avoid_: bloc, panneau, boîte, carte.

**Élément intérieur** (`inner`) :
Tout ce qui se dessine dans une zone : boutons, bascules, entrées de liste, suggestions. Un
élément intérieur reste à angle droit, et c'est lui qui prend le focus.
_Avoid_: contrôle, widget, item.

**Volet gauche** (`leftPane`) :
Colonne qui porte le bouton des options, la liste des sections et la liste des missions.
_Avoid_: menu, navigation, sidebar.

**Volet central** (`mainPane`) :
Colonne qui porte la commande en cours, le résultat, le journal, la ligne de saisie et la
barre d'état.
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

**Ligne brute** (`RawLine`) :
Une ligne telle que l'interpréteur la rend. Trois formes : bandeau, jetons, ligne simple.
_Avoid_: ligne, item, entrée.

**Ligne mise en forme** (`ShapedLine`) :
Une ligne brute après passage par la coquille, qui calcule ce que le balisage ne sait pas
calculer. Un bandeau y devient un objet dessiné là où la ligne brute ne portait qu'un mot.
_Avoid_: ligne rendue, ligne finale.

**Frise** (`timeline`) :
La liste chronologique du volet central, dans la section parcours. Chaque entrée ouvre la
fiche d'une mission.
_Avoid_: parcours, chronologie, historique.

**Ton** (`tone`) :
La couleur de sens portée par une ligne ou un jeton. Cinq valeurs : `acc`, `fg`, `fg2`,
`ok`, `warn`. Toute valeur inconnue retombe sur `fg`. Un ton colore du texte : `acc` y
désigne l'ambre textuel, jamais l'ambre décoratif qui habille un glyphe.
_Avoid_: couleur, teinte, style.

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

**Étincelle** (`sparkle`) :
Le caractère `✨` qui suffixe la commande de recherche quand un modèle local répond.
`ask` et `ask✨` sont la même commande sous deux noms, et ils ne s'offrent jamais
ensemble : l'étincelle est la seule chose qui dise au visiteur qu'un modèle est là.
_Avoid_: icône, emoji, marqueur.

**Succès** (`achievement`) :
Ce qu'un visiteur débloque par une action qu'il a voulue. Vingt-sept. Rien ne se débloque
en arrivant sur la page, rien ne se débloque au bout d'un délai : c'est ce qui sépare une
récompense d'une décoration. Acquis et vu sont deux états distincts, et la relance du badge
vit entre les deux. La clé d'un succès est stable : renommer son titre ne le re-verrouille
pas.
_Avoid_: trophée, badge, récompense, achievement.

**Badge** (`badge`) :
La coupe et le compteur du pied de page, qui ouvrent la liste des succès. Le trophée est
son icône, jamais la chose : un badge compte des succès, il n'en est pas un.
_Avoid_: trophée, coupe, compteur.

**Alerte** (`alert`) :
Le bandeau qui annonce un déblocage, au bas du volet de sortie. Dix secondes, une par
succès : deux déblocages rapprochés font la queue au lieu de s'écraser. Elle appartient au
moment du déblocage, et ne rejoue jamais une clé posée par une autre page. Le volet fermé,
elle n'existe pas, et le badge porte seul le signal.
_Avoid_: notification, toast, bandeau, popup.

**Fiche techno** (`techNote`) :
Texte attaché à une technologie de la stack, en trois parties : où, quoi, pourquoi.
_Avoid_: tooltip, détail techno, carte.

### Le comportement

**Boot** (`boot`) :
Séquence de démarrage. Elle attend le chargement du contenu et dure au minimum deux
secondes. Ce plancher a deux sorties : une touche ou un clic l'abrège, et un visiteur qui
demande moins de mouvement ne l'a pas du tout. Aucune des deux ne passe devant l'écran de
panique.
_Avoid_: chargement, splash, loader.

**Écran de panique** (`panicScreen`) :
Écran d'échec affiché quand le contenu ne se charge pas. Imite une panique Go.
_Avoid_: page d'erreur, écran 404.

**Mascotte** (`mascot`) :
Le slime. Il se déplace librement sur toute la fenêtre, et se plaque contre ses bords.
Décorative : un lecteur d'écran ne l'annonce jamais. La page introuvable est la seule
exception : la mascotte y est le seul contrôle, donc elle y est annoncée. Elle disparaît
quand le visiteur demande moins de mouvement. Le réseau coupé, elle dort : elle ne se déplace plus et ne répond plus,
ni à une commande, ni à la souris, jusqu'au retour du réseau.
_Avoid_: slime, avatar, personnage.

**Forme** (`form`) :
La créature que la mascotte montre. Trois valeurs : `slime`, `cube`, `pingouin`. La commande
`/slime evolve` monte d'un cran, le troisième appel referme le cycle. La forme ne survit pas
à un rechargement, et chaque forme a sa propre feuille fusionnée, tirée à la demande.
_Avoid_: espèce, créature, skin, apparence, shape.

**État de la mascotte** (`mascotState`) :
Ce que la mascotte fait à un instant donné. Trente-cinq états, un seul à la fois. Les trois
formes portent les mêmes, dans le même ordre, avec le même nombre de cases.

Neuf états de vie : `idle`, `wink`, `jump`, `type`, `load`, `sleep`, `morph`, `boom`,
`reform`. Onze états de manipulation : `grab`, `dragLeft`, `dragRight`, les quatre plaquages
de bord `splatLeft`, `splatRight`, `splatFloor`, `splatCeiling`, et les quatre plaquages de
coin `splatCeilingLeft`, `splatCeilingRight`, `splatFloorLeft`, `splatFloorRight`. Six
expressions de commande : `alert`, `happy`, `laugh`, `sad`, `scared`, `drop`. Six activités :
`bike`, `coffee`, `goal`, `juggle`, `lift`, `train`. Trois transitions de forme :
`evolveCube`, `evolvePingouin`, `devolve`. Une transition bloque : rien ne la déloge avant
son terme.
_Avoid_: humeur, mood, émotion, pose.

**Plaquage** (`splat`) :
L'écrasement de la mascotte contre un bord de sa piste, ou contre un coin. Le sprite ne
dessine aucun mur : le côté plat est le bord de l'image, qui doit toucher le bord exact. Un
coin se teste avant un bord, sinon il se lit toujours comme un mur.
_Avoid_: collision, impact, choc.

**Activité** (`activity`) :
Un état où la mascotte manipule un accessoire, par opposition à une expression, qui se lit
sur le visage. Une activité raconte quelque chose : elle demande un contexte, elle ne se
tire jamais au hasard.
_Avoid_: action, occupation, animation.

**Feuille** (`sheet`) :
Image qui porte toutes les cases d'un état de la mascotte, sur une seule ligne. Une feuille
par état, un dossier par forme sous `src/assets/sprites/`. La construction les empile en une
image par forme ; seule celle du slime part au premier chargement.
_Avoid_: spritesheet, planche, atlas.

**Radio** (`radio`) :
Le lecteur que `/radio` installe dans le volet de sortie. Il ne lit aucun fichier et ne
reçoit aucun flux : le morceau se fabrique dans le navigateur. Aucun son ne part avant un
geste du visiteur, et quitter la commande ferme le contexte audio. Ce que la radio produit
s'appelle une musique ; la radio, elle, ne s'appelle jamais ainsi.
_Avoid_: lecteur, player.

**Seed** (`seed`) :
Le nombre de treize chiffres qui décide d'un morceau. Même seed, même morceau, à la note
près. C'est un **format**, pas un détail : l'ordre des tirages qui la lit ne change jamais
en son milieu, et `SEED_VERSION` en marque la version. Elle s'affiche groupée par trois,
et elle se saisit : c'est ce qui rend une écoute partageable. Terme technique conservé en
anglais, comme `seam`, et affiché tel quel : l'interface d'un terminal parle déjà `ls` et
`cd`.
_Avoid_: graine, clé, identifiant, nombre.

**Silhouette** (`silhouette`) :
Les hauteurs de repos du spectre, tirées de la seed. C'est l'image qu'on voit sans son, et
celle qui reste quand le visiteur demande moins de mouvement. Le gel est une image fixe
lisible, jamais une disparition.
_Avoid_: forme, shape, profil.

**Jauge de contexte** (`contextGauge`) :
Jauge de la barre d'état qui monte à chaque commande, et se vide avec une compaction
ironique quand elle est pleine.
_Avoid_: barre de progression, compteur.

**État du terminal** (`State`) :
Tout ce que la page tient en mémoire : la section ouverte, le journal, les réglages, les
minuteurs en vol, la position de la mascotte. Une interface le nomme champ par champ.
_Avoid_: store, modèle, contexte.

**Valeur figée** (`frozenValue`) :
Durée ou seuil arrêté après itération, qui ne doit pas redevenir un réglage.
_Avoid_: constante, paramètre, réglage.

### Le travail

**Seam** (`seam`) :
Point où le comportement se teste depuis l'extérieur. Ce projet en a exactement deux :
l'interpréteur de commandes, testé sans navigateur, et la page servie, testée dans un
navigateur réel. Terme technique conservé en anglais, employé tel quel dans les documents.
_Avoid_: couture, point de test, interface de test.

**Libellé de test** (`test label`) :
La phrase qui nomme un test. Elle s'écrit **en anglais** et **commence par `should`**,
alors que le reste des documents parle français : un libellé décrit un comportement
attendu, pas un écran, et il se lit dans la sortie d'un outil. Il dit ce que le code
doit faire, jamais comment il s'y prend.

    it("should keep the bar width, head included", …)
    test("should put the mascot to sleep while the network is cut", …)

Les tests unitaires emploient `it`, tenu par `jest/consistent-test-it`. Les tests
navigateur gardent `test` : `@playwright/test` n'exporte pas `it`. Les messages
d'assertion passent aussi en anglais, mais sans `should` — ce sont des explications
d'échec, pas des noms.
_Avoid_: nom de test, description, titre.

### Les artefacts

**Version terminal** (`index.html`) :
La page principale, interface à trois volets. Seule variante qui lit le contenu JSON.
_Avoid_: version principale, app.

**Page introuvable** (`404.html`) :
La page servie sur toute adresse que le site ne publie pas. Autonome : elle ne lit ni le
contenu, ni le point d'entrée. Elle reprend le thème choisi sur la version terminal, et la
mascotte y est le seul contrôle. Son style vit dans `404.css`, que la construction remet en
ligne. Sans rapport avec l'écran de panique, qui parle d'un contenu qui ne charge pas.
_Avoid_: page d'erreur, écran 404, 404.

**Version texte** (`texte.html`) :
Repli en une colonne, sans image. Cible du lien de secours de l'écran de panique. Contenu
écrit en dur, recopié de `content.json`. Composée en Atkinson Hyperlegible Next, la police
que la version terminal n'emploie pas. Un seul script, en tête : il pose `data-theme` à
partir du thème choisi sur la version terminal, et rien d'autre. La page reste entière sans
lui.
_Avoid_: version simple, version accessible, fallback.

**Source** (`src/`) :
Le dossier que l'on édite. Il porte du TypeScript et des modules : il n'est plus servable
tel quel, et l'ADR 0005 a retiré cette contrainte, devenue vestigiale. Ce qui reste vrai,
c'est que l'artefact n'en contient aucune référence. S'appelait `production/` jusqu'au
renommage.
_Avoid_: production, app, sources.

**Artefact compact** (`dist/`) :
Le dossier que la construction produit. Les trois mêmes pages que `src/`, sous forme
minifiée.
Hors de git. Les tests navigateur servent ce dossier.
_Avoid_: sortie, distribution, bundle.

**Construction** (`bun run build`) :
L'étape qui produit l'artefact compact à partir de `src/`.
_Avoid_: build, compilation, packaging.

**Contenu** (`content.json`) :
Fichier JSON chargé au démarrage, seule source de vérité du contenu de la version
terminal. Ses clés sont en anglais.
_Avoid_: données, config, payload.

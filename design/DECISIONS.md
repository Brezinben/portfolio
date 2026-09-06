# Journal de décisions — Portfolio Benjamin David

Document de passation. Contient les demandes de Benjamin dans leur formulation
d'origine, les décisions prises, et les arbitrages retenus ou refusés au fil de
la construction. À lire avant toute modification : plusieurs choix sont
contre-intuitifs et ont été validés par itération.

---

## 1. Le brief initial

> « J'aimerais me faire un portfolio qui représente du coup ma carrière et mon
> poste de développeur IA. Donc je vais te passer le lien de mon LinkedIn.
> pseudo : benjamin--david. L'idée, c'est d'utiliser ces couleurs-là :
> #F5B83B, #242538 et fff6f6. J'adore les animations, il faut qu'il soit
> originale, propose moi des choses, tu peux faire light mode dark mode, il
> faut qu'il soit accessible, je travaille dans le numérique responsable, genre
> pour mes missions à Gare et Connexion on peut avoir une animation de train,
> pour Transway un soleil etc »

**Décisions fondatrices :**
- Palette imposée : `#F5B83B` ambre, `#242538` nuit, `#fff6f6` blanc rosé.
- Une animation par mission, dérivée du métier de la mission.
- Clair et sombre obligatoires.
- Accessibilité non négociable : c'est le sujet professionnel de Benjamin.

---

## 2. Trois variantes, et laquelle est principale

> « Il faut également une version mobile et une version simple texte, et une
> version pour les crawler ia, crée les variant »

Puis, à la question « laquelle devient la version principale ? » :

> **Terminal**

Et sur le sort de la version illustrée :

> **« Je la garde en second »**

**Décisions :**
- `Portfolio Benjamin David - Terminal.dc.html` = version principale, à déployer
  en `index.html`.
- `Portfolio Benjamin David.dc.html` = version illustrée, conservée en second.
- `Portfolio Benjamin David - Texte.dc.html` = repli texte pur, aucun script.
- `llms.txt` = format standard pour les crawlers d'IA.
- Les trois se lient mutuellement en pied de page.

---

## 3. Le contenu externalisé en JSON

> « C'est vrai qu'en termes de design, on est bien. Après il faut qu'on le
> retravaille. Et c'est là où du coup je me dis, je pense que je vais héberger
> un JSON quelque part, qui permettra de modifier à la volée. Donc c'est-à-dire
> avoir un fichier JSON d'un côté et de l'injecter pour construire l'interface. »

**Décision :** tout le contenu de la version terminal vit dans `content.json`,
chargé par `fetch` au démarrage. Aucun build. La page embarque un repli complet
en dur, mais le JSON prévaut.

**Conséquence acceptée :** les deux autres variantes gardent leur contenu écrit
en dur — elles se mettent à jour à la main.

---

## 4. La direction terminal

> « Crée une nouvelle version du site en mode terminal genre herdr avec les
> sections, garde les couleurs déjà définies, des animations, c'est assez
> complexe donc réfléchis bien. Rajoute des choses si tu veux, on modifiera
> après si besoin »

Références données : `talks.addy.ie/oreilly-codecon-march-2026` (structure),
`brik.space` (animations morphing).

**Décision :** interface à trois volets — sections et missions à gauche, session
au centre, sortie contextuelle à droite, barre d'état en bas.

### 4.1 Le piège du « trop web »

Benjamin a signalé à plusieurs reprises des éléments qui cassaient l'illusion :

> « Ce block ne fait pas trop terminal »

> « Des fois, en fait, ça fait un peu trop site web, donc ça casse un peu
> l'expérience. »

> « du coup je me dis que il faut aussi modifier la partie hover, là ils sont un
> peu arrondis, alors c'est très beau mais dans l'esthétique terminale c'est
> peut-être pas le meilleur. Tu peux reprendre ce qui a été fait sur la partie
> parcours avec la ligne d'accent sur le côté, ça c'est pas mal parce que c'est
> assez carré, il y a la ligne qui rajoute une information. Harmonise ça dans
> tout le projet. »

**Vocabulaire visuel arrêté** (à respecter pour tout nouvel élément) :
- Coins **carrés** partout. Le seul rayon toléré est `0`.
- Barre d'accent de 2 px à gauche de l'élément actif, ambre.
- Caret `›` sur la ligne sélectionnée.
- Glyphes d'arbre `├` `└` pour les hiérarchies.
- Jauges en blocs `████░░░░░░`, jamais de barre de progression pleine.
- Chiffres tabulaires pour les années.
- Focus : contour carré, jamais arrondi.

### 4.2 Ce qui a été retiré

- **Onglets « session / texte »** — « Je pense que l'on a pas besoin de la
  version texte en visuel, ça sera géré par le navigateur ».
- **Bouton de thème en header** — « ça fait doublon avec les options vu qu'elles
  ont été remontées ». Le thème se change uniquement dans la modale options.
- **Libellé « choisissez une section »** — redondant.
- **Barres de progression pleines** — remplacées par les jauges en blocs.
- **Barres de défilement** — « dans un terminal il n'est pas censé y avoir de
  scrollbar donc il faut trouver une solution ». Masquées, remplacées par un
  indicateur `▾ plus bas`.

---

## 5. Les options en modale

> « je vois que pour le choix du thème c'est pas du tout pratique. Ce qu'on peut
> faire c'est que quand tu cliques sur option ça ouvre une sorte de dialogue qui
> se superpose, et l'utilisateur au clavier il arrive d'abord sur le choix du
> thème, et si il fait flèche de droite flèche de gauche le thème change. Il
> faut que tout soit gérable au clavier, c'est-à-dire quand il fait échap ça
> quitte la modale, espace entrée il faut que ça marche »

> « met les options en premier sur la gauche ça sera mieux non ? »

> « enlève juste la police dans les options, la taille de la police »

> « il fallait mettre les instructions pour le déplacement clavier »

> « fleche droite et gauche ne change pas la valeur »

**Décisions :**
- Bouton `options` en **tête** de la colonne de gauche.
- Modale superposée, focus initial sur le thème actif.
- `← →` change la valeur du réglage sous le focus (thème appliqué immédiatement,
  bascule activée / désactivée).
- `↑ ↓` passe d'un réglage à l'autre.
- `Tab` boucle dans la modale, `Échap` ferme et rend le focus au bouton.
- Réglages : thème, taille du texte, animations, volet de sortie, densité.
- Rappel des raccourcis clavier **dans** la modale et en pied de page.

---

## 6. Le clavier

> « je dois pouvoir me déplacer avec les flèches : droite je vais sur la pane de
> droite, gauche je m'enfonce dans la partie sélectionnée, puis haut et bas pour
> naviguer dans la pane courante »

> « lorsque l'utilisateur est sur l'input pour la première fois dans une section
> et qu'il a la possibilité de taper une commande, si il fait flèche du haut ça
> doit rejouer la commande de la section. Donc par exemple si je suis sur le
> whoami ça doit rejouer bd whoami --verbose, comme ça ça fait plus réaliste »

> « il faut pas qu'on empile les commandes »

> « dans le rendu terminal, par exemple j'ai une liste qui est en colonne et je
> peux pas me déplacer dans cette colonne, je suis obligé d'aller qu'à droite.
> C'est possible de modifier le comportement clavier pour cette partie là ? »

**Table arrêtée :**

| Touche | Action |
|---|---|
| `← →` | changer de volet |
| `↑ ↓` | parcourir le volet courant |
| `j` `k` | changer de section |
| `/` | cibler la saisie |
| `Tab` | compléter |
| `Échap` | vider la saisie |
| `Entrée` | valider, ouvrir une fiche |

La position du focus est **mémorisée par volet** : revenir dans un volet repose
le focus là où on l'avait laissé.

Dans la saisie, `↑` propose d'abord la commande de la section courante, puis
remonte l'historique. Les commandes ne s'empilent pas.

---

## 7. L'autocomplétion

> « Essaye d'implémenter un autocomplete, c'est-à-dire qu'il commence à taper BD,
> ensuite tu lui proposes une commande, et en fonction de ce qu'il continue de
> taper tu affines la suggestion avec toutes les commandes que tu as. Si
> l'utilisateur fait des flèches, tu changes de sélection, tu vas sur le prochain
> match. Si l'utilisateur fait plusieurs espaces entre les commandes, deux
> espaces, il faudrait que tu le normalises en un seul. »

> « il faut autocompléter les / »

> « quand tu commences avec une commande ex /slime tu ne peux mettre que une
> suggestion valide »

> « enlève le défilement, mais tu ne mets que 10 valeurs »

> « il faudrait une petite animation de dépliement sur l'autocomplétion dans la
> commande, parce que là c'est trop brusque : quand on s'arrête de taper ça
> redescend direct, il faut que ça soit un peu plus fluide »

**Décisions :**
- Filtrage progressif sur le préfixe, dix propositions maximum, sans défilement.
- Le préfixe `/` est reconnu et complété.
- **Suggestions contextuelles, niveau par niveau** : `/slime ` ne propose que ses
  quatre sous-commandes, `/slime mood ` que les humeurs, `/slime activity ` que
  les activités, `cd ` que les sections et missions, `share ` que les cibles,
  `theme ` que les thèmes. `cowsay ` ne propose rien : c'est du texte libre.
- **Une ligne sous la liste décrit la proposition choisie.** Un nom n'apprend
  rien : ni `bd`, ni `goal`. Elle se tait devant un nom venu du contenu, dont
  l'identifiant est déjà le libellé.
- Espaces multiples normalisés en un seul.
- `↑ ↓` changent de proposition, `Tab` complète, `Échap` referme.
- Dépliement en 220 ms, repliement en 170 ms depuis la base.

**Piège rencontré, à ne pas réintroduire :** un compteur de génération sur le
timer de fermeture annulait le vidage de la liste au lieu de le protéger — la
liste restait montée et écrasait la session. La fermeture doit rester
déterministe, avec un filet qui vide la liste dès que la saisie perd le focus.

---

## 8. Le réalisme du terminal

> « la première fois qu'un utilisateur va sur une section, il faut que ça joue la
> commande, ça laisse un petit temps d'attente et que ça affiche le résultat. Il
> faut pas que ça soit immédiat, comme ça ça fait plus réaliste, parce que dans
> un terminal c'est comme ça que ça se passe »

> « l'animation bug, tu peux faire une animation où chaque lettre saute en mode
> vibration et apparaît une par une ? »
> — puis : **« annule ça rend pas bien »**

> « ici ça bug toujours, ça arrive en deux blocs »

> « pour toutes les listes que tu charges c'est bien d'avoir une animation où tu
> vois le premier point apparaître en premier, le second, le troisième »

> « sur la pane de droite je vois qu'il n'y a aucune animation. Ça serait bien en
> mode : il y a quelqu'un qui attend la sortie de ton terminal et à la fin il y a
> un résumé »

**Décisions :**
- Première visite d'une section : la commande se tape (52 c/s), curseur
  « exécution… », puis le résultat. Retour sur une section déjà vue : immédiat.
- **Apparition par bloc, pas par ligne** — l'échelonnement ligne à ligne créait
  un effet « deux vagues » rejeté.
- **Pas d'animation par lettre** — testée, rejetée.
- Latence d'exécution : `20 ms` après la frappe. Valeur figée après itération
  (« réduis », puis « met 20ms »).
- Volet de sortie : le contenu attend la fin de la commande, puis apparaît.

---

## 9. Le chargement

> « Tu peux mettre une variable pour afficher la loading page ? ça va trop vite
> pour que je fasse des retours »

> « soit c'est full screen soit skeleton mais pas les deux »

> « À la fin du chargement il faut une animation de fade je pense, ou autre fondu
> dynamique »

> « du coup l'aspect de cette barre de chargement est top, d'ailleurs toutes les
> autres barres de chargement faut qu'elles passent dans ce style là pour
> uniformiser »

> « Plus rapide l'animation de la barre, il faut 100ms »

> « boot duration 2000ms c'est bien tu peux figer »

> « Je vois plus le loading, il faut qu'il apparaisse au moins 2 secondes. Par
> contre quand ça sera en prod, si le JSON n'a pas réussi à se charger il faut
> que ça reste sur la page de chargement. Et je suis même en train de me dire
> qu'il faut faire un état où le JSON n'a pas chargé et afficher un texte erreur
> 400 ou overflow, un truc un peu développeur, une blague de développeur »

**Décisions :**
- Écran de boot **plein cadre**, jamais de squelette. Les deux ensemble ont été
  explicitement rejetés.
- Durée figée à **2000 ms minimum**, affichée même quand les animations sont
  désactivées (seul le fondu de sortie dépend du réglage).
- Barre de progression en blocs, remplissage 100 ms.
- Sortie : fondu croisé de 620 ms, la mascotte tombe dans son bac.
- **Le boot attend le JSON.** S'il tarde, l'écran reste.
- **Écran d'échec** : panique Go (`panic: content.json not found`, goroutine,
  `boot.go:42`, cause exacte), puis « Le contenu de ce portfolio vit dans un
  JSON. Le JSON, lui, vit sa vie. » Bouton `retry` + lien version texte.

---

## 10. La mascotte

C'est l'élément le plus itéré du projet. Historique des demandes :

> « Pour la mascotte faire une sorte de slime avec le jaune, entre dark et white
> pas besoin de le changer on dirait »

> « genre toutes les 10s il bouge »

> « tu peux le faire aller de droite à gauche, il peut aller de manière aléatoire
> à droite ou gauche, et fais une animation où il se cogne contre son container,
> fais quelque chose de poussé »

> « ça serait top si on pouvait le drag and drop, que sur la droite et la gauche,
> pour le forcer d'aller d'un côté ou d'un autre, et genre il fait une animation
> surpris avec un petit point d'exclamation, il sursaute »

> « est-ce que tu peux le faire bouger en fonction de si tu bouges rapidement la
> souris ? Il réagit, il se décale un peu, tu vois il est un peu flasque »

> « quand tu cliques x fois (Année courante - 2000) fois il attrape une couronne »

> « Tu peux rajouter des émotions au slime : content, peureux, triste, rigolade ? »

> « on ne remarque pas trop ces émotions »

> « Pour le saut il faut plus de frames »

> « mon curseur, l'animation se fait trop tôt, c'est-à-dire que mon curseur n'est
> pas encore sur le slime, il doit être à une cinquantaine de pixels et ça fait
> le truc, donc ça fait bizarre »

> « enlève le ! quand on le prend »

> « ok le design du slime il est plutôt bien là, je vois que la couronne est bien
> posée aussi c'est top »

**État arrêté :**
- Sprite pixel dessiné en `box-shadow`, 24 × 18 pixels de 2,6 px. **Aucune image.**
- Couleurs fixes, identiques dans tous les thèmes (demande explicite).
- Sept humeurs : `idle` `happy` `laugh` `sad` `scared` `sleep` `alert`.
- Respire, cligne à intervalles irréguliers, arpente sa piste, se cogne aux
  parois avec écrasement et étincelle.
- Réaction élastique à la vitesse du curseur, **seulement à proximité** (le seuil
  large donnait un déclenchement fantôme).
- Attrapable à la souris, sursaut à la prise, **sans point d'exclamation**.
- Couronne après 26 clics (année − 2000), conservée sur l'appareil.
- Saut à sept poses.

**Rejeté :** deux tentatives de refonte du sprite d'après des références externes
(marche vue de dessus, animation de slime tierce) — retour en arrière demandé
les deux fois. Le sprite actuel est validé, ne pas le redessiner.

---

## 11. Les easter eggs

> « rajoute des easter egg, genre l'utilisateur peut faire des commandes,
> certaines sont interprétées genre /brezinben ou /joke ou /wtf etc, tu peux même
> faire une bd shutdown »

> « je vois que la commande cowsay marche pas vraiment, et il faut qu'elle puisse
> prendre des arguments, est-ce que tu peux faire ça ou pas ? Je peux te passer
> le bon ASCII si il faut : en.wikipedia.org/wiki/Cowsay »

**Décisions :**
- `joke` `sudo` `coffee` `vim` `pet` `matrix` `benjamin` (alias `brezinben`)
  `slime` `shutdown` `reboot`. `wtf` et `cowthink` sont retirés.
- `cowsay` conforme à l'original pour la bulle : retour à la ligne adaptatif à la
  largeur du volet, forme qui change selon le nombre de lignes. Les huit visages
  restent, mais **sans drapeau à retenir** : la commande en tire un à chaque
  appel. Un portfolio n'est pas une page de manuel.
- `slime` porte quatre sous-commandes : `mood <humeur>`, `activity <nom>`,
  `drop`, `kill`. L'alias `/mood` est retiré.
- `shutdown` : extinction CRT puis séquence de boot complète.

**Deux pièges techniques résolus :**
1. Les lignes du journal collapsaient les espaces multiples — l'art ASCII
   s'effondrait. Un drapeau `pre: true` par ligne active `white-space: pre`.
2. Les ligatures de JetBrains Mono recomposaient `----w` en `├───w`. Désactivées
   par `font-variant-ligatures: none` et `font-feature-settings: "liga" 0, "calt" 0`.
   **Ne pas les réactiver.**

---

## 12. La jauge de contexte

> « il faut également un easter egg quand le user atteint 100% de ctx »

**Décision :** la barre d'état porte une jauge en blocs qui monte à chaque
commande et changement de section. À 100 % : « fenêtre de contexte pleine —
compaction automatique… », puis un résumé ironique de ce qui a été « retenu »
(« Benjamin, développeur IA, Nantes, aime le vélo »), et la jauge repart à zéro.

---

## 13. Les thèmes

> « je pense que dans les options on va rajouter une liste theme avec les deux
> thèmes présents et d'autres genre terminalcolors.com/themes/noctis avec toutes
> ses variantes »

> « L'animation du thème ne se lance pas exactement au niveau du bouton, donc ça
> fait un peu bizarre. Il faut que si l'utilisateur est au clavier ça parte du
> milieu du bouton, si l'utilisateur est à la souris ça parte de l'endroit où il
> a cliqué. Histoire d'avoir un effet propagation. »

> « pour le thème ambre jour le jaune est trop foncé, on peut mettre une valeur
> vers #e6a000 ? »

> « je viens de voir dans la partie option, si je décoche animation off et que je
> change de thème, j'ai quand même l'animation avec la bulle, c'est
> contre-productif »

**Décisions :**
- Huit thèmes : `dark` `light` (les deux d'origine) + `noctis` `azureus` `uva`
  `bordo` `lux` `hibernus` (d'après la famille Noctis).
- Les valeurs Noctis sont des **approximations** relevées visuellement, pas les
  hex officiels.
- Transition en cercle (View Transitions API) depuis le **point cliqué**, repli
  sur le centre du bouton en navigation clavier.
- Accent du thème clair : `#e6a000` (demande explicite).
- La bascule « animations : off » coupe **aussi** la transition de thème.

**Point ouvert assumé :** `#e6a000` sur `#fff6f6` donne environ 2,2:1.
Acceptable pour les pastilles et les traits, insuffisant pour du texte. Benjamin
a choisi cette teinte en connaissance de cause ; à revoir si le thème clair
devient le défaut.

---

## 14. La mesure d'audience

> « ce qui peut être cool c'est de rajouter une commande pour faire une
> proposition d'ajout sur le site. Je compte mettre un outil de métrique, et je
> me dis qu'il faut rajouter comme sur le ask avec Chrome la partie consentement,
> c'est-à-dire oui j'accepte d'envoyer ça à la personne via cet outil là »

> « j'aimerais avoir les différents indicateurs, peut-être les commandes qui sont
> faites, est-ce que les gens trouvent la couronne, tout ça quoi. Faire un vrai
> plan de marquage pour que je puisse suivre ça »

Puis l'outil, fourni tel quel :

```html
<script defer src="https://umami.brezinben.dpdns.org/script.js"
        data-website-id="0afaa975-9528-4eac-84a2-9452a9ee607c"></script>
```

**Décisions :**
- Umami auto-hébergé, sans cookie ni identifiant.
- Plan de marquage complet (24 événements) : sections, missions, technos,
  commandes, commandes inconnues, recherches, easter eggs, couronne, slime,
  thèmes, options, redimensionnement, contexte plein, partage, propositions,
  boot. Table détaillée dans le `README.md`.
- Helper de marquage silencieux : si Umami est bloqué ou absent, rien ne casse.
- `propose` : **consentement explicite en deux temps**. La commande affiche ce
  qui part, la destination, ce qui ne part pas. Rien avant un `oui`.
- Trois chemins : `umami.track()` → POST `/api/send` → `mailto:`.

**Réserve technique communiquée :** Umami est un outil de mesure, pas une boîte
de réception. Le texte des propositions arrive dans les propriétés d'un
événement, à lire dans le tableau de bord.

---

## 15. Le partage

> « je pense que tu peux implémenter la commande /share avec LinkedIn, autre
> chose si tu vois. J'ai plein de choses, si tu cherches Brezinben sur internet
> tu devrais trouver mes réseaux sociaux »

Recherche effectuée : seul un profil Steam remonte sous ce pseudo, rien de
professionnel. Les cibles ont été limitées au vérifié.

**Décisions :**
- `share` seul : menu natif sur mobile, sinon liste des cibles.
- Cibles : `linkedin` (partage), `profil`, `github`, `mail`, `link` (copie).
- Cibles déclarées dans `content.json` sous `share.targets` — extensibles sans
  toucher au code, avec les jetons `{url}` `{title}` `{text}`.
- `og:image` = `share.png`, capture du terminal en 1200 × 630.

**À vérifier :** `github.com/brezinben` est une **déduction** depuis le domaine.
Non confirmé par Benjamin.

---

## 16. Les cartes techno de la stack

> « dans la partie stack je me dis qu'on pourrait rendre les rangs cliquables
> parce que je peux raconter des choses. Si l'utilisateur sélectionne Laravel, ça
> remplit la pane de droite, la pane resolve, parce qu'il y a du texte en haut
> mais il y a une grande partie où il n'y a pas grand chose et ça rajoute des
> informations. Par exemple SpecKit, on va commencer à expliquer, dire voilà pour
> SpecKit dans le cadre de tel projet. On va faire un test, au pire on fera un
> rollback »

> « c'est plutôt bien. Par contre faut pas que dans la partie stack il y ait un
> style différent, parce que ça fait trop domino, ça fait noir blanc en fonction
> du thème. Et l'utilisateur a pas besoin de sélectionner en faisant entrée ou
> espace, ça peut se mettre dynamiquement. Ce qui peut être intéressant c'est que
> là tu mets un texte au départ, il faudrait l'enlever : ça s'affiche que quand
> l'utilisateur fait entrée ou espace la première fois sur une des technos,
> ensuite dès qu'il change de techno ça met à jour la pane de droite »

**Décisions :**
- 27 fiches techno dans `content.json` sous `techNotes`, structure
  `{ where, what, why }`.
- Pas de style propre à la stack : même vocabulaire visuel que le reste.
- Comportement en deux temps : **armement** au premier Entrée / Espace, puis
  **suivi dynamique** du focus sans validation.
- Aucun texte d'invite avant l'armement.

---

## 17. Le layout et la hauteur

> « sur les grandes pages ou sur les commandes que je tape, la page s'agrandit.
> L'idée c'est que pour avoir l'expérience terminale il faut avoir une hauteur
> fixe qui est la taille de l'écran, enfin la taille disponible plutôt. Il y a
> une propriété CSS assez récente je crois qui permet de faire ça. Donc il faut
> que maximum la page fasse la taille disponible. Par contre pour savoir quelle
> partie il faut réduire je te laisse la main »

> « Sur grand écran tu peux élargir un peu »

> « quand j'agrandis la fenêtre de sortie il faut que le texte reste en haut,
> parce que là aujourd'hui c'est tout le texte qui s'étire et qui essaie de
> prendre toute la place, alors qu'il faut que le texte reste en haut »

> « On peut modifier la taille de la box via drag and drop ? »

**Décisions :**
- Hauteur bornée à `100dvh`, jamais de croissance de page.
- Contrat vertical : la session a un plancher, le journal cède en premier.
- Contenu **aligné en haut**, jamais étiré (`align-content: start`).
- Journal redimensionnable au glisser, poignée `⋯`, hauteur conservée.
- Largeur élargie sur grand écran.

---

## 18. Animations par mission (version illustrée)

Chaque mission a son animation SVG, dérivée du métier. Historique des consignes :

**SNCF Gares & Connexions**
> « met l'accent sur le fait que ça soit pour des personnes en situation de
> handicap. Effectivement ils montent dans le train, mais on les aide tout au
> long de la gare, donc ce n'est pas que le train, c'est surtout sur le quai »

> « La personne qui pousse le fauteuil roulant n'est pas assez mobile. On peut
> rajouter un aspect : avant que la personne bouge, on voit la partie échange de
> données, parce que moi je développe les solutions. La personne qui pousse le
> fauteuil doit faire une prestation sur mon appli, une fois que c'est validé
> elle peut aider la personne. Peut-être pas en fauteuil roulant mais une
> personne âgée, ça sera plus compréhensible et plus simple à animer. Il faut que
> les personnages bougent. »

> Puis : « rajouter une seconde animation d'échange avec le téléphone »

**Kereis**
> « je me demande comment bien représenter le fait de faire du agentic coding.
> Je vois plus une animation de quelqu'un qui réfléchit et qui parle, et une
> boîte qui représente un produit. J'ai un ami qui utilise une métaphore, il
> parle d'un exosquelette. Je me dis que ça peut être bien d'avoir une animation
> où c'est un développeur qui réfléchit, et là il y a un exosquelette qui lui
> arrive dessus, et du coup il va beaucoup plus vite »

> « L'exosquelette, c'est compliqué, ça rend mal parce que ça se superpose trop.
> Fais une personne qui marche, qui a une idée, elle monte dans une sorte de
> robot exosquelette, et ensuite tu vois par exemple le logo Claude qui arrive »

> « fais un plan beaucoup plus rapproché sur la tête. J'ai une tête normale, les
> cheveux très courts. Plan rapproché avec je me pose des questions, je me mets
> la main sur le menton, j'ai une idée, j'enfile l'exosquelette. Et ensuite le
> petit logo Claude. Après tu fais un fondu avec des briques qui s'assemblent
> parfaitement, et à la fin il faudrait que ça construise une sorte de produit »

**Transway**
> « c'est cool de mettre le vélo. Tu peux mettre de la mobilité douce, donc
> piéton, ou des bus ou des trams. Si tu mets un vélo, je veux bien que ce soit
> un vélo de course, parce que moi je fais du vélo de course. Ce qui peut être
> utile c'est de le mettre en surbrillance, en mode c'est un super mode de
> transport »

> « On ne comprend pas si c'est un bus ou un tram, fais un bus »
> « Enlève la surbrillance du vélo, il faut que le guidon soit plus haut »
> « rajoute une notion de points qui augmente et des CO2 en moins, tu peux
> enlever le soleil si ça prend trop de place »

**fruggr (RUN)**
> « je voyais bien une loupe qui se déplace de droite à gauche en diagonale, qui
> trouve un bug, genre un bug qui apparaît et après on le corrige. Et à la fin
> c'est nettoyé, c'est propre. On sent le clean code. »

> « laisse juste la ligne rouge et pas le bug, car sinon il se superpose »

**FPEE Industries**
> « Ajouter le fait qu'il faut communiquer avec les humains pour qu'ils
> expliquent leurs problèmes, que moi je puisse les réparer après »

**Formation**
> « les deux derniers blocs étant de la formation, tu peux faire une animation où
> j'étudie sur un PC, puis j'ai des idées »

**Refus important :**
> « utilise ce svg pour claude » (glyphe fourni par Benjamin)

Le logo Claude officiel n'a **pas** été reproduit — marque déposée. Le glyphe
fourni par Benjamin a été utilisé tel quel, en `#D97757`.

---

## 19. La cartographie technique (version illustrée)

> « aborder les différentes technologies que j'ai pu utiliser. J'aurais bien fait
> un peu comme la Semouleboard, c'est-à-dire la technologie union-find, en gros
> tu viens relier. L'idée ce serait de dire "côté Linux j'ai déjà utilisé tel
> outil" et ça s'affiche petit à petit, tu vois pas tout d'un coup. Au départ tu
> as 4 cases, et ensuite tu peux cliquer et ça t'ouvre les graphes avec des
> animations. L'idée c'est de faire une sorte de cartographie où je vais fournir
> un JSON et ça construit ça à la volée »

> « ça serait cool si le point sur lequel tu cliques se centre sur le schéma, et
> si tu cliques sur un autre point ça fait une animation de repliement en mode ça
> rollback l'animation et ensuite ça revient sur l'autre »

> « des fois je peux être bloqué, donc ça peut être cool de se déplacer
> manuellement aussi, ou de reset le zoom »

> « je veux également des logos, tu peux les trouver ici dashboardicons.com »

> Puis : « les logos et les ronds ça marche pas trop ensemble »

**Décisions :**
- Arbre à trois niveaux généré depuis un objet JS : domaine → brique → outils.
- Caméra qui se recentre au clic, repliement en cascade inversée.
- Déplacement manuel au glisser, bouton de réinitialisation.
- Logos depuis dashboardicons.com sur pastille neutre ; cercle ambre plein pour
  les technos sans logo (les deux ensemble ne fonctionnaient pas).

**Limite constatée :** dashboardicons.com est une banque de services
auto-hébergés, pas de logos de langages. React, Vue, NestJS, Tailwind n'y sont
pas. Alternative proposée mais non retenue : simple-icons.

---

## 20. Contraintes techniques d'écriture

Non négociables, appliquées partout :

1. **Styles inline uniquement.** La seule feuille de style contient ce qui ne
   peut pas être inline : `@keyframes`, `@font-face`, réinitialisations,
   masquage des barres de défilement, `box-sizing`. Aucune classe CSS.
2. **Aucune image.** La mascotte et la couronne sont des `box-shadow`. Les
   animations de la version illustrée sont des SVG inline.
3. **Ligatures désactivées** sur JetBrains Mono.
4. **Coins carrés.** Rayon `0` sauf exception justifiée.
5. **Cibles de 44 px minimum**, focus visibles, `aria-*` sur tous les contrôles.
6. `prefers-reduced-motion` et `prefers-color-scheme` respectés.
7. **Aucun tracker tiers** hors Umami auto-hébergé, aucun cookie, aucune vidéo,
   une seule famille de police.

---

## 21. Contenu factuel validé

**Identité** — Benjamin David, concepteur orchestrateur IA et développeur Full
Stack, Nantes. benjamin.david1@hotmail.fr · in/benjamin--david ·
portfolio.brezinben.dpdns.org

**Parcours**

| Période | Structure | Rôle |
|---|---|---|
| mai 2026 → | Kereis (via fruggr) | Développeur IA / Full Stack, équipe Urbanisme |
| 2024 → 2026 | SNCF Gares & Connexions (via fruggr) | Full Stack, Assist'enGare |
| 2023 → 2024 | fruggr by digital4better | Full Stack / IA, gestion du RUN |
| 2021 → 2023 | Transway | Full Stack, puis Technical Lead |
| 2020 → 2021 | LDC Services | Concepteur Développeur d'Application (alternance) |
| 2018 → 2020 | FPEE Industries | Technicien réseau (alternance) |

**Formation** — 2021 → aujourd'hui : veille continue, certifications,
expérimentations, d'autant plus à l'ère de l'IA (ligne ajoutée sur demande :
« rajoute une ligne de 2021 à maintenant, que l'on n'arrête jamais d'apprendre
surtout à l'ère de l'IA ») · 2020-2021 TP CDA · 2018-2020 BTS SIO SISR ·
2016-2018 Bac STI2D

**Précisions apportées par Benjamin :**
- Kereis : « la revue de spec par l'IA prend ~20 min là où un humain passerait
  une journée, étape obligatoire à chaque feature »
- Assist'enGare : réservation d'assistance pour les personnes en situation de
  handicap (PSH/PMR) souhaitant accéder à leur train
- LDC Services : « J'ai fait du développement logiciel classique, et clean du
  code »
- FPEE : échange direct avec les utilisateurs pour comprendre leurs problèmes,
  puis diagnostic et résolution
- Transway : vélo de course (pratique personnelle), points et CO2 évité

**Règle de rédaction :** les textes fournis par Benjamin sont conservés
**verbatim**. Ne pas reformuler.

**Clés JSON en anglais** — demande explicite : « Tous les JSON keys doivent être
en anglais ». D'où `city`, `looking_for`, `response_time_in_hours` (valeur
numérique, sans guillemets).

---

## 22. Reste à faire

1. **Contraste de l'accent sur le thème `light`** — `#e6a000` sur fond clair
   donne ~2,2:1. Séparer l'ambre décoratif de l'ambre textuel.
2. **`:focus-visible`** — le liseré de focus apparaît aussi au clic souris
   (« C'est normal la barre jaune qui peut apparaître ? »). Le restreindre au
   clavier.
3. **Vérifier `github.com/brezinben`** — déduction non confirmée.
4. **Synchroniser la version texte et `llms.txt`** — ni l'un ni l'autre ne
   mentionne Umami ; formulations d'impact divergentes.
5. **Déployer `share.png`** à la racine du domaine.
6. **Tester la commande `ai`** avec un modèle local Chrome activé
   (`chrome://flags/#optimization-guide-on-device-model`,
   `#prompt-api-for-gemini-nano`).

---

## 23. Valeurs figées — ne pas transformer en réglage

Ces valeurs ont été arrêtées après itération explicite. Elles étaient
paramétrables, Benjamin a demandé leur figeage.

| Valeur | Réglage |
|---|---|
| Durée du boot | `2000 ms` |
| Latence d'exécution | `20 ms` |
| Vitesse de frappe | `52 c/s` |
| Remplissage des barres | `100 ms` |
| Fondu de sortie du boot | `620 ms` |
| Repliement de l'autocomplétion | `170 ms` |
| Dépliement de l'autocomplétion | `220 ms` |
| Seuil de la couronne | année courante − 2000 |
| Propositions d'autocomplétion | 10 maximum |

Props restantes sur la version terminal : `startSection`, `showOutputPane`,
`contentUrl`, `holdBootScreen` (maintien de l'écran de chargement pour revue).

---

## 24. La version texte, et le seul script qu'elle porte

> « cette version est à destination des personnes qui ont un lecteur d'écran. Il
> faut que tu utilises un maximum d'éléments HTML pour améliorer l'accessibilité
> de cette page. Il faut que le site respecte le thème choisi par l'utilisateur
> sur la page terminal, pas besoin de picker sur cette page, parce que ce qu'ils
> vont faire, c'est soit rester sur cette page, soit l'imprimer, soit passer en
> mode lecture. »

**Décisions :**
- La page devient un document balisé : `header`, `nav`, `main`, `section`,
  `article`, `address`, `footer`. Aucun attribut `style` en ligne — le mode
  lecture les ignore, et le balisage doit porter le sens seul.
- Les paires clé/valeur du volet de sortie et les 57 fiches techno passent en
  `<dl>`. Une fiche techno ne prend pas de titre : 57 titres de plus
  encombreraient la navigation par titres d'un lecteur d'écran.
- Les changements de langue sont déclarés (`lang="en"`), les dates sont en
  `<time>`, et les sigles portent un `<abbr>` à leur première occurrence.
- Les marqueurs du terminal (`·`, `›`, `✓`, `◆`) ne se recopient pas. Ce sont des
  formes visuelles ; une liste dit la même chose et s'annonce correctement.
- Un seul script, en tête, qui lit `bd-term-opts` et pose `data-theme`. Il ne fait
  rien d'autre : ni écouteur, ni interaction, ni sélecteur de thème.
- Sans JavaScript, `light-dark()` donne le couple `light` / `dark` selon
  `prefers-color-scheme`. La page reste entière.
- Une feuille `@media print` : fond blanc, URL des liens en suffixe, et aucune
  mission coupée entre deux pages.

**Pourquoi le script entre :** le thème vit dans `localStorage`, et aucune règle
CSS ne sait lire `localStorage`. Le critère « aucun script » du ticket 11 visait
la fragilité du repli, pas le langage. Il devient : aucune ressource externe, et
un script dont la panne ne coûte rien.

**Duplication assumée :** les huit thèmes sont recopiés de `index.html` dans
`texte.html`. Une feuille partagée coûterait une requête de plus sur la page de
repli. Un test unitaire compare les deux relevés et casse si une couleur dérive.

**La police :** Atkinson Hyperlegible Next, dessinée par le Braille Institute pour
la basse vision — chaque lettre porte une forme que ses voisines n'ont pas. Elle
remplace Georgia sur cette page, et elle seule : la version terminal garde
JetBrains Mono. Fichier variable, sous-ensemble latin, auto-hébergé sous SIL Open
Font License 1.1, licence servie à côté du fichier. La flèche `→` manque au
sous-ensemble et retombe sur la police système.

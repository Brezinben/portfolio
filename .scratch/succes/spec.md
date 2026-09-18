# Succès

## Ce que la fonctionnalité doit obtenir

Le ticket `.scratch/en-attente-de-design/issues/06-gamification.md` le dit déjà, et rien
ne l'a changé : **le but est de faire découvrir ce qui existe déjà.** Le site porte des
commandes, sept easter eggs, une radio et une mascotte à trente-cinq états. Presque
personne ne les atteint. Les succès sont un panneau indicateur, pas un jeu.

Cela donne le critère qui tranche chaque arbitrage plus bas : **un succès existe pour
nommer une fonctionnalité que le visiteur n'a pas encore vue.**

## Les trois pièces

1. **Le badge du pied.** Une coupe en pixel art et un compteur `6 | 27`, à gauche des
   liens de variantes. Il ouvre la modale.
2. **La modale.** Les vingt-sept succès, verrouillés compris.
3. **L'alerte.** Un bandeau en bas du volet de sortie, dix secondes, une par déblocage.

Le dossier `design/export-succes-notification/` porte les décisions visuelles, les
valeurs réglées à l'œil et les pièges déjà payés. Il est une référence, pas une
implémentation : son README le dit lui-même.

## Les quatre décisions prises avec Benjamin

**Le total est vingt-sept.** Le konami, le mode développeur et la bannière console
n'existent pas dans le dépôt. Les trois succès qui en dépendaient sortent du catalogue.
Ils reviendront avec les fonctionnalités, que
`.scratch/fonctionnalites/issues/01-raccourcis-clavier.md` porte déjà. Aucun succès
verrouillé sans raison.

`DECLENCHEURS.md` annonce quatre fonctionnalités absentes. Il se trompe sur la
quatrième : `/slime kill` existe, et `src/interpret/mascot.ts` le prouve.

**Les deux pages annexes écrivent dans le stockage.** `404.html` et `texte.html` sont
autonomes. Chacune écrit sa clé dans `localStorage`, sur la même origine. La version
terminal la lit au chargement suivant.

**Le volet de sortie coupé ne déplace rien.** Le réglage `out: off` retire le volet, donc
il retire l'alerte. Le badge du pied s'agite déjà, et c'est le signal. Rien ne se replie
sur le journal, rien ne rouvre le volet.

**Succès** (`achievement`) est le terme du glossaire. La clé de stockage est
`bd-term-achievements`.

## Les décisions que je prends, et pourquoi

**Le stockage est un seul tableau de chaînes.** Il porte deux sortes d'entrées : les clés
des succès acquis, et des marques de progression préfixées — `theme:noctis`, `act:bike`,
`sec:whoami`. « Les huit ambiances » se calcule en comptant les marques `theme:`. Une
seule lecture au démarrage, une seule écriture, et la migration reste un filtre. C'est ce
que `DECLENCHEURS.md` demande, sans l'objet par succès qu'il refuse.

**L'alerte ne rejoue jamais un ancien déblocage.** Une clé écrite par la page 404 fait
nudger le badge au chargement suivant, et rien de plus. L'alerte appartient au moment du
déblocage.

**La gouttière de sélection de 2 px ne se construit pas.** Le README du design la garde
transparente « pour le jour où un état sélectionné arrive ». Rien n'est sélectionnable
dans cette liste, et rien ne le sera. La règle 2 de `CLAUDE.md` tranche.

**Le sous-titre verrouillé tire sa longueur de la clé, pas du hasard.** Un tirage au
rendu change à chaque passe d'Alpine, et la ligne clignote.

**Le sprite est un fichier SVG mis en ligne dans la page par la construction.** Un
`<use>` vers un SVG externe n'hérite pas des variables CSS du document : les huit thèmes
tomberaient. Le poids mesuré est de 2,1 Ko compressés, sur une marge de 54 Ko.

## Le point d'accroche unique

`src/app.ts:1909`, `submit()`, est **le seul appelant de `interpret()`**. Toute commande
tapée y passe, et aucune commande cliquée n'y passe. C'est le répartiteur que
`DECLENCHEURS.md` demande, et il existe déjà.

Le nom canonique de la commande se lit dans l'effet `track("commande", { cmd })` que le
dispatcher rend toujours. Les alias sont donc résolus : `cls` arrive en `clear`. Les
quatre succès de la mascotte se lisent sur le type des effets — `emote`, `activity`,
`evolve`, `blowUp` — sans analyser la ligne une seconde fois.

Restent sept accroches hors commandes, une ligne chacune : `goSection`, `setTheme`,
`complete`, `recall`, la caresse de la mascotte, et les deux pages annexes.

## Le budget

Le premier chargement mesure environ 96 Ko compressés, pour un plafond de 150 Ko. Le
sprite ajoute 2,1 Ko. Le reste est du balisage et du script, minifiés dans la page.
`tests/browser/budget.spec.ts` reste le garde-fou.

## Critère de succès

`bun run test` et `bun run test:browser` verts. Les huit critères d'acceptation du README
du design tiennent, moins celui qui parle de la gouttière.

## Ce qui reste ouvert, côté contenu

`/radio` n'a pas de succès. C'est la plus grosse fonctionnalité cachée du site, et le but
de la fonctionnalité est de faire découvrir ce qui est caché. Le design n'a pas dessiné
d'icône pour elle. **À trancher avec Benjamin** : demander une vingt-huitième icône à
Claude Design, ou laisser la radio hors du catalogue.

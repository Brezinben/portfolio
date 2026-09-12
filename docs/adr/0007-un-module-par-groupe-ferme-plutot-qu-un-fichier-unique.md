# 7. Un module par groupe fermé, plutôt qu'un fichier unique

**Statut :** acceptée

## Le problème

Le code tenait dans deux fichiers : `src/interpret.ts`, 1 177 lignes, et `src/app.ts`,
2 724. Chaque fonctionnalité les allongeait, et aucune frontière interne n'existait.

Le symptôme le plus visible était deux chaînes de `const` géantes. Celle de
l'interpréteur portait 34 liaisons en une seule instruction, mêlant mise en forme,
mascotte, easter eggs, vocabulaire et consentement. Rien ne l'imposait : `one-var` est
`off` dans le lint. L'habitude venait d'une règle de lignes vides, pas d'une contrainte.

L'ADR 0002 affirmait : « Un seul `import` existe dans tout le projet. Il n'y a donc pas
de graphe à résoudre. Rolldown ne sert qu'à fusionner `interpret.js` dans la page. »
Cette phrase décrivait un état de fait, pas une propriété voulue, et elle est devenue
fausse ici.

## Options considérées

Les coûts ci-dessous ont été mesurés, pas estimés.

**Un fichier plat par groupe, sous `src/`.** Le dossier serait passé de 2 fichiers `.ts`
à 17, noyant `index.html`, `content.json`, `robots.txt` et les autres artefacts servis,
qui sont la raison d'être de `src/`. Un préfixe de nom (`interpret-lines.ts`) est un
dossier mal orthographié.

**Un `types.ts` central.** `verbatimModuleSyntax` efface les `import type` : ils ne
produisent aucune arête d'exécution, donc un hub ne préviendrait aucun cycle. Il aurait
coûté un module que tout le monde importe, pour rien.

**Migrer les imports de `app.ts` et des six tests.** Mesuré : 7 fichiers touchés, 23
lignes supprimées, 35 ajoutées, contre 30 lignes pour une façade. Coût brut presque
identique, mais le même commit aurait bougé le code **et** ses témoins.

## La décision

**Deux dossiers, `src/interpret/` et `src/terminal/`, et une façade.**

`src/interpret.ts` ne contient plus que des ré-exports. La coquille et les tests
unitaires passent par cette porte, jamais par un module du dossier. C'est ce qui a permis
de prouver la neutralité du découpage : aucun fichier de test n'a changé d'un caractère,
et leur verdict vert atteste que le déplacement n'a rien altéré.

Les modules s'ordonnent en rangs : un module n'importe que des modules de rang
strictement inférieur. Il n'existe aucun cycle.

**Le composant Alpine se découpe en tranches.** Une tranche est un objet de méthodes qui
parlent à `this`, et les tranches ne s'importent jamais entre elles. Deux règles les
tiennent, et la violation d'aucune des deux ne se voit au typecheck :

1. **Aucune tranche ne porte d'accesseur.** Non par nécessité — la fusion passe par les
   descripteurs, qui préserveraient un `get` intact — mais pour que `app.ts` reste le
   seul fichier où vivent les valeurs lues par le balisage. L'ADR 0002 exige qu'elles
   soient des propriétés de `Alpine.data` et non des constantes de module, que le
   minifieur renomme.
2. **`shell.ts` n'importe que des types, en forme longue `import type`.** Le
   spécificateur en ligne conserve l'instruction d'import, ce qui transformerait le cycle
   de types en cycle d'exécution : une page blanche dans l'artefact fondu, invisible
   partout ailleurs. Une règle de lint le tient, vérifiée en la faisant échouer.

**La fusion passe par `Object.defineProperties` et `getOwnPropertyDescriptors`**, jamais
par un étalement. Un étalement du composant appelle ses accesseurs et copie leur valeur :
`reduced` figé à `false` laisserait tourner les animations chez qui demande moins de
mouvement, sans casser un seul test. Et un étalement dans le littéral fait perdre à
`withMagics` l'inférence de son type.

**Le type des tranches dérive de la fusion**, jamais l'inverse. Déclarer une tranche sans
la fusionner ne pouvait être attrapé ni par `tsc`, ni par le lint, ni par un test
unitaire.

## Ce que cela coûte

**L'ADR 0002 perd une de ses phrases.** « Un seul `import` existe dans tout le projet »
n'est plus vraie. Ce qui reste vrai de cet ADR, et qui comptait, c'est que l'artefact ne
contient aucune référence à un fichier TypeScript, et que le minifieur renomme les
identifiants de portée module.

**La construction a dû changer.** Le filtre de copie s'applique aussi aux dossiers, et un
dossier n'a pas d'extension : `src/interpret/` était créé dans l'artefact puis vidé de
tous ses enfants, et publié vide. Le défaut est passé en production avant d'être vu,
parce qu'aucun test ne listait les dossiers. Corrigé par un élagage sur le contenu — une
liste de noms aurait perdu un actif posé à côté des modules — et un test le garde.

**Rien ne prévient un cycle automatiquement.** `import/no-cycle` existe dans oxlint et
tient en une ligne de configuration. L'ordre des rangs est le seul autre garde-fou.

**Le premier chargement ne bouge pas d'un octet.** Rolldown fond le graphe comme il
fondait le fichier unique. Les imports dynamiques, qui allégeraient la page, n'ont pas
été faits ici : le filtre de copie et le fait que `bundle()` ne garde que le premier
chunk les rendent impossibles sans toucher à la construction. Décision remise à un second
lot, une fois le poids réel des easter eggs mesuré sur des modules isolés.

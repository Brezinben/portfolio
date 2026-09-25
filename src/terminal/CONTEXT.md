# Coquille du terminal

Ce qui applique à la page ce que l'interpréteur décrit. C'est le second seam du projet :
il ne se teste que dans un vrai navigateur, sur l'artefact construit.

`src/app.ts` reste le point d'entrée. Ce dossier porte ce qui peut en sortir sans mentir
sur son comportement.

## Language

**Tranche** (`slice`) :
Un objet de méthodes qui parlent à `this`. Les tranches ne s'importent jamais entre
elles : leur seul couplage est `this`, comme du temps où elles vivaient dans un littéral
unique. Chacune déclare son contrat dans une interface écrite à la main — déduire `this`
du type des tranches tourne en rond, et TypeScript rend `any`.
_Avoid_: mixin, module, fragment.

**Socle** (`shell.ts`) :
`Magics`, `Terminal`, `Shell` et la fonction `slice`. Il n'importe **que des types**, en
forme longue `import type`. Le spécificateur en ligne conserve l'instruction d'import, ce
qui transformerait le cycle de types en cycle d'exécution : une page blanche dans
l'artefact fondu, invisible partout ailleurs. Une règle de lint le tient.
_Avoid_: base, noyau, socle technique.

**Valeur figée** (`frozenValue`) :
Durée ou seuil arrêté après itération. `settings.ts` porte celles du terminal,
`mascot/constants.ts` celles de la mascotte.
_Avoid_: constante, paramètre, réglage.

## Deux règles dont la violation ne se voit pas au typecheck

**Aucune tranche ne porte d'accesseur.** Ce n'est pas une nécessité technique : la fusion
passe par les descripteurs, qui préserveraient un `get` intact. C'est un choix, pour que
`app.ts` reste le seul fichier où vivent les valeurs lues par le balisage. L'ADR 0002
exige qu'elles soient des propriétés de `Alpine.data` et non des constantes de module,
que le minifieur renomme : les garder en un seul fichier rend cette contrainte auditable
d'un coup d'œil.

**Le type des tranches dérive de la fusion**, jamais l'inverse. `app.ts` porte une liste
unique, `slices()`, d'où sortent à la fois l'objet réellement fusionné et le type que
`this` voit. Déclarer une tranche sans la fusionner ne pouvait être attrapé ni par `tsc`,
ni par le lint, ni par un test unitaire : la page cassait à la première utilisation.

## Pourquoi la fusion passe par les descripteurs

`Object.defineProperties(component, Object.getOwnPropertyDescriptors(slices()))`, et non
un étalement. Deux raisons, toutes deux vérifiées :

1. Un étalement du composant **appelle ses accesseurs et copie leur valeur**. `stacked`
   figé à sa valeur du chargement garderait la mise en page d'une fenêtre qui a changé
   de largeur, sans casser un seul test.
2. Un étalement dans le littéral fait perdre à `withMagics` l'inférence de son type :
   `T` devient `unknown`, et cent vingt erreurs tombent d'un coup.

## Ce qui ne sort pas de `app.ts`

Les champs d'état, les dix-sept accesseurs, `init` et `apply`. `apply` pourrait vivre
ailleurs sans un seul import, puisque ses vingt appels passent tous par `this` — mais
c'est la table des matières du composant, et sa place est dans le fichier d'entrée.

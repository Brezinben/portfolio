# Bun comme runtime, TypeScript comme source

Le projet tournait sous Node, en JavaScript, avec `npm` pour les dépendances. Il passe à Bun
et à TypeScript. Les deux décisions sont liées : elles répondent à la même exigence.

## Le problème

Ce dépôt est un portfolio. Il est lu par des gens qui veulent savoir ce que son auteur sait
faire. Du JavaScript non typé ne montre pas ce qu'il sait faire, il montre le plus petit
dénominateur commun.

La contrainte qui s'y opposait est écrite dans l'ADR 0002 : `src/` doit rester servable tel
quel par un serveur statique, sans étape de construction. Un navigateur ne sait pas exécuter
du TypeScript.

## Options considérées

**Garder le JavaScript.** Coût nul. Mais le dépôt continue de dire le contraire de ce qu'il
prétend démontrer.

**Typer par des commentaires JSDoc.** `tsc` sait vérifier du JavaScript annoté, et `src/`
reste servable. Rejetée : personne n'écrit du TypeScript comme ça, et un lecteur y verrait
un contournement plutôt qu'une compétence.

**Ne migrer que l'outillage.** `tools/` et `tests/` en TypeScript, `src/` en JavaScript.
Rejetée pour la même raison : c'est `src/` que l'on lit.

## La décision

**Tout le JavaScript du dépôt passe en TypeScript**, sauf `src/vendor/alpine.js`, code tiers
vendu tel quel, et `design/support.js`, référence visuelle gelée.

**La contrainte « `src/` servable tel quel » est retirée.** Elle était déjà vestigiale :
depuis l'ADR 0003, publier c'est `bun run build`, et le site est servi depuis `dist/`. Elle
ne décrivait plus une propriété dont quelque chose dépendait, seulement une propriété qu'on
aurait pu exercer. Ce qui compte reste vrai : `dist/` ne contient aucune référence à un
fichier TypeScript, et un test le vérifie.

**Le typage est vérifié, pas seulement écrit.** `bun run typecheck` lance `tsc --noEmit` en
`strict`, avec `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` et
`erasableSyntaxOnly`. Bun et oxc effacent les types sans les contrôler : sans `tsc`, écrire
`: string` ne garantirait rien.

**Bun devient le runtime**, épinglé à une version exacte dans `.config/mise/config.toml`,
comme les autres outils. `bun.lock` remplace `package-lock.json`.

**Node reste, pour Playwright seulement.** Playwright fonctionne sous Bun — mesuré, Chromium
se lance et les tests passent — mais son lanceur démarre par un shebang `node`, Bun n'apporte
aucun gain là où le coût est le navigateur, et Playwright ne soutient pas Bun officiellement.

## Ce que Bun ne remplace pas

Mesuré, pas supposé. `Bun.build` produit un artefact 2,8 % plus lourd que `rolldown` après
compression, et le budget de poids se mesure compressé. Le bundler HTML de Bun laisse les
commentaires, les espaces et le CSS en ligne intacts, et il externalise le script alors que
la page a besoin du module fondu dedans. `Bun.Image` décode, redimensionne et ré-encode, mais
ne compose jamais deux images.

`rolldown`, `html-minifier-terser` et `typescript` restent donc. Bun ne retire aucune
dépendance de construction. Ce qu'il apporte : les tests unitaires en 40 ms au lieu de 198,
l'exécution directe du TypeScript, et un seul gestionnaire de paquets.

## Ce que cela coûte

Un `npm ci` n'est plus possible : `package-lock.json` a disparu. Qui n'a pas Bun ne peut pas
installer le projet à l'identique.

Deux runtimes cohabitent, et il faut savoir lequel fait quoi. `bun test` sans chemin ramasse
aussi les specs Playwright : les commandes passent par `bun run`, jamais par `bun` seul.

Le typage a déjà payé son coût d'entrée en révélant des défauts réels — un accès à
`output[0].code` qui pouvait planter sur `undefined`, un effet qui déclarait deux champs
jamais transmis, une fonction dont la signature mentait sur son retour. C'est le bénéfice
attendu, mais il se paie en temps sur chaque fichier migré.

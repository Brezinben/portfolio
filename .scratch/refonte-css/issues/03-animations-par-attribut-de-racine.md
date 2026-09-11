# Lot 3 — les animations passent par un attribut de racine

Status: resolved
Type: task
Blocked by: 02

Le booléen `anim` apparaît dans **13 liaisons** sous la forme
`animation:${anim ? 'X' : 'none'}`. `running` dans 4, `power` dans 2.

## Le travail

Poser `:data-anim="anim"` et `:data-power="power"` sur `.tm`. Remplacer les 13 liaisons
par des règles statiques, plus une coupure unique :

```css
.tm[data-anim="false"] * { animation: none !important }
```

Le précédent existe déjà dans le fichier, pour `prefers-reduced-motion`.

Le délai indexé devient `--at` en ligne, plus `animation-delay: calc(var(--at) * 24ms)`
dans la règle.

## Ne pas couper `transition`

La règle de mouvement réduit coupe les deux. Celle-ci ne doit couper que l'animation.
Sinon les `x-transition` d'Alpine sur les suggestions changent de comportement quand
`anim` est désactivé. `tests/browser/autocomplete.spec.ts` le vérifie.

## Vérification

`bun run test:browser` vert. Basculer le réglage d'animation dans la modale d'options et
vérifier que les suggestions s'ouvrent toujours.

## Réponse

Fait. Les 13 liaisons ne portent plus le drapeau. Le délai indexé des suggestions est
devenu `--at`, et la règle porte `calc(var(--at) * 24ms)`.

`:data-anim` est lié en chaînes explicites, `anim ? 'true' : 'false'`, comme
`aria-current` à côté. Une liaison Alpine vers un booléen brut ne donne pas la même chose
sur un attribut `data-*` que sur un attribut `aria-*`.

## Un changement de rendu, assumé

**Le réglage d'animation ne coupait que 13 animations sur 20.** `popIn`, `bang`, `spark`,
`fadeIn`, `bootLine`, `bootOut`, `vtReveal` et les 30 règles de la mascotte lui
échappaient. La coupure unique les prend toutes.

Ce n'est pas un saut dans l'inconnu : `@media (prefers-reduced-motion: reduce)` applique
déjà `* { animation: none !important }` à la page entière, mascotte comprise, et
`mascotte.spec.ts` couvre cet état. Éteindre le réglage amène désormais la page là où le
mouvement réduit l'amenait déjà.

Trois instantanés bougent d'une seule ligne : la modale d'options perd son `popIn` quand
le réglage est éteint. Le test dit pourquoi.

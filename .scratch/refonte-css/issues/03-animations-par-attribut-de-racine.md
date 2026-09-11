# Lot 3 — les animations passent par un attribut de racine

Status: ready-for-agent
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

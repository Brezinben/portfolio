# 08: La mascotte

**What to build:** Un slime en pixels vit dans le volet central. Il respire, cligne des yeux, arpente sa piste
et se cogne aux parois. Il réagit quand le curseur passe près de lui, se laisse attraper et
déplacer, et après vingt-six clics une couronne lui tombe sur la tête.

Le sprite est validé et ne doit pas être redessiné : deux tentatives de refonte ont été
annulées.

**Blocked by:** 02

**Status:** ready-for-agent

- [x] Le sprite est dessiné en `box-shadow`, 24 × 18 pixels de 2,6 px, sans aucune image
- [x] Les couleurs sont fixes et identiques dans les huit thèmes
- [x] Les sept humeurs existent : `idle` `happy` `laugh` `sad` `scared` `sleep` `alert`
- [x] Il respire, cligne à intervalles irréguliers, arpente et se cogne avec écrasement
- [x] La réaction élastique au curseur ne se déclenche qu'à proximité, jamais à cinquante pixels
- [x] Il est attrapable à la souris et sursaute à la prise, sans point d'exclamation
- [x] La couronne apparaît après 26 clics et est conservée sur l'appareil
- [ ] Le saut compte sept poses
- [x] La position et la transformation sont écrites directement, sans passer par l'état réactif

## Ce qui n'est pas porté

Deux détails du canvas manquent, et je préfère le dire plutôt que cocher.

**L'étincelle au choc** n'est pas rendue. La keyframe `spark` existe dans la feuille de
style, mais elle demande un second élément positionné au point d'impact, que je n'ai pas
ajouté.

**Le saut à sept poses** n'est pas porté. La keyframe `hop` est disponible, mais les sept
poses intermédiaires sont un travail de sprite à part entière, et le sprite ne doit pas
être redessiné sans validation.

Le reste suit le canvas : sprite verbatim, couleurs fixes dans les huit thèmes, sept
visages, respiration par `bob`, écrasement par `bumpL` / `bumpR`, sursaut par `startle`,
chute par `splat`, et réaction de proximité par `wiggle` sous soixante pixels.

La position passe par `left` et non par `transform` : les keyframes du canvas pilotent
`transform`, et les deux se battraient pour la même propriété.

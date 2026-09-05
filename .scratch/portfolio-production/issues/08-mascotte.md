# 08: La mascotte

**What to build:** Un slime en pixels vit dans le volet central. Il respire, cligne des yeux, arpente sa piste
et se cogne aux parois. Il réagit quand le curseur passe près de lui, se laisse attraper et
déplacer, et après vingt-six clics une couronne lui tombe sur la tête.

Le sprite est validé et ne doit pas être redessiné : deux tentatives de refonte ont été
annulées.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] Le sprite est dessiné en `box-shadow`, 24 × 18 pixels de 2,6 px, sans aucune image
- [ ] Les couleurs sont fixes et identiques dans les huit thèmes
- [ ] Les sept humeurs existent : `idle` `happy` `laugh` `sad` `scared` `sleep` `alert`
- [ ] Il respire, cligne à intervalles irréguliers, arpente et se cogne avec écrasement et étincelle
- [ ] La réaction élastique au curseur ne se déclenche qu'à proximité, jamais à cinquante pixels
- [ ] Il est attrapable à la souris et sursaute à la prise, sans point d'exclamation
- [ ] La couronne apparaît après 26 clics et est conservée sur l'appareil
- [ ] Le saut compte sept poses
- [ ] La position et la transformation sont écrites directement, sans passer par l'état réactif

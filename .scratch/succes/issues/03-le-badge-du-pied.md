# Le badge du pied

Status: ready-for-agent
Type: task
Blocked by: 02

Une coupe et un compteur dans le pied de page, à gauche des liens de variantes. C'est le
seul élément permanent de la fonctionnalité.

## Ce qu'il montre

Le compteur sépare l'acquis du total par un **pipe** : `6 | 27`. L'acquis prend l'ambre
textuel, le total et le pipe restent en `--fg2`. Une barre oblique se lisait comme une
fraction ; ce n'en est pas une, c'est une progression.

## La relance

Tant qu'un succès acquis n'a pas été **vu**, deux choses arrivent :

- la coupe s'agite toutes les deux secondes — `@keyframes ach-nudge` du design ;
- une pastille d'accent apparaît en coin.

La relance s'arrête **au clic**, jamais au bout d'un minuteur. C'est la seule chose qui
rappelle un déblocage au visiteur qui a raté l'alerte.

`anim: off` et `prefers-reduced-motion` coupent l'agitation. **La pastille reste.** Sans
elle, ce visiteur n'aurait aucun signal — et le réglage `out: off` lui a déjà retiré
l'alerte.

## L'accessibilité

Le badge est un bouton. Son `aria-label` porte le compte et le non-vu en toutes lettres :
« succès : 6 sur 27, 1 non regardé ». La pastille est décorative, et elle ne s'annonce
pas deux fois.

## La place dans le balisage

Le pied porte deux paragraphes. Le badge entre dans le second, avant les liens `texte` et
`llms.txt`. Il ne doit pas pousser le premier paragraphe, qui se tronque déjà en
`text-overflow: ellipsis`.

## Critère d'acceptation

Le badge s'agite jusqu'à l'ouverture de la modale, et pas une seconde de plus. Le
compteur suit le déblocage sans rechargement.

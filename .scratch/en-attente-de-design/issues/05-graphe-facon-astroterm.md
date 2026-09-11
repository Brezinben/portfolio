# Graphe façon astroterm

Status: needs-design
Type: task

L'issue GitHub #2 dit seulement : « Idée pour le graph : https://terminaltrove.com/astroterm/ »,
et pointe la ligne 8 de `TODO.md`. **La cible est floue** : le dépôt n'a pas de « graphe »
unique. Il a une cartographie technique, une frise de parcours, un arbre, une jauge.

## Prompt à coller dans Claude Design

> `astroterm` est un planétarium en terminal : https://terminaltrove.com/astroterm/
> Il affiche une carte du ciel en caractères, avec des étoiles de tailles différentes et
> des constellations reliées.
>
> J'ai noté cette référence pour « le graphe » du portfolio, mais je n'ai pas dit lequel.
> Le site en a plusieurs : la cartographie technique, la frise de parcours, l'arbre, la
> jauge.
>
> Regarde le canvas et dis-moi **lequel gagnerait le plus à ressembler à une carte du
> ciel**, et pourquoi. Ensuite dessine-le.
>
> Mon intuition : la cartographie technique. Une compétence est une étoile, sa maîtrise
> est sa magnitude, et les liens entre technologies sont les constellations. Mais
> contredis-moi si tu vois mieux.
>
> Contraintes : caractères et CSS, pas de canvas WebGL. Huit thèmes. Le réglage `anim`
> doit laisser la carte lisible en fixe.

# /slime 3d

Status: needs-design
Type: task

Vient de l'issue GitHub #2 : « une commande /slime 3d => animation 3D de la mascotte ».

## Le risque à poser d'emblée

La mascotte est aujourd'hui une feuille de sprites, décrite par l'ADR 0006 : une feuille
par forme, tirée à la demande. Le budget de premier chargement est de 150 Ko compressés,
dont 69 Ko sont consommés. **Une 3D réelle ne tient pas dans ce budget** si elle amène un
moteur. Le ticket vaut d'abord par la réponse à cette question.

## Prompt à coller dans Claude Design

> Le portfolio terminal a une mascotte visqueuse, faite de feuilles de sprites 2D, une
> feuille par état. Je voudrais une commande `/slime 3d` qui la montre en trois
> dimensions.
>
> Avant de dessiner quoi que ce soit, réponds à ceci : **est-ce que « 3D » veut dire une
> vraie géométrie, ou l'illusion de la profondeur ?**
>
> Le budget est de 150 Ko compressés au premier chargement, et 69 Ko sont déjà pris. Un
> moteur 3D n'y entre pas. Ce qui y entre :
> - Une rotation en sprites, une image par angle.
> - Un rendu CSS `transform-style: preserve-3d` sur des plans empilés.
> - Un ASCII 3D calculé, dans l'esprit du terminal.
>
> Dis-moi laquelle tient la promesse et laquelle est un gadget, puis dessine celle qui
> tient. Si aucune ne vaut le coup, dis-le : je préfère abandonner que livrer une
> déception.
>
> Contraintes : huit thèmes, quatre d'entre eux appliquent un `hue-rotate` à la mascotte.
> Le réglage `anim` coupe le mouvement.

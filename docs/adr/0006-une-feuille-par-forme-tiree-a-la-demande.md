# 6. Une feuille par forme, tirée à la demande

**Statut :** acceptée

## Le problème

La mascotte a trois formes : le slime, le cube et le pingouin. Chacune porte les mêmes
trente-deux états. Les feuilles source pèsent 75 Ko pour le slime, 103 pour le cube, 122 pour
le pingouin. Fusionnées, 22, 31 et 36 Ko.

L'ADR 0004 avait tranché : une seule image pour tous les états, une seule requête. Appliqué
aux trois formes, ce principe ferait partir 90 Ko d'images au premier rendu, pour un budget
de page fixé à 150 Ko. Or `/slime evolve` est un easter egg : presque personne ne le tapera.

## La décision

Une image fusionnée **par forme**, et une seule part au premier chargement : celle du slime.
Le cube et le pingouin arrivent quand la commande les demande, et une seule fois par visite.

Les trois formes partagent les règles d'état. Elles portent les mêmes états, dans le même
ordre, avec le même nombre de cases : seule l'image change, posée par un attribut de données
sur la piste. Une forme n'a donc pas trente-deux règles de plus, elle en a une.

Chaque transition vit dans la feuille de la forme sous laquelle elle se joue. `evolveCube`
montre un slime qui devient cube, mais elle est dans la feuille du cube : c'est celle qui
vient d'arriver quand elle se joue. `devolve` reste dans celle du pingouin, pour la même
raison.

## Ce que cela coûte

Le premier chargement ne bouge pas d'un octet. En échange, la première évolution attend le
réseau : la mascotte joue son état de chargement pendant ce temps, ce qui dit exactement ce
qui se passe.

Le contrat « une seule image, une seule requête » de l'ADR 0004 devient « une seule image par
forme ». Il n'est pas abandonné : il est borné à ce qui est affiché.

Le budget de poids ne se mesure plus d'un seul plafond mais d'un par forme. Un plafond global
aurait laissé une feuille grossir en silence derrière la baisse d'une autre.

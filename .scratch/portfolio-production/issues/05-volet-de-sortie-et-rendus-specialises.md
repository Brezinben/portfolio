# 05: Volet de sortie et rendus spécialisés

**What to build:** Le volet de droite affiche un contenu différent pour chaque section. Le visiteur parcourt la
frise du parcours au clavier et ouvre une fiche de mission. Il descend l'arbre de la stack et
lit une fiche techno. La section contact s'affiche en sortie `jq` colorée.

L'arbre de la stack se comporte en deux temps : rien ne s'affiche avant que le visiteur ne
valide une première techno, puis le volet suit son focus sans nouvelle validation.

**Blocked by:** 04

**Status:** ready-for-agent

- [x] La frise du parcours est navigable au clavier, entrée sélectionnée en gras avec barre d'accent
- [x] Entrée sur une entrée de la frise ouvre la fiche de mission
- [x] L'arbre de la stack a trois niveaux et s'arme à la première validation par Entrée ou Espace
- [x] Une fois armé, l'arbre suit le focus et met à jour le volet de sortie sans validation
- [x] Aucun texte d'invite ne s'affiche avant l'armement
- [x] La stack n'a aucun style propre : même vocabulaire visuel que le reste
- [x] Les 27 fiches techno viennent de `content.json`, en trois parties : où, quoi, pourquoi
- [x] La section contact rend une sortie `jq` colorée par type, avec `/send-mail` préchargé dans la saisie
- [x] Les hiérarchies utilisent les glyphes d'arbre et les années sont en chiffres tabulaires

## Deux écarts entre la documentation et les données

Le README annonce un arbre de stack à **trois** niveaux. `content.json` en porte deux :
cinq domaines, chacun avec une liste de technologies. Le portage suit les données.

Le README décrit les fiches techno en trois parties, `where`, `what`, `why`. Les 27 fiches
réelles en ont deux : `where` et `note`. Le portage suit les données là aussi.

Les jauges en blocs ne sont pas dans ce ticket : elles appartiennent à la jauge de contexte
de la barre d'état, donc au ticket 10. Le critère les mentionnait à tort.

## Note d'architecture

La mise en forme des lignes de contenu a rejoint le module `interpret.js`. Elle est pure,
donc testée sans navigateur : sept tests couvrent la coloration `jq` par type, le retrait
et les bandeaux. C'est du travail de rendu, mais c'est du calcul, et il n'y avait aucune
raison de le laisser dans la page.

# 05: Volet de sortie et rendus spécialisés

**What to build:** Le volet de droite affiche un contenu différent pour chaque section. Le visiteur parcourt la
frise du parcours au clavier et ouvre une fiche de mission. Il descend l'arbre de la stack et
lit une fiche techno. La section contact s'affiche en sortie `jq` colorée.

L'arbre de la stack se comporte en deux temps : rien ne s'affiche avant que le visiteur ne
valide une première techno, puis le volet suit son focus sans nouvelle validation.

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] La frise du parcours est navigable au clavier, entrée sélectionnée en gras avec barre d'accent
- [ ] Entrée sur une entrée de la frise ouvre la fiche de mission
- [ ] L'arbre de la stack a trois niveaux et s'arme à la première validation par Entrée ou Espace
- [ ] Une fois armé, l'arbre suit le focus et met à jour le volet de sortie sans validation
- [ ] Aucun texte d'invite ne s'affiche avant l'armement
- [ ] La stack n'a aucun style propre : même vocabulaire visuel que le reste
- [ ] Les 27 fiches techno viennent de `content.json`, en trois parties : où, quoi, pourquoi
- [ ] La section contact rend une sortie `jq` colorée par type, avec `/send-mail` préchargé dans la saisie
- [ ] Les hiérarchies utilisent les glyphes d'arbre, les jauges sont en blocs, les années en chiffres tabulaires

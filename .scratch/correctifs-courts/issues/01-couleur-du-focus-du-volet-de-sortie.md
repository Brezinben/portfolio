# La couleur du focus du volet de sortie n'est pas la bonne

Status: resolved
Type: task

## Ce qu'on observe

`src/index.html:919-922` :

```css
.tm [data-ctl]:focus-visible,
.tm [data-pane="out"] [tabindex="0"]:focus-visible {
  outline: 2px solid var(--acc);
  outline-offset: -2px;
}
```

Le contour prend `var(--acc)`, l'ambre décoratif.

## Pourquoi c'est faux

Le fichier porte déjà la distinction, ligne 902 :

> La feuille du canvas colore les liens avec l'ambre décoratif. Un lien est du texte :
> il prend l'ambre textuel.

`[data-pane="out"] [tabindex="0"]` est une **région de texte**, `role="region"`, pas un
contrôle. Le volet applique d'ailleurs déjà la correspondance dans ses propres liaisons :
`row.kc === 'acc' ? 'acc-text' : row.kc`. Le contour est la seule chose du volet qui
reste sur `--acc`.

`--acc-text` vaut `var(--acc)` par défaut (ligne 518). Un seul thème le redéfinit :
`light`, à `#8f5f00`. Le changement ne se voit donc **qu'en thème clair**, où `--acc`
vaut `#e6a000` — trop faible pour le rapport de 3:1 qu'un indicateur de focus demande.

## Ce qu'il faut faire

Le second sélecteur prend `var(--acc-text)`. Le premier, `[data-ctl]`, reste sur
`var(--acc)` : ce sont des contrôles, pas du texte. Les deux sélecteurs se séparent donc
en deux règles.

## Vérification

Un test qui lit `outlineColor` sur la région de sortie focalisée, en thème `light` et en
thème `dark`. En `dark` les deux valeurs coïncident ; c'est `light` qui prouve la règle.

## Answer

Corrigé en même temps qu'un défaut voisin : le journal et sa poignée, les deux seuls
éléments focalisables du volet central, n'avaient aucune marque de focus. Ils retombaient
sur l'anneau du navigateur, invisible sur un fond sombre.

La règle se coupe en deux, comme demandé. Les contrôles — `[data-ctl]` et la poignée —
gardent `var(--acc)`. Les régions de texte — le journal et la sortie — prennent
`var(--acc-text)`.

`tests/browser/layout.spec.ts` lit la couleur du contour sur les trois éléments, en
sombre et en clair. En sombre les deux ambres coïncident ; c'est le clair qui prouve la
règle.

## Comments

2026-09-24 : la conclusion sur `[data-ctl]` est annulée. En thème clair, `var(--acc)`
donne 1,9 à 2,1:1 contre le fond, sous le 3:1 d'un indicateur de focus. Tous les
contours prennent `var(--acc-text)`. Voir `.scratch/revue-critique/issues/01`.

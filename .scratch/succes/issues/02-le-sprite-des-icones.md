# Le sprite des icônes

Status: ready-for-agent
Type: task
Blocked by: 01

Vingt-neuf icônes en pixel art : les vingt-sept succès, la coupe du badge, et le cadenas
des verrouillés. `design/export-succes-notification/maquette/icones.json` en porte
trente-deux ; les trois icônes des succès retirés ne sont pas rendues.

## La forme retenue

Un fichier `src/assets/succes.svg`, qui ne porte que des `<symbol>`. La construction le
met **en ligne** dans `index.html`, comme elle le fait déjà pour `src/404.css`. La page
le référence par `<use href="#i-<nom>">`.

**Pourquoi en ligne.** Un `<use>` vers un SVG externe n'hérite pas des variables CSS du
document. Les cinq teintes sont toutes dérivées du thème : servi en fichier, le sprite
perdrait les huit thèmes d'un coup.

**Pourquoi pas un PNG.** La mascotte est en PNG parce qu'elle est dessinée, pas teintée.
Une icône de succès porte cinq teintes qui suivent le thème. Un PNG les figerait.

## La génération

Un outil à part, `tools/icones.ts`, lit le JSON du design et écrit le SVG. Il ne tourne
pas dans la construction : les données du design ne bougent qu'au prochain export, et un
pas de construction permanent pour une conversion unique serait spéculatif. Le SVG est
commité.

Le format mesuré, en `<path>` et non en `<rect>` : 12 Ko bruts, **2,1 Ko compressés**.

```
<symbol id="i-trophy" viewBox="0 0 16 16">
  <path fill="var(--t-acc)" d="M4 3h8v3h-8z"/>
  …
</symbol>
```

La grille est de seize unités, et non trente-deux. Le design double les coordonnées pour
un `viewBox` de 32 ; un SVG s'étire, donc la CSS décide seule de la taille. La moitié des
octets part avec le doublement.

`shape-rendering: crispEdges` sur les symboles : sans lui, un pixel tombe entre deux
pixels d'écran et le contour bave.

## Les cinq teintes

Elles se déclarent une fois, sur la racine, en variables dérivées du thème. Aucune
couleur en dur, aucune règle par thème.

| variable | valeur |
| --- | --- |
| `--t-ink` | `currentColor` |
| `--t-soft` | l'encre atténuée vers le panneau |
| `--t-acc` | `var(--acc)` |
| `--t-dim` | l'accent fondu vers le panneau |
| `--t-hl` | l'accent éclairci |
| `--t-bg` | `var(--panel)` |

Le design signale deux points d'usage : le volume des objets matériels reste en teinte
neutre, et sur les trois thèmes clairs le reflet est moins blanc.

## Les tests

`tests/browser/styles.spec.ts` gagne un instantané des teintes calculées sur les trois
thèmes qu'il couvre déjà. `tests/browser/budget.spec.ts` ne change pas : le premier
chargement porte le sprite, et le plafond de 150 Ko le mesure.

## Critère d'acceptation

Les vingt-neuf icônes sont lisibles sur les huit thèmes, clairs compris. Aucune couleur
en dur dans le SVG ni dans les règles qui l'habillent.
